import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import teamLogo from '../assets/logo/AS BS 04.png'

const initialForm = {
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

const registrationStatusOptions = ['angemeldet', 'bestätigt', 'warteliste', 'abgesagt']

export default function EventsAdmin() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingRegistrationId, setDeletingRegistrationId] = useState(null)
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchEvents(), fetchRegistrations()])
    setLoading(false)
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) {
      console.error(error)
      alert('Events konnten nicht geladen werden.')
      return
    }

    setEvents(data || [])
  }

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Anmeldungen konnten nicht geladen werden.')
      return
    }

    setRegistrations(data || [])
  }

  const groupedRegistrations = useMemo(() => {
    const grouped = {}

    for (const registration of registrations) {
      if (!grouped[registration.event_id]) {
        grouped[registration.event_id] = []
      }
      grouped[registration.event_id].push(registration)
    }

    return grouped
  }, [registrations])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleEdit = (event) => {
    setEditingId(event.id)
    setForm({
      title: event.title || '',
      event_type: event.event_type || 'training',
      event_date: event.event_date
        ? new Date(event.event_date).toISOString().slice(0, 16)
        : '',
      location: event.location || '',
      field_name: event.field_name || '',
      description: event.description || '',
      status: event.status || 'geplant',
      max_participants: event.max_participants ?? '',
      required_camo: event.required_camo || '',
      required_gear: event.required_gear || '',
      notes: event.notes || '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      title: form.title,
      event_type: form.event_type,
      event_date: form.event_date || null,
      location: form.location,
      field_name: form.field_name,
      description: form.description,
      status: form.status,
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      required_camo: form.required_camo,
      required_gear: form.required_gear,
      notes: form.notes,
    }

    let error

    if (editingId) {
      const response = await supabase
        .from('events')
        .update(payload)
        .eq('id', editingId)

      error = response.error
    } else {
      const response = await supabase
        .from('events')
        .insert([payload])

      error = response.error
    }

    if (error) {
      console.error(error)
      alert(editingId ? 'Event konnte nicht aktualisiert werden.' : 'Event konnte nicht erstellt werden.')
      setSaving(false)
      return
    }

    resetForm()
    await fetchEvents()
    setSaving(false)
  }

  const deleteEvent = async (id) => {
    const confirmed = window.confirm('Event wirklich löschen?')
    if (!confirmed) return

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Event konnte nicht gelöscht werden.')
      return
    }

    if (editingId === id) {
      resetForm()
    }

    setEvents((prev) => prev.filter((event) => event.id !== id))
    setRegistrations((prev) => prev.filter((registration) => registration.event_id !== id))
  }

  const deleteRegistration = async (registrationId) => {
    const confirmed = window.confirm('Anmeldung wirklich löschen?')
    if (!confirmed) return

    setDeletingRegistrationId(registrationId)

    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('id', registrationId)

    if (error) {
      console.error(error)
      alert('Anmeldung konnte nicht gelöscht werden.')
      setDeletingRegistrationId(null)
      return
    }

    await fetchRegistrations()
    await fetchEvents()
    setDeletingRegistrationId(null)
  }

  const updateRegistrationStatus = async (registration, newStatus) => {
    setUpdatingRegistrationId(registration.id)

    const payload = {
      registration_status: newStatus,
      confirmed_at: newStatus === 'bestätigt' ? new Date().toISOString() : null,
      cancelled_at: newStatus === 'abgesagt' ? new Date().toISOString() : null,
      waitlist_position: newStatus === 'warteliste' ? registration.waitlist_position || 1 : null,
    }

    const { error } = await supabase
      .from('event_registrations')
      .update(payload)
      .eq('id', registration.id)

    if (error) {
      console.error(error)
      alert('Status konnte nicht aktualisiert werden.')
      setUpdatingRegistrationId(null)
      return
    }

    await fetchRegistrations()
    await fetchEvents()
    setUpdatingRegistrationId(null)
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes adminFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -20px, 0) scale(1.03); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes redPulse {
          0% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.08); }
          100% { opacity: 0.35; transform: scale(1); }
        }

        .events-logo-bg {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .events-logo-bg img {
          width: min(55vw, 700px);
          animation: adminFloat 9s ease-in-out infinite;
          filter: drop-shadow(0 0 40px rgba(179,18,23,0.35));
        }

        .events-red-glow-1,
        .events-red-glow-2 {
          position: fixed;
          width: 38vw;
          height: 38vw;
          border-radius: 999px;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
          animation: redPulse 7s ease-in-out infinite;
        }

        .events-red-glow-1 {
          top: -10vw;
          left: -8vw;
          background: rgba(179,18,23,0.28);
        }

        .events-red-glow-2 {
          bottom: -12vw;
          right: -8vw;
          background: rgba(179,18,23,0.18);
          animation-delay: 1.8s;
        }
      `}</style>

      <div className="events-red-glow-1"></div>
      <div className="events-red-glow-2"></div>
      <div className="events-logo-bg">
        <img src={teamLogo} alt="AS BS 04 Background Logo" />
      </div>

      <div style={styles.content}>
        <div style={styles.heroCard}>
          <div>
            <p style={styles.eyebrow}>AS BS 04 / Event Ops</p>
            <h1 style={styles.title}>Event Verwaltung</h1>
            <p style={styles.subtitle}>
              Trainings, Spieltage, Tryouts und interne Termine zentral erstellen,
              bearbeiten und inklusive Anmeldungen, Warteliste und Status verwalten.
            </p>
          </div>

          <div style={styles.topActions}>
            <button style={styles.secondaryBtn} onClick={fetchAll}>
              Neu laden
            </button>
            <button style={styles.secondaryBtn} onClick={handleLogout}>
              Logout
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => (window.location.href = '/admin')}
            >
              Recruitment
            </button>
            <button
              style={styles.primaryBtn}
              onClick={() => (window.location.href = '/')}
            >
              Zur Website
            </button>
          </div>
        </div>

        <div style={styles.layout}>
          <div style={styles.formCard}>
            <h2 style={styles.sectionTitle}>
              {editingId ? 'Event bearbeiten' : 'Neues Event'}
            </h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                name="title"
                placeholder="Titel"
                value={form.title}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <select
                name="event_type"
                value={form.event_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="training">training</option>
                <option value="tryout">tryout</option>
                <option value="event">event</option>
                <option value="milsim">milsim</option>
                <option value="meeting">meeting</option>
              </select>

              <input
                name="event_date"
                type="datetime-local"
                value={form.event_date}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <input
                name="location"
                placeholder="Ort"
                value={form.location}
                onChange={handleChange}
                style={styles.input}
              />

              <input
                name="field_name"
                placeholder="Field / Gelände"
                value={form.field_name}
                onChange={handleChange}
                style={styles.input}
              />

              <input
                name="max_participants"
                type="number"
                placeholder="Max Teilnehmer"
                value={form.max_participants}
                onChange={handleChange}
                style={styles.input}
              />

              <input
                name="required_camo"
                placeholder="Erforderliche Tarnung"
                value={form.required_camo}
                onChange={handleChange}
                style={styles.input}
              />

              <input
                name="required_gear"
                placeholder="Erforderliches Gear"
                value={form.required_gear}
                onChange={handleChange}
                style={styles.input}
              />

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="geplant">geplant</option>
                <option value="offen">offen</option>
                <option value="voll">voll</option>
                <option value="abgeschlossen">abgeschlossen</option>
                <option value="abgesagt">abgesagt</option>
              </select>

              <textarea
                name="description"
                placeholder="Beschreibung"
                value={form.description}
                onChange={handleChange}
                rows={4}
                style={styles.textarea}
              />

              <textarea
                name="notes"
                placeholder="Interne Notizen"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                style={styles.textarea}
              />

              <div style={styles.formActions}>
                <button type="submit" style={styles.primaryBtn} disabled={saving}>
                  {saving
                    ? 'Speichert...'
                    : editingId
                    ? 'Event aktualisieren'
                    : 'Event erstellen'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={resetForm}
                  >
                    Bearbeitung abbrechen
                  </button>
                )}
              </div>
            </form>
          </div>

          <div style={styles.listCard}>
            <h2 style={styles.sectionTitle}>Bestehende Events</h2>

            {loading ? (
              <p>Lade Events...</p>
            ) : events.length === 0 ? (
              <p>Keine Events vorhanden.</p>
            ) : (
              <div style={styles.eventList}>
                {events.map((event) => {
                  const eventRegistrations = groupedRegistrations[event.id] || []

                  const activeParticipants = eventRegistrations.filter(
                    (entry) =>
                      entry.registration_status !== 'abgesagt' &&
                      entry.registration_status !== 'warteliste'
                  )

                  const waitlistParticipants = eventRegistrations.filter(
                    (entry) => entry.registration_status === 'warteliste'
                  )

                  return (
                    <div key={event.id} style={styles.eventItem}>
                      <div style={styles.eventHeader}>
                        <div>
                          <h3 style={styles.eventTitle}>{event.title}</h3>
                          <p style={styles.meta}>
                            {event.event_type} ·{' '}
                            {event.event_date
                              ? new Date(event.event_date).toLocaleString('de-CH')
                              : '-'}
                          </p>
                        </div>

                        <div style={styles.eventButtons}>
                          <button
                            style={styles.secondaryBtn}
                            onClick={() => handleEdit(event)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            style={styles.deleteBtn}
                            onClick={() => deleteEvent(event.id)}
                          >
                            Löschen
                          </button>
                        </div>
                      </div>

                      <div style={styles.infoGrid}>
                        <Info label="Status" value={event.status} />
                        <Info label="Ort" value={event.location || '-'} />
                        <Info label="Field" value={event.field_name || '-'} />
                        <Info label="Max Teilnehmer" value={event.max_participants ?? '-'} />
                      </div>

                      <div style={styles.infoGrid}>
                        <Info label="Aktive Teilnehmer" value={activeParticipants.length} />
                        <Info label="Warteliste" value={waitlistParticipants.length} />
                        <Info label="Tarnung" value={event.required_camo || '-'} />
                        <Info label="Gear" value={event.required_gear || '-'} />
                      </div>

                      <div style={styles.block}>
                        <p style={styles.label}>Beschreibung</p>
                        <p style={styles.value}>{event.description || '-'}</p>
                      </div>

                      <div style={styles.block}>
                        <p style={styles.label}>Interne Notizen</p>
                        <p style={styles.value}>{event.notes || '-'}</p>
                      </div>

                      <div style={styles.participantsSection}>
                        <div style={styles.participantsHeader}>
                          <div>
                            <p style={styles.label}>Teilnehmerliste</p>
                            <h4 style={styles.participantsTitle}>
                              {activeParticipants.length} aktiv / {waitlistParticipants.length} Warteliste
                            </h4>
                          </div>

                          <div style={styles.participantCountBadge}>
                            {activeParticipants.length}
                            {event.max_participants ? ` / ${event.max_participants}` : ''}
                          </div>
                        </div>

                        {eventRegistrations.length === 0 ? (
                          <div style={styles.emptyParticipants}>
                            Noch keine Anmeldungen.
                          </div>
                        ) : (
                          <div style={styles.registrationGrid}>
                            {eventRegistrations.map((registration) => (
                              <div key={registration.id} style={styles.registrationCard}>
                                <div style={styles.registrationCardTop}>
                                  <div>
                                    <p style={styles.registrationName}>
                                      {registration.name}
                                    </p>
                                    <p style={styles.registrationSub}>
                                      Discord: {registration.discord_name || '-'}
                                    </p>
                                    <p style={styles.registrationSub}>
                                      Rolle: {registration.role || '-'}
                                    </p>
                                    <p style={styles.registrationSub}>
                                      Status: {registration.registration_status || 'angemeldet'}
                                    </p>
                                    {registration.waitlist_position && (
                                      <p style={styles.registrationSub}>
                                        Wartelistenplatz: {registration.waitlist_position}
                                      </p>
                                    )}
                                    <p style={styles.registrationDate}>
                                      {registration.created_at
                                        ? new Date(registration.created_at).toLocaleString('de-CH')
                                        : '-'}
                                    </p>
                                  </div>

                                  <button
                                    style={styles.deleteBtnSmall}
                                    disabled={deletingRegistrationId === registration.id}
                                    onClick={() => deleteRegistration(registration.id)}
                                  >
                                    {deletingRegistrationId === registration.id ? 'Löscht...' : 'Entfernen'}
                                  </button>
                                </div>

                                <div style={styles.registrationActions}>
                                  <select
                                    style={styles.statusSelect}
                                    value={registration.registration_status || 'angemeldet'}
                                    disabled={updatingRegistrationId === registration.id}
                                    onChange={(e) =>
                                      updateRegistrationStatus(registration, e.target.value)
                                    }
                                  >
                                    {registrationStatusOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <p style={styles.label}>{label}</p>
      <p style={styles.value}>{value}</p>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, #191b23 0%, #0b0c10 48%, #06070a 100%)',
    color: '#fff',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1500px',
    margin: '0 auto',
    padding: '40px 24px 80px',
  },
  heroCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '26px',
    padding: '28px',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 20px 70px rgba(0,0,0,0.35)',
  },
  eyebrow: {
    margin: '0 0 10px 0',
    color: '#b31217',
    fontSize: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '38px',
    lineHeight: 1.08,
  },
  subtitle: {
    margin: 0,
    color: '#b8bcc7',
    lineHeight: 1.6,
  },
  topActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(179,18,23,0.7)',
    background: 'rgba(179,18,23,0.22)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '420px 1fr',
    gap: '20px',
  },
  formCard: {
    padding: '22px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    alignSelf: 'start',
  },
  listCard: {
    padding: '22px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '18px',
    fontSize: '24px',
  },
  form: {
    display: 'grid',
    gap: '12px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  eventList: {
    display: 'grid',
    gap: '16px',
  },
  eventItem: {
    padding: '18px',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.22)',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '14px',
    alignItems: 'flex-start',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  eventButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  eventTitle: {
    margin: '0 0 6px 0',
    fontSize: '22px',
  },
  meta: {
    margin: 0,
    color: '#b8bcc7',
    fontSize: '14px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '12px',
  },
  infoBox: {
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  block: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  label: {
    margin: '0 0 6px 0',
    color: '#9ea4b3',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  value: {
    margin: 0,
    color: '#fff',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  participantsSection: {
    marginTop: '14px',
    padding: '14px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  participantsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  participantsTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#fff',
  },
  participantCountBadge: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(179,18,23,0.18)',
    border: '1px solid rgba(179,18,23,0.35)',
    color: '#fff',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  emptyParticipants: {
    padding: '14px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    color: '#b8bcc7',
  },
  registrationGrid: {
    display: 'grid',
    gap: '12px',
  },
  registrationCard: {
    padding: '14px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  registrationCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  registrationName: {
    margin: '0 0 6px 0',
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
  },
  registrationSub: {
    margin: '0 0 4px 0',
    color: '#b8bcc7',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  registrationDate: {
    margin: '6px 0 0 0',
    color: '#8f97a7',
    fontSize: '12px',
  },
  registrationActions: {
    marginTop: '12px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  statusSelect: {
    width: '100%',
    maxWidth: '240px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
  },
  deleteBtn: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.16)',
    color: '#fecaca',
    cursor: 'pointer',
    fontWeight: 700,
  },
  deleteBtnSmall: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.16)',
    color: '#fecaca',
    cursor: 'pointer',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
}