import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdminBackground from '../components/AdminBackground'
import Notice from '../components/Notice'
import {
  formatDateTime,
  fromDateTimeLocalValue,
  isPast,
  toDateTimeLocalValue,
} from '../lib/format'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import '../styles/admin.css'

const INITIAL_FORM = {
  title: '',
  event_type: 'training',
  event_date: '',
  location: '',
  field_name: '',
  description: '',
  status: 'geplant',
  max_participants: '',
  required_camo: '',
  required_gear: '',
  notes: '',
}

const EVENT_TYPES = ['training', 'tryout', 'event', 'milsim', 'meeting']
const EVENT_STATUSES = ['geplant', 'offen', 'voll', 'abgeschlossen', 'abgesagt']
const REGISTRATION_STATUSES = ['angemeldet', 'bestätigt', 'warteliste', 'abgesagt']

export default function EventsAdmin() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [busyRegistrationId, setBusyRegistrationId] = useState(null)
  const [notice, setNotice] = useState(null)
  const formRef = useRef(null)

  const showNotice = useCallback((type, message) => setNotice({ type, message }), [])

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (error) throw error

      setEvents(data || [])
    } catch (error) {
      console.error(error)
      showNotice('error', 'Events konnten nicht geladen werden.')
    }
  }, [showNotice])

  const fetchRegistrations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRegistrations(data || [])
    } catch (error) {
      console.error(error)
      showNotice('error', 'Anmeldungen konnten nicht geladen werden.')
    }
  }, [showNotice])

  const fetchAll = useCallback(async () => {
    try {
      await Promise.all([fetchEvents(), fetchRegistrations()])
    } finally {
      setLoading(false)
    }
  }, [fetchEvents, fetchRegistrations])

  useEffect(() => {
    const run = async () => {
      await fetchAll()
    }

    run()
  }, [fetchAll])

  const reload = () => {
    setLoading(true)
    fetchAll()
  }

  const groupedRegistrations = useMemo(() => {
    const grouped = {}

    for (const registration of registrations) {
      if (!grouped[registration.event_id]) grouped[registration.event_id] = []
      grouped[registration.event_id].push(registration)
    }

    return grouped
  }, [registrations])

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming = []
    const past = []

    for (const event of events) {
      if (isPast(event.event_date)) past.push(event)
      else upcoming.push(event)
    }

    return { upcomingEvents: upcoming, pastEvents: past.reverse() }
  }, [events])

  const visibleEvents = showPast ? pastEvents : upcomingEvents

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error(error)
    }

    navigate('/admin')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setEditingId(null)
  }

  const handleEdit = (event) => {
    setEditingId(event.id)
    setForm({
      title: event.title || '',
      event_type: event.event_type || 'training',
      event_date: toDateTimeLocalValue(event.event_date),
      location: event.location || '',
      field_name: event.field_name || '',
      description: event.description || '',
      status: event.status || 'geplant',
      max_participants: event.max_participants ?? '',
      required_camo: event.required_camo || '',
      required_gear: event.required_gear || '',
      notes: event.notes || '',
    })

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    setSaving(true)

    const maxParticipants = form.max_participants
      ? Number(form.max_participants)
      : null

    if (maxParticipants !== null && (!Number.isFinite(maxParticipants) || maxParticipants < 1)) {
      showNotice('error', 'Die maximale Teilnehmerzahl muss mindestens 1 sein.')
      setSaving(false)
      return
    }

    const payload = {
      title: form.title.trim(),
      event_type: form.event_type,
      event_date: fromDateTimeLocalValue(form.event_date),
      location: form.location.trim(),
      field_name: form.field_name.trim(),
      description: form.description.trim(),
      status: form.status,
      max_participants: maxParticipants,
      required_camo: form.required_camo.trim(),
      required_gear: form.required_gear.trim(),
      notes: form.notes.trim(),
    }

    try {
      const { error } = editingId
        ? await supabase.from('events').update(payload).eq('id', editingId)
        : await supabase.from('events').insert([payload])

      if (error) throw error

      showNotice('success', editingId ? 'Event aktualisiert.' : 'Event erstellt.')
      resetForm()
      await fetchEvents()
    } catch (error) {
      console.error(error)
      showNotice(
        'error',
        editingId
          ? 'Event konnte nicht aktualisiert werden.'
          : 'Event konnte nicht erstellt werden.'
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (event) => {
    const confirmed = window.confirm(
      `Event "${event.title || 'ohne Titel'}" wirklich löschen? Alle Anmeldungen dazu gehen verloren.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id)

      if (error) throw error

      if (editingId === event.id) resetForm()

      setEvents((previous) => previous.filter((entry) => entry.id !== event.id))
      setRegistrations((previous) =>
        previous.filter((registration) => registration.event_id !== event.id)
      )
      showNotice('success', 'Event gelöscht.')
    } catch (error) {
      console.error(error)
      showNotice('error', 'Event konnte nicht gelöscht werden.')
    }
  }

  const deleteRegistration = async (registration) => {
    const confirmed = window.confirm(
      `Anmeldung von "${registration.name || 'unbekannt'}" wirklich löschen?`
    )

    if (!confirmed) return

    setBusyRegistrationId(registration.id)

    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registration.id)

      if (error) throw error

      await fetchAll()
      showNotice('success', 'Anmeldung entfernt.')
    } catch (error) {
      console.error(error)
      showNotice('error', 'Anmeldung konnte nicht gelöscht werden.')
    } finally {
      setBusyRegistrationId(null)
    }
  }

  const updateRegistrationStatus = async (registration, newStatus) => {
    setBusyRegistrationId(registration.id)

    const now = new Date().toISOString()

    const payload = {
      registration_status: newStatus,
      confirmed_at: newStatus === 'bestätigt' ? now : null,
      cancelled_at: newStatus === 'abgesagt' ? now : null,
      waitlist_position:
        newStatus === 'warteliste' ? registration.waitlist_position || 1 : null,
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .update(payload)
        .eq('id', registration.id)

      if (error) throw error

      await fetchAll()
    } catch (error) {
      console.error(error)
      showNotice('error', 'Status konnte nicht aktualisiert werden.')
    } finally {
      setBusyRegistrationId(null)
    }
  }

  const copyParticipants = async (event, list) => {
    const text = list.length
      ? list
          .map(
            (registration) =>
              `${registration.name} — ${registration.discord_name || '-'} (${
                registration.registration_status || 'angemeldet'
              })`
          )
          .join('\n')
      : 'Keine Anmeldungen.'

    try {
      await navigator.clipboard.writeText(`${event.title}\n\n${text}`)
      showNotice('success', 'Teilnehmerliste kopiert.')
    } catch (error) {
      console.error(error)
      showNotice('error', 'Kopieren wurde vom Browser blockiert.')
    }
  }

  return (
    <div className="admin-page">
      <AdminBackground />

      <main className="admin-content">
        <header className="admin-hero">
          <div>
            <p className="admin-eyebrow">AS BS 04 / Event Ops</p>
            <h1 className="admin-title">Event Verwaltung</h1>
            <p className="admin-subtitle">
              Trainings, Spieltage, Tryouts und interne Termine zentral erstellen,
              bearbeiten und inklusive Anmeldungen, Warteliste und Status verwalten.
            </p>
          </div>

          <div className="admin-actions">
            <button className="admin-btn" type="button" onClick={reload}>
              Neu laden
            </button>
            <button className="admin-btn" type="button" onClick={() => navigate('/admin')}>
              Recruitment
            </button>
            <button className="admin-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
            <button
              className="admin-btn admin-btn-primary"
              type="button"
              onClick={() => navigate('/')}
            >
              Zur Website
            </button>
          </div>
        </header>

        <Notice notice={notice} onDismiss={() => setNotice(null)} />

        <div className="events-layout">
          <section className="events-panel events-panel-form" ref={formRef}>
            <h2 className="events-section-title">
              {editingId ? 'Event bearbeiten' : 'Neues Event'}
            </h2>

            <form onSubmit={handleSubmit} className="events-form">
              <Field label="Titel" htmlFor="event-title">
                <input
                  id="event-title"
                  className="admin-input"
                  name="title"
                  placeholder="z. B. Training Gundeli"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field label="Art" htmlFor="event-type">
                <select
                  id="event-type"
                  className="admin-select"
                  name="event_type"
                  value={form.event_type}
                  onChange={handleChange}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Datum und Uhrzeit" htmlFor="event-date">
                <input
                  id="event-date"
                  className="admin-input"
                  name="event_date"
                  type="datetime-local"
                  value={form.event_date}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field label="Ort" htmlFor="event-location">
                <input
                  id="event-location"
                  className="admin-input"
                  name="location"
                  placeholder="Ort / Gemeinde"
                  value={form.location}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Field / Gelände" htmlFor="event-field">
                <input
                  id="event-field"
                  className="admin-input"
                  name="field_name"
                  placeholder="Name des Geländes"
                  value={form.field_name}
                  onChange={handleChange}
                />
              </Field>

              <Field
                label="Max. Teilnehmer"
                htmlFor="event-max"
                hint="Leer lassen für unbegrenzt."
              >
                <input
                  id="event-max"
                  className="admin-input"
                  name="max_participants"
                  type="number"
                  min="1"
                  placeholder="z. B. 20"
                  value={form.max_participants}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Erforderliche Tarnung" htmlFor="event-camo">
                <input
                  id="event-camo"
                  className="admin-input"
                  name="required_camo"
                  placeholder="z. B. OD / Ranger Green"
                  value={form.required_camo}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Erforderliches Gear" htmlFor="event-gear">
                <input
                  id="event-gear"
                  className="admin-input"
                  name="required_gear"
                  placeholder="z. B. Plate Carrier, Funk"
                  value={form.required_gear}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Status" htmlFor="event-status">
                <select
                  id="event-status"
                  className="admin-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {EVENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Beschreibung"
                htmlFor="event-description"
                hint="Wird öffentlich auf der Website angezeigt."
              >
                <textarea
                  id="event-description"
                  className="admin-textarea"
                  name="description"
                  placeholder="Ablauf, Treffpunkt, Kosten…"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </Field>

              <Field
                label="Interne Notizen"
                htmlFor="event-notes"
                hint="Nur im Dashboard sichtbar."
              >
                <textarea
                  id="event-notes"
                  className="admin-textarea"
                  name="notes"
                  placeholder="Absprachen, Material, offene Punkte…"
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                />
              </Field>

              <div className="events-form-actions">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Speichert…'
                    : editingId
                      ? 'Event aktualisieren'
                      : 'Event erstellen'}
                </button>

                {editingId && (
                  <button type="button" className="admin-btn" onClick={resetForm}>
                    Bearbeitung abbrechen
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="events-panel">
            <div className="event-participants-head">
              <h2 className="events-section-title is-inline">
                {showPast ? 'Vergangene Events' : 'Kommende Events'}
              </h2>

              <div className="event-item-buttons">
                <button
                  type="button"
                  className={`admin-btn admin-btn-sm ${showPast ? '' : 'is-active'}`}
                  onClick={() => setShowPast(false)}
                >
                  Kommend ({upcomingEvents.length})
                </button>
                <button
                  type="button"
                  className={`admin-btn admin-btn-sm ${showPast ? 'is-active' : ''}`}
                  onClick={() => setShowPast(true)}
                >
                  Vergangen ({pastEvents.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-empty">Lade Events…</div>
            ) : visibleEvents.length === 0 ? (
              <div className="admin-empty">
                {showPast
                  ? 'Keine vergangenen Events vorhanden.'
                  : 'Keine kommenden Events vorhanden. Lege links ein neues Event an.'}
              </div>
            ) : (
              <div className="event-list">
                {visibleEvents.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    registrations={groupedRegistrations[event.id] || []}
                    isEditing={editingId === event.id}
                    isPastEvent={showPast}
                    busyRegistrationId={busyRegistrationId}
                    onEdit={handleEdit}
                    onDelete={deleteEvent}
                    onDeleteRegistration={deleteRegistration}
                    onUpdateRegistrationStatus={updateRegistrationStatus}
                    onCopyParticipants={copyParticipants}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function EventItem({
  event,
  registrations,
  isEditing,
  isPastEvent,
  busyRegistrationId,
  onEdit,
  onDelete,
  onDeleteRegistration,
  onUpdateRegistrationStatus,
  onCopyParticipants,
}) {
  const active = registrations.filter(
    (entry) =>
      entry.registration_status !== 'abgesagt' &&
      entry.registration_status !== 'warteliste'
  )

  const waitlist = registrations.filter(
    (entry) => entry.registration_status === 'warteliste'
  )

  return (
    <article
      className={`event-item ${isEditing ? 'is-editing' : ''} ${
        isPastEvent ? 'is-past' : ''
      }`}
    >
      <div className="event-item-head">
        <div>
          <h3 className="event-item-title">{event.title || 'Ohne Titel'}</h3>
          <p className="event-item-meta">
            {event.event_type} · {formatDateTime(event.event_date)}
          </p>
        </div>

        <div className="event-item-buttons">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onEdit(event)}
          >
            {isEditing ? 'Wird bearbeitet' : 'Bearbeiten'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-danger"
            onClick={() => onDelete(event)}
          >
            Löschen
          </button>
        </div>
      </div>

      <div className="admin-info-grid">
        <InfoBox label="Status" value={event.status} />
        <InfoBox label="Ort" value={event.location} />
        <InfoBox label="Field" value={event.field_name} />
        <InfoBox label="Max Teilnehmer" value={event.max_participants} />
      </div>

      <div className="admin-info-grid">
        <InfoBox label="Aktive Teilnehmer" value={active.length} />
        <InfoBox label="Warteliste" value={waitlist.length} />
        <InfoBox label="Tarnung" value={event.required_camo} />
        <InfoBox label="Gear" value={event.required_gear} />
      </div>

      <div className="admin-info-grid admin-info-grid-wide">
        <InfoBox label="Beschreibung" value={event.description} multiline />
        <InfoBox label="Interne Notizen" value={event.notes} multiline />
      </div>

      <div className="event-participants">
        <div className="event-participants-head">
          <div>
            <p className="admin-info-label">Teilnehmerliste</p>
            <h4 className="event-participants-title">
              {active.length} aktiv / {waitlist.length} Warteliste
            </h4>
          </div>

          <div className="event-item-buttons">
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => onCopyParticipants(event, registrations)}
            >
              Liste kopieren
            </button>
            <span className="event-participants-count">
              {active.length}
              {event.max_participants ? ` / ${event.max_participants}` : ''}
            </span>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="admin-empty">Noch keine Anmeldungen.</div>
        ) : (
          <div className="registration-list">
            {registrations.map((registration) => {
              const status = registration.registration_status || 'angemeldet'
              const isBusy = busyRegistrationId === registration.id

              return (
                <div
                  key={registration.id}
                  className={`registration-card ${
                    status === 'warteliste' ? 'is-waitlist' : ''
                  } ${status === 'abgesagt' ? 'is-cancelled' : ''}`}
                >
                  <div className="registration-card-top">
                    <div>
                      <p className="registration-name">
                        {registration.name || 'Ohne Namen'}
                      </p>
                      <p className="registration-sub">
                        Discord: {registration.discord_name || '–'}
                      </p>
                      <p className="registration-sub">
                        Rolle: {registration.role || '–'}
                      </p>
                      {status === 'warteliste' && registration.waitlist_position && (
                        <p className="registration-sub">
                          Wartelistenplatz: {registration.waitlist_position}
                        </p>
                      )}
                      <p className="registration-date">
                        {formatDateTime(registration.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      disabled={isBusy}
                      onClick={() => onDeleteRegistration(registration)}
                    >
                      {isBusy ? 'Lädt…' : 'Entfernen'}
                    </button>
                  </div>

                  <div className="registration-actions">
                    <label
                      className="visually-hidden"
                      htmlFor={`registration-status-${registration.id}`}
                    >
                      Status der Anmeldung
                    </label>
                    <select
                      id={`registration-status-${registration.id}`}
                      className="admin-select"
                      value={status}
                      disabled={isBusy}
                      onChange={(changeEvent) =>
                        onUpdateRegistrationStatus(registration, changeEvent.target.value)
                      }
                    >
                      {REGISTRATION_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}

function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="events-form-field">
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="admin-help">{hint}</p>}
    </div>
  )
}

function InfoBox({ label, value, multiline = false }) {
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className="admin-info-box">
      <p className="admin-info-label">{label}</p>
      <p className={`admin-info-value ${multiline ? 'is-multiline' : ''}`}>
        {hasValue ? value : '–'}
      </p>
    </div>
  )
}
