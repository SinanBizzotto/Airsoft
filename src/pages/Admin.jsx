import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminBackground from '../components/AdminBackground'
import Notice from '../components/Notice'
import { formatDateTime } from '../lib/format'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import '../styles/admin.css'

const STATUS_OPTIONS = ['neu', 'gespräch', 'tryout', 'aufgenommen', 'abgelehnt']

const STATUS_CLASS = {
  neu: 'neu',
  gespräch: 'gespraech',
  tryout: 'tryout',
  aufgenommen: 'aufgenommen',
  abgelehnt: 'abgelehnt',
}

const QUICK_ACTIONS = [
  { status: 'neu', label: 'Neu', variant: '' },
  { status: 'gespräch', label: 'Gespräch', variant: '' },
  { status: 'tryout', label: 'Tryout', variant: '' },
  { status: 'aufgenommen', label: 'Angenommen', variant: 'admin-btn-accept' },
  { status: 'abgelehnt', label: 'Abgelehnt', variant: 'admin-btn-reject' },
]

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function Admin() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [sortOrder, setSortOrder] = useState('newest')
  const [showArchived, setShowArchived] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [notice, setNotice] = useState(null)

  const showNotice = useCallback((type, message) => setNotice({ type, message }), [])

  const fetchApplications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setApplications(data || [])
    } catch (error) {
      console.error(error)
      showNotice('error', 'Bewerbungen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [showNotice])

  useEffect(() => {
    const run = async () => {
      await fetchApplications()
    }

    run()
  }, [fetchApplications])

  const reload = () => {
    setLoading(true)
    fetchApplications()
  }

  const updateApplication = async (id, updates) => {
    setSavingId(id)

    const payload = { ...updates, reviewed_at: new Date().toISOString() }

    try {
      const { error } = await supabase.from('applications').update(payload).eq('id', id)

      if (error) throw error

      setApplications((previous) =>
        previous.map((application) =>
          application.id === id ? { ...application, ...payload } : application
        )
      )

      return true
    } catch (error) {
      console.error(error)
      showNotice('error', 'Änderung konnte nicht gespeichert werden.')
      return false
    } finally {
      setSavingId(null)
    }
  }

  const deleteApplication = async (application) => {
    const confirmed = window.confirm(
      `Bewerbung von "${application.callsign || 'unbekannt'}" wirklich endgültig löschen?`
    )

    if (!confirmed) return

    setSavingId(application.id)

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', application.id)

      if (error) throw error

      setApplications((previous) =>
        previous.filter((entry) => entry.id !== application.id)
      )
      showNotice('success', 'Bewerbung gelöscht.')
    } catch (error) {
      console.error(error)
      showNotice('error', 'Bewerbung konnte nicht gelöscht werden.')
    } finally {
      setSavingId(null)
    }
  }

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text || '')
      showNotice('success', `${label} in die Zwischenablage kopiert.`)
    } catch (error) {
      console.error(error)
      showNotice('error', 'Kopieren wurde vom Browser blockiert.')
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error(error)
    }

    navigate('/admin')
  }

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase()

    const filtered = applications.filter((application) => {
      if (!showArchived && application.archived) return false

      const status = application.status || 'neu'
      if (statusFilter !== 'alle' && status !== statusFilter) return false
      if (!term) return true

      return [
        application.callsign,
        application.region,
        application.discord_name,
        application.preferred_role,
        application.camo,
        application.motivation,
        application.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })

    return filtered.sort((a, b) => {
      const first = new Date(a.created_at).getTime() || 0
      const second = new Date(b.created_at).getTime() || 0
      return sortOrder === 'newest' ? second - first : first - second
    })
  }, [applications, search, statusFilter, showArchived, sortOrder])

  const stats = useMemo(() => {
    const active = applications.filter((application) => !application.archived)
    const countBy = (status) =>
      active.filter((application) => (application.status || 'neu') === status).length

    return {
      total: active.length,
      neu: countBy('neu'),
      gespräch: countBy('gespräch'),
      tryout: countBy('tryout'),
      aufgenommen: countBy('aufgenommen'),
      abgelehnt: countBy('abgelehnt'),
      archived: applications.filter((application) => application.archived).length,
    }
  }, [applications])

  const exportCsv = () => {
    if (filteredApplications.length === 0) {
      showNotice('error', 'Im aktuellen Filter gibt es nichts zu exportieren.')
      return
    }

    const header = [
      'Callsign',
      'Alter',
      'Region',
      'Kontakt',
      'Rolle',
      'Gear',
      'Motivation',
      'Status',
      'Bewertung',
      'Notizen',
      'Eingegangen',
    ]

    const rows = filteredApplications.map((application) =>
      [
        application.callsign,
        application.age,
        application.region,
        application.discord_name,
        application.preferred_role,
        application.camo,
        application.motivation,
        application.status || 'neu',
        application.internal_rating ?? '',
        application.notes,
        formatDateTime(application.created_at, ''),
      ]
        .map(csvCell)
        .join(';')
    )

    // BOM voranstellen, damit Excel die Umlaute korrekt liest.
    const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `as-bs-04-bewerbungen-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <AdminBackground withGrid />

      <main className="admin-content">
        <header className="admin-hero">
          <div>
            <p className="admin-eyebrow">AS BS 04 / Recruitment Ops</p>
            <h1 className="admin-title">Recruitment Dashboard</h1>
            <p className="admin-subtitle">
              Vollständige Verwaltung aller Bewerbungen mit Status, Bewertung, Notizen,
              Archiv und Schnellaktionen.
            </p>
          </div>

          <div className="admin-actions">
            <button className="admin-btn" type="button" onClick={reload}>
              Neu laden
            </button>
            <button className="admin-btn" type="button" onClick={exportCsv}>
              CSV Export
            </button>
            <button
              className="admin-btn"
              type="button"
              onClick={() => navigate('/admin/events')}
            >
              Event Verwaltung
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

        <div className="admin-stats">
          <StatCard
            title="Gesamt"
            value={stats.total}
            active={statusFilter === 'alle'}
            onClick={() => setStatusFilter('alle')}
          />
          <StatCard
            title="Neu"
            value={stats.neu}
            active={statusFilter === 'neu'}
            onClick={() => setStatusFilter('neu')}
          />
          <StatCard
            title="Gespräch"
            value={stats.gespräch}
            active={statusFilter === 'gespräch'}
            onClick={() => setStatusFilter('gespräch')}
          />
          <StatCard
            title="Tryout"
            value={stats.tryout}
            active={statusFilter === 'tryout'}
            onClick={() => setStatusFilter('tryout')}
          />
          <StatCard
            title="Aufgenommen"
            value={stats.aufgenommen}
            active={statusFilter === 'aufgenommen'}
            onClick={() => setStatusFilter('aufgenommen')}
          />
          <StatCard
            title="Abgelehnt"
            value={stats.abgelehnt}
            active={statusFilter === 'abgelehnt'}
            onClick={() => setStatusFilter('abgelehnt')}
          />
          <StatCard
            title="Archiv"
            value={stats.archived}
            active={showArchived}
            onClick={() => setShowArchived((previous) => !previous)}
          />
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Suche nach Callsign, Kontakt, Rolle, Region, Notizen…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Bewerbungen durchsuchen"
          />

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Nach Status filtern"
          >
            <option value="alle">Alle Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Sortierung"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Archiv anzeigen
          </label>
        </div>

        {loading ? (
          <div className="admin-empty">Lade Bewerbungen…</div>
        ) : filteredApplications.length === 0 ? (
          <div className="admin-empty">
            Keine Bewerbungen im aktuellen Filter.
            {(search || statusFilter !== 'alle') && (
              <>
                {' '}
                <button
                  type="button"
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('alle')
                  }}
                >
                  Filter zurücksetzen
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="admin-cards">
            {filteredApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                isSaving={savingId === application.id}
                onUpdate={updateApplication}
                onDelete={deleteApplication}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ApplicationCard({ application, isSaving, onUpdate, onDelete, onCopy }) {
  const status = application.status || 'neu'
  const badgeClass = `admin-badge admin-badge-${STATUS_CLASS[status] || 'neu'}`

  return (
    <article className="admin-card">
      <div className="admin-card-line" aria-hidden="true"></div>

      <div className="admin-card-body">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{application.callsign || 'Ohne Namen'}</h2>
            <p className="admin-meta">
              Eingegangen: {formatDateTime(application.created_at)}
            </p>
            {application.reviewed_at && (
              <p className="admin-meta">
                Letzte Änderung: {formatDateTime(application.reviewed_at)}
              </p>
            )}
            {application.archived && (
              <span className="admin-archived-flag">Archiviert</span>
            )}
          </div>

          <span className={badgeClass}>{status}</span>
        </div>

        <div className="admin-info-grid">
          <InfoBox label="Alter" value={application.age} />
          <InfoBox label="Region" value={application.region} />
          <InfoBox label="Kontakt" value={application.discord_name} />
          <InfoBox label="Rolle" value={application.preferred_role} />
        </div>

        <div className="admin-info-grid admin-info-grid-wide">
          <InfoBox label="Gear / Tarnung" value={application.camo} multiline />
          <InfoBox
            label="Erfahrung & Motivation"
            value={application.motivation}
            multiline
          />
        </div>

        <div className="admin-block">
          <span className="admin-label">Schnellstatus</span>
          <div className="admin-quick-row">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.status}
                type="button"
                className={`admin-btn admin-btn-sm ${action.variant} ${
                  status === action.status ? 'is-active' : ''
                }`}
                disabled={isSaving || status === action.status}
                onClick={() => onUpdate(application.id, { status: action.status })}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-block">
          <label className="admin-label" htmlFor={`rating-${application.id}`}>
            Interne Bewertung (1–5)
          </label>
          <select
            id={`rating-${application.id}`}
            className="admin-select"
            value={application.internal_rating ?? ''}
            disabled={isSaving}
            onChange={(event) =>
              onUpdate(application.id, {
                internal_rating: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">keine Bewertung</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-block">
          <label className="admin-label" htmlFor={`notes-${application.id}`}>
            Interne Notizen
          </label>
          <textarea
            id={`notes-${application.id}`}
            className="admin-textarea"
            defaultValue={application.notes || ''}
            placeholder="Tryout-Eindruck, Teamfit, Follow-up, Stärken, Schwächen…"
            rows={5}
            onBlur={(event) => {
              if ((application.notes || '') !== event.target.value) {
                onUpdate(application.id, { notes: event.target.value })
              }
            }}
          />
          <p className="admin-help">Wird gespeichert, sobald du das Feld verlässt.</p>
        </div>

        <div className="admin-card-actions">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onCopy(application.discord_name, 'Kontakt')}
          >
            Kontakt kopieren
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() =>
              onCopy(
                [
                  `Callsign: ${application.callsign || '-'}`,
                  `Alter: ${application.age ?? '-'}`,
                  `Region: ${application.region || '-'}`,
                  `Kontakt: ${application.discord_name || '-'}`,
                  `Rolle: ${application.preferred_role || '-'}`,
                  `Gear: ${application.camo || '-'}`,
                  `Motivation: ${application.motivation || '-'}`,
                ].join('\n'),
                'Bewerbung'
              )
            }
          >
            Bewerbung kopieren
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            disabled={isSaving}
            onClick={() => onUpdate(application.id, { archived: !application.archived })}
          >
            {application.archived ? 'Aus Archiv holen' : 'Archivieren'}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-danger"
            disabled={isSaving}
            onClick={() => onDelete(application)}
          >
            Löschen
          </button>
        </div>

        {isSaving && <p className="admin-saving">Speichert…</p>}
      </div>
    </article>
  )
}

function StatCard({ title, value, onClick, active }) {
  return (
    <button
      type="button"
      className={`stat-card ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <p className="stat-card-label">{title}</p>
      <p className="stat-card-value">{value}</p>
    </button>
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
