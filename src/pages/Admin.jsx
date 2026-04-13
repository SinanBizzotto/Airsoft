import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import teamLogo from '../assets/logo/AS BS 04.png'

const statusOptions = ['neu', 'gespräch', 'tryout', 'aufgenommen', 'abgelehnt']

const statusColors = {
  neu: {
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.14)',
    text: '#f3f4f6',
  },
  gespräch: {
    bg: 'rgba(255, 140, 0, 0.16)',
    border: 'rgba(255, 140, 0, 0.35)',
    text: '#ffcf85',
  },
  tryout: {
    bg: 'rgba(0, 153, 255, 0.16)',
    border: 'rgba(0, 153, 255, 0.35)',
    text: '#79c7ff',
  },
  aufgenommen: {
    bg: 'rgba(34, 197, 94, 0.16)',
    border: 'rgba(34, 197, 94, 0.35)',
    text: '#86efac',
  },
  abgelehnt: {
    bg: 'rgba(239, 68, 68, 0.16)',
    border: 'rgba(239, 68, 68, 0.35)',
    text: '#fca5a5',
  },
}

export default function Admin() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [showArchived, setShowArchived] = useState(false)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Bewerbungen konnten nicht geladen werden.')
    } else {
      setApplications(data || [])
    }

    setLoading(false)
  }

  const updateApplication = async (id, updates) => {
    setSavingId(id)

    const payload = {
      ...updates,
      reviewed_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('applications')
      .update(payload)
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Änderung konnte nicht gespeichert werden.')
      setSavingId(null)
      return false
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, ...payload }
          : app
      )
    )

    setSavingId(null)
    return true
  }

  const archiveApplication = async (id, archivedValue) => {
    await updateApplication(id, { archived: archivedValue })
  }

  const deleteApplication = async (id) => {
    const confirmed = window.confirm('Bewerbung wirklich löschen?')
    if (!confirmed) return

    setSavingId(id)

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Bewerbung konnte nicht gelöscht werden.')
      setSavingId(null)
      return
    }

    setApplications((prev) => prev.filter((app) => app.id !== id))
    setSavingId(null)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '')
      alert('Kopiert.')
    } catch (error) {
      console.error(error)
      alert('Kopieren fehlgeschlagen.')
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const archived = !!app.archived
      if (!showArchived && archived) return false

      const currentStatus = app.status || 'neu'
      if (statusFilter !== 'alle' && currentStatus !== statusFilter) return false

      const haystack = [
        app.callsign,
        app.region,
        app.discord_name,
        app.preferred_role,
        app.camo,
        app.motivation,
        app.notes,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(search.toLowerCase())
    })
  }, [applications, search, statusFilter, showArchived])

  const stats = useMemo(() => {
    const activeApps = applications.filter((app) => !app.archived)
    return {
      total: activeApps.length,
      neu: activeApps.filter((app) => (app.status || 'neu') === 'neu').length,
      gespräch: activeApps.filter((app) => app.status === 'gespräch').length,
      tryout: activeApps.filter((app) => app.status === 'tryout').length,
      aufgenommen: activeApps.filter((app) => app.status === 'aufgenommen').length,
      abgelehnt: activeApps.filter((app) => app.status === 'abgelehnt').length,
      archived: applications.filter((app) => app.archived).length,
    }
  }, [applications])

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

        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }

        .admin-logo-bg {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .admin-logo-bg img {
          width: min(55vw, 700px);
          animation: adminFloat 9s ease-in-out infinite;
          filter: drop-shadow(0 0 40px rgba(179,18,23,0.35));
        }

        .admin-red-glow-1,
        .admin-red-glow-2 {
          position: fixed;
          width: 38vw;
          height: 38vw;
          border-radius: 999px;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
          animation: redPulse 7s ease-in-out infinite;
        }

        .admin-red-glow-1 {
          top: -10vw;
          left: -8vw;
          background: rgba(179,18,23,0.28);
        }

        .admin-red-glow-2 {
          bottom: -12vw;
          right: -8vw;
          background: rgba(179,18,23,0.18);
          animation-delay: 1.8s;
        }

        .admin-grid-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
          background-image:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite alternate;
        }
      `}</style>

      <div className="admin-red-glow-1"></div>
      <div className="admin-red-glow-2"></div>
      <div className="admin-grid-overlay"></div>
      <div className="admin-logo-bg">
        <img src={teamLogo} alt="AS BS 04 Background Logo" />
      </div>

      <div style={styles.content}>
        <div style={styles.heroCard}>
          <div>
            <p style={styles.eyebrow}>AS BS 04 / Recruitment Ops</p>
            <h1 style={styles.title}>Recruitment Dashboard</h1>
            <p style={styles.subtitle}>
              Vollständige Verwaltung aller Bewerbungen mit Status, Bewertung, Notizen,
              Archiv und Schnellaktionen.
            </p>
          </div>

          <div style={styles.topActions}>
            <button style={styles.secondaryBtn} onClick={fetchApplications}>
              Neu laden
            </button>

            <button
              style={styles.secondaryBtn}
              onClick={() => (window.location.href = '/admin/events')}
            >
              Event Verwaltung
            </button>

            <button
              style={styles.primaryBtn}
              onClick={() => (window.location.href = '/')}
            >
              Zur Website
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard title="Gesamt" value={stats.total} />
          <StatCard title="Neu" value={stats.neu} />
          <StatCard title="Gespräch" value={stats.gespräch} />
          <StatCard title="Tryout" value={stats.tryout} />
          <StatCard title="Aufgenommen" value={stats.aufgenommen} />
          <StatCard title="Abgelehnt" value={stats.abgelehnt} />
          <StatCard title="Archiv" value={stats.archived} />
        </div>

        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Suche nach Callsign, Kontakt, Rolle, Region, Notizen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="alle">alle Status</option>
            <option value="neu">neu</option>
            <option value="gespräch">gespräch</option>
            <option value="tryout">tryout</option>
            <option value="aufgenommen">aufgenommen</option>
            <option value="abgelehnt">abgelehnt</option>
          </select>

          <label style={styles.checkboxWrap}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Archiv anzeigen
          </label>
        </div>

        {loading ? (
          <div style={styles.emptyBox}>Lade Bewerbungen...</div>
        ) : filteredApplications.length === 0 ? (
          <div style={styles.emptyBox}>Keine Bewerbungen im aktuellen Filter.</div>
        ) : (
          <div style={styles.cardsGrid}>
            {filteredApplications.map((app) => {
              const status = app.status || 'neu'
              const statusStyle = statusColors[status] || statusColors.neu
              const isSaving = savingId === app.id

              return (
                <div key={app.id} style={styles.card}>
                  <div style={styles.cardTopLine}></div>

                  <div style={styles.cardInner}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h2 style={styles.cardTitle}>{app.callsign || '-'}</h2>
                        <p style={styles.metaText}>
                          Eingegangen: {new Date(app.created_at).toLocaleString('de-CH')}
                        </p>
                        {app.reviewed_at && (
                          <p style={styles.metaText}>
                            Letzte Änderung: {new Date(app.reviewed_at).toLocaleString('de-CH')}
                          </p>
                        )}
                      </div>

                      <span
                        style={{
                          ...styles.statusBadge,
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          color: statusStyle.text,
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    <div style={styles.infoGrid}>
                      <InfoBox label="Alter" value={app.age} />
                      <InfoBox label="Region" value={app.region} />
                      <InfoBox label="Kontakt" value={app.discord_name} />
                      <InfoBox label="Rolle" value={app.preferred_role || '-'} />
                    </div>

                    <div style={styles.wideGrid}>
                      <WideInfoBox label="Gear / Tarnung" value={app.camo || '-'} />
                      <WideInfoBox label="Motivation" value={app.motivation || '-'} />
                    </div>

                    <div style={styles.sectionBlock}>
                      <label style={styles.label}>Status</label>
                      <select
                        value={status}
                        onChange={(e) => updateApplication(app.id, { status: e.target.value })}
                        style={styles.select}
                        disabled={isSaving}
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.sectionBlock}>
                      <label style={styles.label}>Interne Bewertung (1–5)</label>
                      <select
                        value={app.internal_rating ?? ''}
                        onChange={(e) =>
                          updateApplication(app.id, {
                            internal_rating: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        style={styles.select}
                        disabled={isSaving}
                      >
                        <option value="">keine</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </div>

                    <div style={styles.sectionBlock}>
                      <label style={styles.label}>Interne Notizen</label>
                      <textarea
                        defaultValue={app.notes || ''}
                        placeholder="Tryout-Eindruck, Teamfit, Follow-up, Stärken, Schwächen..."
                        rows={5}
                        style={styles.textarea}
                        onBlur={(e) => {
                          if ((app.notes || '') !== e.target.value) {
                            updateApplication(app.id, { notes: e.target.value })
                          }
                        }}
                      />
                      <p style={styles.helpText}>
                        Speicherung beim Verlassen des Feldes.
                      </p>
                    </div>

                    <div style={styles.actionsRow}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => copyToClipboard(app.discord_name)}
                      >
                        Kontakt kopieren
                      </button>

                      <button
                        style={styles.actionBtn}
                        onClick={() =>
                          copyToClipboard(
                            `Callsign: ${app.callsign}\nAlter: ${app.age}\nRegion: ${app.region}\nKontakt: ${app.discord_name}\nRolle: ${app.preferred_role || '-'}\nGear: ${app.camo || '-'}\nMotivation: ${app.motivation || '-'}`
                          )
                        }
                      >
                        Bewerbung kopieren
                      </button>

                      <button
                        style={styles.actionBtn}
                        onClick={() => archiveApplication(app.id, !app.archived)}
                      >
                        {app.archived ? 'Aus Archiv holen' : 'Archivieren'}
                      </button>

                      <button
                        style={styles.deleteBtn}
                        onClick={() => deleteApplication(app.id)}
                      >
                        Löschen
                      </button>
                    </div>

                    {isSaving && <p style={styles.savingText}>Speichert...</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{title}</p>
      <h3 style={styles.statValue}>{value}</h3>
    </div>
  )
}

function InfoBox({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <p style={styles.infoLabel}>{label}</p>
      <p style={styles.infoValue}>{value ?? '-'}</p>
    </div>
  )
}

function WideInfoBox({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <p style={styles.infoLabel}>{label}</p>
      <p style={{ ...styles.infoValue, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {value ?? '-'}
      </p>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, #191b23 0%, #0b0c10 48%, #06070a 100%)',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
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
    backdropFilter: 'blur(10px)',
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
    maxWidth: '760px',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  statCard: {
    padding: '18px',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(8px)',
  },
  statLabel: {
    margin: '0 0 8px 0',
    color: '#9aa2b1',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    margin: 0,
    fontSize: '30px',
    lineHeight: 1,
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 220px 180px',
    gap: '12px',
    marginBottom: '22px',
  },
  searchInput: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
  },
  checkboxWrap: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    padding: '0 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
  },
  emptyBox: {
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
  card: {
    borderRadius: '22px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(19,20,27,0.96) 0%, rgba(10,11,15,0.98) 100%)',
    boxShadow: '0 16px 50px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(8px)',
  },
  cardTopLine: {
    height: '4px',
    background: 'linear-gradient(90deg, #b31217 0%, #ff4b4b 100%)',
  },
  cardInner: {
    padding: '22px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '18px',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '25px',
    lineHeight: 1.1,
  },
  metaText: {
    margin: '0 0 4px 0',
    color: '#949baa',
    fontSize: '13px',
  },
  statusBadge: {
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  wideGrid: {
    display: 'grid',
    gap: '12px',
    marginBottom: '14px',
  },
  infoBox: {
    padding: '14px',
    borderRadius: '15px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
  },
  infoLabel: {
    margin: '0 0 7px 0',
    color: '#8f97a7',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  infoValue: {
    margin: 0,
    color: '#fff',
    wordBreak: 'break-word',
  },
  sectionBlock: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#b7bfcd',
    fontSize: '14px',
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
  helpText: {
    margin: '6px 0 0 0',
    fontSize: '12px',
    color: '#8f97a7',
  },
  actionsRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '10px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  actionBtn: {
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  deleteBtn: {
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.16)',
    color: '#fecaca',
    cursor: 'pointer',
    fontWeight: 700,
  },
  savingText: {
    margin: '12px 0 0 0',
    color: '#ff9e9e',
    fontSize: '13px',
  },
}