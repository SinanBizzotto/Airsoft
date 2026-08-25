import { useCallback, useEffect, useState } from 'react'
import teamLogo from '../assets/logo/logo.jpg'
import Footer from '../components/Footer'
import Lightbox from '../components/Lightbox'
import Link from '../components/Link'
import Navbar from '../components/Navbar'
import { formatDateLong, formatTime } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  contact,
  eventStatusLabels,
  faq,
  galleryItems,
  gearRules,
  members,
  services,
  socials,
  teamRules,
  values,
} from '../data/site'

const EMPTY_FORM = {
  name: '',
  age: '',
  location: '',
  playstyle: '',
  experience: '',
  gear: '',
  contact: '',
  message: '',
  consent: false,
  website: '', // Honeypot gegen Bots
}

const EMPTY_JOIN = { name: '', discord_name: '', role: '' }

const CLOSED_STATUSES = ['abgesagt', 'abgeschlossen']

/**
 * Belegungszahlen kommen aus der View `event_capacity`, die nur Zahlen und keine
 * Teilnehmernamen ausliefert. Existiert die View noch nicht, wird `capacity`
 * null und die Karte zeigt die Belegung als unbekannt an — statt still 0.
 */
const normalizeEvent = (event, capacity) => {
  const capacityKnown = Boolean(capacity)
  const registrationsCount = capacity?.registrations_count ?? 0
  const waitlistCount = capacity?.waitlist_count ?? 0

  const maxParticipants =
    typeof event.max_participants === 'number' && event.max_participants > 0
      ? event.max_participants
      : null

  const freeSlots =
    maxParticipants === null || !capacityKnown
      ? null
      : Math.max(maxParticipants - registrationsCount, 0)

  const isFull =
    capacityKnown && maxParticipants !== null && registrationsCount >= maxParticipants

  const baseStatus = event.status || 'geplant'

  const computedStatus = CLOSED_STATUSES.includes(baseStatus)
    ? baseStatus
    : isFull
      ? 'voll'
      : baseStatus

  const occupancy =
    maxParticipants === null || !capacityKnown
      ? null
      : Math.min(Math.round((registrationsCount / maxParticipants) * 100), 100)

  return {
    ...event,
    capacityKnown,
    registrationsCount,
    waitlistCount,
    maxParticipants,
    freeSlots,
    occupancy,
    computedStatus,
    registrationOpen: !CLOSED_STATUSES.includes(baseStatus),
  }
}

const JOIN_ERROR_STATES = {
  REGISTRATION_CLOSED: 'closed',
  ALREADY_REGISTERED: 'duplicate',
  MISSING_FIELDS: 'validation',
  EVENT_NOT_FOUND: 'closed',
}

const registrationError = (reason) => Object.assign(new Error(reason), { reason })

/**
 * Anmeldung serverseitig durchführen. Die Postgres-Funktion sperrt die
 * Event-Zeile und macht Platzprüfung und Eintrag atomar — siehe
 * supabase/functions.sql. Fehlt sie, wird im Browser geprüft; dann kann bei
 * zwei gleichzeitigen Anmeldungen der letzte Platz doppelt vergeben werden.
 */
const registerForEvent = async ({ eventId, name, discordName, role }) => {
  const { data, error } = await supabase.rpc('register_for_event', {
    p_event_id: eventId,
    p_name: name,
    p_discord_name: discordName,
    p_role: role,
  })

  if (!error) return data?.status || 'angemeldet'

  const known = Object.keys(JOIN_ERROR_STATES).find((reason) =>
    String(error.message).includes(reason)
  )

  if (known) throw registrationError(known)

  // PGRST202 = Funktion existiert nicht. Alles andere ist ein echter Fehler.
  if (error.code !== 'PGRST202') throw error

  console.warn('register_for_event fehlt — es wird im Browser geprüft.')
  return registerForEventInBrowser({ eventId, name, discordName, role })
}

/**
 * Rückfallebene ohne die Postgres-Funktion.
 *
 * Die Datenbank hat bereits einen Trigger, der bei vollem Event `EVENT_FULL`
 * wirft. Darauf verlassen wir uns: erst normal anmelden, und nur wenn der
 * Trigger ablehnt, auf die Warteliste ausweichen. Damit entscheidet die
 * Datenbank über den letzten Platz, nicht der Browser.
 */
const registerForEventInBrowser = async ({ eventId, name, discordName, role }) => {
  const { data: freshEvent, error: eventError } = await supabase
    .from('events')
    .select('id, max_participants, status')
    .eq('id', eventId)
    .single()

  if (eventError) throw eventError
  if (!freshEvent) throw registrationError('EVENT_NOT_FOUND')

  const capacity = await fetchCapacityMap([eventId])
  const current = normalizeEvent(freshEvent, capacity.get(eventId))

  if (!current.registrationOpen) throw registrationError('REGISTRATION_CLOSED')

  const entry = { event_id: eventId, name, discord_name: discordName, role }
  const markEventFull = () =>
    supabase.from('events').update({ status: 'voll' }).eq('id', eventId)

  const { error } = await supabase
    .from('event_registrations')
    .insert([{ ...entry, registration_status: 'angemeldet', waitlist_position: null }])

  if (!error) {
    const nowFull =
      current.capacityKnown &&
      current.maxParticipants !== null &&
      current.registrationsCount + 1 >= current.maxParticipants

    if (nowFull) await markEventFull()

    return 'angemeldet'
  }

  if (!String(error.message).includes('EVENT_FULL')) throw error

  // Event ist voll — als Nächste(r) auf die Warteliste. Ist die Capacity-View
  // nicht da, bleibt die Position leer; der Trigger aus functions.sql trägt
  // sie dann nach.
  const { error: waitlistError } = await supabase.from('event_registrations').insert([
    {
      ...entry,
      registration_status: 'warteliste',
      waitlist_position: current.capacityKnown ? current.waitlistCount + 1 : null,
    },
  ])

  if (waitlistError) throw waitlistError

  await markEventFull()

  return 'warteliste'
}

/** Belegung aller Events auf einmal holen; scheitert das, zählt niemand mit. */
const fetchCapacityMap = async (eventIds) => {
  if (eventIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('event_capacity')
    .select('event_id, registrations_count, waitlist_count')
    .in('event_id', eventIds)

  if (error) {
    // Konfigurationshinweis, kein Laufzeitfehler: ohne die View zeigen die
    // Karten "Freie Plätze auf Anfrage" statt Zahlen.
    console.warn(
      'View "event_capacity" nicht verfügbar — supabase/policies.sql ausführen.',
      error.message
    )
    return new Map()
  }

  return new Map((data || []).map((row) => [row.event_id, row]))
}

export default function Home({ session }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitState, setSubmitState] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [eventJoinData, setEventJoinData] = useState({})
  const [eventJoinState, setEventJoinState] = useState({})
  const [liveEvents, setLiveEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 700)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchLiveEvents = useCallback(async () => {
    setEventsLoading(true)
    setEventsError(false)

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(6)

      if (error) throw error

      const events = data || []
      const capacity = await fetchCapacityMap(events.map((event) => event.id))

      setLiveEvents(events.map((event) => normalizeEvent(event, capacity.get(event.id))))
    } catch (error) {
      console.error(error)
      setLiveEvents([])
      setEventsError(true)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      await fetchLiveEvents()
    }

    run()
  }, [fetchLiveEvents])

  // Sanftes Einblenden beim Scrollen. Die Klasse `reveal-enabled` setzt bereits ein
  // Inline-Skript in index.html, damit die Inhalte nicht kurz aufblitzen.
  useEffect(() => {
    if (!document.documentElement.classList.contains('reveal-enabled')) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    )

    document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((element) => {
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [liveEvents.length, eventsLoading])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitState === 'loading') return

    // Bots füllen versteckte Felder aus — hier einfach so tun als wäre alles gut.
    if (formData.website) {
      setSubmitState('success')
      setSubmitMessage('Bewerbung erfolgreich übermittelt.')
      return
    }

    const age = Number(formData.age)

    if (!Number.isFinite(age) || age < 18) {
      setSubmitState('error')
      setSubmitMessage('Das Mindestalter für eine Bewerbung ist 18 Jahre.')
      return
    }

    setSubmitState('loading')
    setSubmitMessage('')

    const motivation = [
      formData.experience.trim() ? `Erfahrung:\n${formData.experience.trim()}` : '',
      formData.message.trim() ? `Nachricht:\n${formData.message.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const { error } = await supabase.from('applications').insert([
        {
          callsign: formData.name.trim(),
          age,
          region: formData.location.trim(),
          discord_name: formData.contact.trim(),
          preferred_role: formData.playstyle.trim(),
          camo: formData.gear.trim(),
          motivation,
        },
      ])

      if (error) throw error

      setSubmitState('success')
      setSubmitMessage(
        'Bewerbung erfolgreich übermittelt. Wir melden uns über den angegebenen Kontakt.'
      )
      setFormData(EMPTY_FORM)
    } catch (error) {
      console.error(error)
      setSubmitState('error')
      setSubmitMessage(
        'Übermittlung fehlgeschlagen. Versuche es später erneut oder melde dich direkt über Discord.'
      )
    }
  }

  const handleEventJoinChange = (eventId, field, value) => {
    setEventJoinData((previous) => ({
      ...previous,
      [eventId]: { ...EMPTY_JOIN, ...previous[eventId], [field]: value },
    }))

    setEventJoinState((previous) =>
      previous[eventId] === 'validation'
        ? { ...previous, [eventId]: undefined }
        : previous
    )
  }

  const setJoinState = (eventId, state) =>
    setEventJoinState((previous) => ({ ...previous, [eventId]: state }))

  const handleEventJoin = async (event, eventItem) => {
    event.preventDefault()

    const eventId = eventItem.id
    const data = eventJoinData[eventId] || EMPTY_JOIN
    const name = data.name.trim()
    const discordName = data.discord_name.trim()

    if (!name || !discordName) {
      setJoinState(eventId, 'validation')
      return
    }

    setJoinState(eventId, 'loading')

    try {
      const registrationStatus = await registerForEvent({
        eventId,
        name,
        discordName,
        role: data.role.trim(),
      })

      setJoinState(eventId, registrationStatus === 'warteliste' ? 'waitlist' : 'success')
      setEventJoinData((previous) => ({ ...previous, [eventId]: EMPTY_JOIN }))
    } catch (error) {
      console.error(error)
      setJoinState(eventId, JOIN_ERROR_STATES[error?.reason] || 'error')
    }

    await fetchLiveEvents()
  }

  const openLightbox = useCallback((index) => setLightboxIndex(index), [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const showPrevImage = useCallback(() => {
    setLightboxIndex((index) =>
      index === null ? null : (index - 1 + galleryItems.length) % galleryItems.length
    )
  }, [])

  const showNextImage = useCallback(() => {
    setLightboxIndex((index) =>
      index === null ? null : (index + 1) % galleryItems.length
    )
  }, [])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Direkt zum Inhalt
      </a>

      <Navbar session={session} />

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-glow hero-glow-left" aria-hidden="true"></div>
          <div className="hero-glow hero-glow-right" aria-hidden="true"></div>
          <div className="hero-grid-overlay" aria-hidden="true"></div>
          <img
            src={teamLogo}
            alt=""
            className="hero-watermark"
            aria-hidden="true"
            fetchPriority="low"
          />

          <div className="container hero-grid">
            <div className="hero-text">
              <p className="hero-tag">
                Tactical Team / Basel Region / MilSim orientiert
              </p>
              <h1>Disziplin. Teamplay. Klare Linie.</h1>
              <p className="hero-description">
                AS BS 04 ist ein taktisch orientiertes Airsoft-Team aus der Region Basel.
                Der Fokus liegt auf Teamplay, Kommunikation, Verlässlichkeit und einem
                einheitlichen Auftritt.
              </p>

              <div className="hero-buttons">
                <a href="#team" className="btn btn-primary">
                  Zum Team
                </a>
                <a href="#join" className="btn btn-secondary">
                  Aufnahme anfragen
                </a>
              </div>

              <dl className="hero-stats">
                <div className="hero-stat">
                  <dt>Bereich</dt>
                  <dd>Airsoft / MilSim</dd>
                </div>
                <div className="hero-stat">
                  <dt>Region</dt>
                  <dd>Schweiz / DACH</dd>
                </div>
                <div className="hero-stat">
                  <dt>Status</dt>
                  <dd>Recruitment aktiv</dd>
                </div>
              </dl>
            </div>

            <div className="hero-card">
              <div className="hero-card-top">
                <span className="hero-card-label">Status</span>
                <span className="status-live">Im Aufbau</span>
              </div>

              <div className="stat-grid">
                <div className="stat-box">
                  <p>Fokus</p>
                  <strong>Struktur</strong>
                </div>
                <div className="stat-box">
                  <p>Auftreten</p>
                  <strong>Einheitlich</strong>
                </div>
                <div className="stat-box">
                  <p>Spielstil</p>
                  <strong>Taktisch</strong>
                </div>
                <div className="stat-box">
                  <p>Kontakt</p>
                  <strong>Discord / Mail</strong>
                </div>
              </div>

              <a className="hero-card-link" href="#events">
                Nächste Events ansehen
              </a>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <SectionHeading eyebrow="Über uns" title="Kein random Haufen. Ein Team mit Linie." />

            <div className="about-box" data-reveal>
              <p>
                AS BS 04 ist ein Airsoft-Team aus der Region Basel mit Fokus auf Struktur,
                Disziplin und Zusammenhalt. Unser Ziel ist ein starker Teamauftritt mit
                klaren Werten, sauberer Kommunikation und gemeinsamer Entwicklung.
              </p>
            </div>
          </div>
        </section>

        <section id="team" className="section dark-section">
          <div className="container">
            <SectionHeading eyebrow="Team" title="Mitglieder & Rollen" />

            <ul className="card-grid list-reset">
              {members.map((member) => (
                <li
                  className={`player-card ${member.open ? 'player-card-open' : ''}`}
                  key={member.name}
                  data-reveal
                >
                  <span className="player-icon" aria-hidden="true">
                    {member.open ? '+' : member.name.charAt(0)}
                  </span>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                  <span className="player-status">{member.status}</span>

                  {member.open && (
                    <a className="player-card-cta" href="#join">
                      Jetzt bewerben
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="values" className="section">
          <div className="container">
            <SectionHeading eyebrow="Werte" title="Wofür das Team steht" />
            <NumberedGrid items={values} />
          </div>
        </section>

        <section id="services" className="section services-section">
          <div className="container">
            <SectionHeading
              eyebrow="Mehr als nur Recruitment"
              title="Was Besucher hier finden"
            />

            <ul className="services-grid list-reset">
              {services.map((service) => (
                <li className="service-card" key={service.title} data-reveal>
                  <span className="service-line" aria-hidden="true"></span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="gear" className="section dark-section">
          <div className="container">
            <SectionHeading eyebrow="Gear / Dresscode" title="Auftreten und Ausrüstung" />

            <div className="about-box" data-reveal>
              <p>
                Unser Ziel ist ein geschlossener und einheitlicher Teamauftritt. Kleidung,
                Gear und Patch sollen optisch zusammenpassen und die Teamzugehörigkeit klar
                zeigen. Individualität ist okay, aber nicht auf Kosten des Gesamtbilds.
              </p>
            </div>

            <NumberedGrid items={gearRules} />
          </div>
        </section>

        <section id="camo" className="section">
          <div className="container">
            <SectionHeading eyebrow="Camo / Farben" title="Erlaubte Teamoptik" />

            <div className="camo-grid">
              <div className="camo-box camo-box-allowed" data-reveal>
                <h3>Erlaubt</h3>
                <ul>
                  <li>OD / Ranger Green</li>
                  <li>Schwarz als Ergänzung</li>
                  <li>Stimmige Tarnmuster nach Teamfreigabe</li>
                </ul>
              </div>

              <div className="camo-box camo-box-denied" data-reveal>
                <h3>Nicht erwünscht</h3>
                <ul>
                  <li>Bunte Einzelteile</li>
                  <li>Unstimmige Mischkombinationen</li>
                  <li>Ziviler Look ohne Teambezug</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="requirements" className="section dark-section">
          <div className="container">
            <SectionHeading eyebrow="Recruitment" title="Aufnahmekriterien" />

            <div className="about-box" data-reveal>
              <p>
                Wer Teil von AS BS 04 werden will, muss mehr mitbringen als nur Gear.
                Entscheidend sind Disziplin, Teamfähigkeit, Verlässlichkeit und die
                Bereitschaft, sich in ein strukturiertes Team einzufügen.
              </p>
            </div>

            <div className="requirements-grid">
              <div className="requirement-box" data-reveal>
                <h3>Voraussetzungen</h3>
                <ul>
                  <li>Mindestalter 18</li>
                  <li>Teamfähigkeit</li>
                  <li>Zuverlässigkeit</li>
                  <li>Disziplin</li>
                  <li>Sauberes Auftreten</li>
                  <li>Interesse an langfristigem Teamaufbau</li>
                </ul>
              </div>

              <div className="requirement-box" data-reveal>
                <h3>Worauf wir achten</h3>
                <ul>
                  <li>Respektvoller Umgang</li>
                  <li>Klare Kommunikation</li>
                  <li>Pünktlichkeit bei Events und Trainings</li>
                  <li>Kein Ego-Play</li>
                  <li>Bereitschaft, Teamvorgaben umzusetzen</li>
                  <li>Passender Teamfit menschlich und spielerisch</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="rules" className="section">
          <div className="container">
            <SectionHeading eyebrow="Teamregeln" title="Was intern erwartet wird" />
            <NumberedGrid items={teamRules} />
          </div>
        </section>

        <section id="events" className="section dark-section">
          <div className="container">
            <SectionHeading
              eyebrow="Training & Events"
              title="Nächste geplante Events"
              text="Anmeldungen laufen direkt über diese Seite. Ist ein Event ausgebucht, landest du automatisch auf der Warteliste."
            />

            {eventsLoading ? (
              <div className="events-live-grid">
                <div className="event-skeleton" aria-hidden="true"></div>
                <div className="event-skeleton" aria-hidden="true"></div>
                <p className="visually-hidden" role="status">
                  Events werden geladen
                </p>
              </div>
            ) : eventsError ? (
              <div className="about-box">
                <p>
                  Die Events konnten gerade nicht geladen werden.{' '}
                  <button type="button" className="link-button" onClick={fetchLiveEvents}>
                    Erneut versuchen
                  </button>
                </p>
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="about-box">
                <p>
                  Aktuell sind keine kommenden Events eingetragen. Über{' '}
                  <a href={contact.discord} target="_blank" rel="noreferrer noopener">
                    Discord
                  </a>{' '}
                  erfährst du als Erstes, wenn ein neuer Termin steht.
                </p>
              </div>
            ) : (
              <div className="events-live-grid">
                {liveEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    values={eventJoinData[event.id] || EMPTY_JOIN}
                    state={eventJoinState[event.id]}
                    onChange={handleEventJoinChange}
                    onSubmit={handleEventJoin}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="media" className="section media-section">
          <div className="container">
            <SectionHeading
              eyebrow="Media / Eindrücke"
              title="Patch, Präsenz und Teamästhetik"
            />

            <div className="about-box" data-reveal>
              <p>
                Nicht nur reden, sondern zeigen. Diese Sektion gibt Besuchern einen
                visuellen Eindruck von Teamidentität, Gear, Auftreten und allgemeiner
                Stimmung rund um AS BS 04.
              </p>
            </div>

            <ul className="media-grid list-reset">
              {galleryItems.map((item, index) => (
                <li className="media-card" key={item.title} data-reveal>
                  <button
                    type="button"
                    className="media-button"
                    onClick={() => openLightbox(index)}
                    aria-label={`${item.title} vergrössert ansehen`}
                  >
                    <span className="media-image-wrap">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="media-image"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="media-overlay" aria-hidden="true"></span>
                    </span>

                    <span className="media-content">
                      <span className="media-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="media-title">{item.title}</span>
                      <span className="media-text">{item.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container">
            <SectionHeading eyebrow="FAQ" title="Häufige Fragen" />

            <div className="faq-list">
              {faq.map((item) => (
                <details className="faq-item" key={item.question} data-reveal>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="join" className="section join-section">
          <div className="container join-grid">
            <div>
              <SectionHeading eyebrow="Bewerbung" title="Werde Teil von AS BS 04" />

              <p className="join-text">
                Wer Teil von AS BS 04 werden will, muss mehr mitbringen als nur Gear.
                Entscheidend sind Disziplin, Teamfähigkeit, Verlässlichkeit und die
                Bereitschaft, sich in ein strukturiertes Team einzufügen.
              </p>

              <div className="join-info-box">
                <p>
                  <strong>Mindestalter:</strong> 18 Jahre
                </p>
                <p>
                  <strong>Ablauf:</strong> Erstkontakt → Kennenlernen → gemeinsamer
                  Spieltag → Entscheidung
                </p>
                <p>
                  <strong>Antwortzeit:</strong> in der Regel innerhalb weniger Tage
                </p>
              </div>

              <div className="join-actions">
                <a
                  href={contact.discord}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-secondary"
                >
                  Über Discord bewerben
                </a>
                <a href={`mailto:${contact.email}`} className="btn btn-secondary">
                  Per E-Mail melden
                </a>
              </div>
            </div>

            <div className="join-card">
              <h3>Bewerbungsformular</h3>
              <p>
                Trag deine Angaben ein. Die Bewerbung wird direkt in unser
                Recruitment-System übernommen.
              </p>

              <form className="application-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="application-name">Name / Callsign</label>
                    <input
                      id="application-name"
                      name="name"
                      type="text"
                      autoComplete="nickname"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="application-age">Alter</label>
                    <input
                      id="application-age"
                      name="age"
                      type="number"
                      inputMode="numeric"
                      min="18"
                      max="99"
                      value={formData.age}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="application-location">Wohnort / Region</label>
                    <input
                      id="application-location"
                      name="location"
                      type="text"
                      autoComplete="address-level2"
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="application-playstyle">Spielstil / Rolle</label>
                    <input
                      id="application-playstyle"
                      name="playstyle"
                      type="text"
                      placeholder="z. B. Rifleman, Support, DMR"
                      value={formData.playstyle}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="application-experience">Erfahrung</label>
                    <textarea
                      id="application-experience"
                      name="experience"
                      rows="4"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="Wie lange spielst du schon, welche Events, welche Erfahrung?"
                      required
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="application-gear">
                      Gear / Loadout <span className="form-optional">optional</span>
                    </label>
                    <textarea
                      id="application-gear"
                      name="gear"
                      rows="3"
                      value={formData.gear}
                      onChange={handleChange}
                      placeholder="Uniform, Plate Carrier, Replika, Farben, Stil"
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="application-contact">Discord / Kontaktmöglichkeit</label>
                    <input
                      id="application-contact"
                      name="contact"
                      type="text"
                      value={formData.contact}
                      onChange={handleChange}
                      placeholder="Discord Name, Mail oder andere Kontaktmöglichkeit"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="application-message">
                      Zusätzliche Nachricht <span className="form-optional">optional</span>
                    </label>
                    <textarea
                      id="application-message"
                      name="message"
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Alles, was du uns noch mitteilen willst"
                    ></textarea>
                  </div>
                </div>

                <div className="form-honeypot" aria-hidden="true">
                  <label htmlFor="application-website">Bitte leer lassen</label>
                  <input
                    id="application-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-consent">
                  <input
                    id="application-consent"
                    name="consent"
                    type="checkbox"
                    checked={formData.consent}
                    onChange={handleChange}
                    required
                  />
                  <div>
                    <label htmlFor="application-consent">
                      Ich bin einverstanden, dass meine Angaben zur Bearbeitung der
                      Bewerbung gespeichert werden.
                    </label>
                    <p className="form-consent-note">
                      Details dazu in der{' '}
                      <Link to="/datenschutz">Datenschutzerklärung</Link>.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary form-submit"
                  disabled={submitState === 'loading'}
                >
                  {submitState === 'loading' ? 'Wird gesendet…' : 'Bewerbung absenden'}
                </button>

                <p className="form-hint">
                  Wir melden uns über die angegebene Kontaktmöglichkeit zurück.
                </p>

                {submitMessage && (
                  <p
                    className={`form-status ${submitState === 'success' ? 'success' : 'error'}`}
                    role="status"
                    aria-live="polite"
                  >
                    {submitMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>

        <section id="contact" className="section dark-section">
          <div className="container">
            <SectionHeading eyebrow="Kanäle" title="Kontakt & Community" />

            <ul className="social-grid list-reset">
              {socials.map((social) => {
                const external = social.link.startsWith('http')

                return (
                  <li key={social.name} data-reveal>
                    <a
                      href={social.link}
                      className="social-card"
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer noopener' : undefined}
                    >
                      <span className="social-name">{social.name}</span>
                      <span className="social-handle">{social.handle}</span>
                      <span className="social-text">{social.text}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          item={galleryItems[lightboxIndex]}
          position={`${lightboxIndex + 1} / ${galleryItems.length}`}
          onClose={closeLightbox}
          onPrev={showPrevImage}
          onNext={showNextImage}
        />
      )}

      <nav aria-label="Seitenanfang">
        <a
          className={`back-to-top ${showBackToTop ? 'is-visible' : ''}`}
          href="#top"
          aria-label="Zurück nach oben"
          tabIndex={showBackToTop ? undefined : -1}
        >
          <span aria-hidden="true">↑</span>
        </a>
      </nav>

      <Footer />
    </div>
  )
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="section-heading" data-reveal>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="section-heading-text">{text}</p>}
    </div>
  )
}

function NumberedGrid({ items }) {
  return (
    <ul className="goal-grid list-reset">
      {items.map((item, index) => (
        <li className="goal-card" key={item} data-reveal>
          <span className="goal-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <p>{item}</p>
        </li>
      ))}
    </ul>
  )
}

function EventCard({ event, values: joinValues, state, onChange, onSubmit }) {
  const statusLabel = eventStatusLabels[event.computedStatus] || event.computedStatus
  // Auch ohne Belegungszahlen ist "voll" aus dem Event-Status bekannt.
  const isFull = event.freeSlots === 0 || event.computedStatus === 'voll'
  const isLoading = state === 'loading'

  return (
    <article className="event-live-card" data-reveal>
      <span className="event-live-topline" aria-hidden="true"></span>

      <div className="event-live-head">
        <span className="event-live-icon" aria-hidden="true">
          {(event.title || 'E').charAt(0).toUpperCase()}
        </span>

        <div className="event-live-title-wrap">
          <span className="event-live-type">{event.event_type || 'Event'}</span>
          <h3>{event.title || 'Unbenanntes Event'}</h3>
        </div>

        <span
          className={`event-live-status event-status-${event.computedStatus || 'geplant'}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="event-live-meta-grid">
        <div className="event-live-meta">
          <span>Datum</span>
          <strong>{formatDateLong(event.event_date)}</strong>
        </div>

        <div className="event-live-meta">
          <span>Uhrzeit</span>
          <strong>{formatTime(event.event_date)} Uhr</strong>
        </div>

        <div className="event-live-meta">
          <span>Ort</span>
          <strong>{event.location || '–'}</strong>
        </div>

        <div className="event-live-meta">
          <span>Field</span>
          <strong>{event.field_name || '–'}</strong>
        </div>
      </div>

      <div className="event-capacity">
        <div className="event-capacity-head">
          <span>Belegung</span>
          <strong>
            {event.capacityKnown ? (
              <>
                {event.registrationsCount}
                {event.maxParticipants !== null ? ` / ${event.maxParticipants}` : ''}
                {event.waitlistCount > 0 ? ` · ${event.waitlistCount} Warteliste` : ''}
              </>
            ) : event.maxParticipants !== null ? (
              `max. ${event.maxParticipants} Plätze`
            ) : (
              '–'
            )}
          </strong>
        </div>

        {event.occupancy !== null && (
          <div
            className="event-capacity-bar"
            role="progressbar"
            aria-valuenow={event.occupancy}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Belegte Plätze"
          >
            <span style={{ width: `${event.occupancy}%` }}></span>
          </div>
        )}

        <p className="event-capacity-note">
          {!event.capacityKnown
            ? isFull
              ? 'Ausgebucht — Anmeldung geht auf die Warteliste'
              : 'Freie Plätze auf Anfrage'
            : event.maxParticipants === null
              ? 'Teilnehmerzahl unbegrenzt'
              : isFull
                ? 'Ausgebucht — Anmeldung geht auf die Warteliste'
                : `${event.freeSlots} freie Plätze`}
        </p>
      </div>

      {(event.required_camo || event.required_gear) && (
        <div className="event-live-tags">
          {event.required_camo && (
            <span className="event-live-tag">Tarnung: {event.required_camo}</span>
          )}
          {event.required_gear && (
            <span className="event-live-tag">Gear: {event.required_gear}</span>
          )}
        </div>
      )}

      {event.description && (
        <p className="event-live-description">{event.description}</p>
      )}

      {event.registrationOpen ? (
        <form
          className="event-registration-box"
          onSubmit={(submitEvent) => onSubmit(submitEvent, event)}
        >
          <div className="event-registration-fields">
            <label className="visually-hidden" htmlFor={`event-name-${event.id}`}>
              Name
            </label>
            <input
              id={`event-name-${event.id}`}
              type="text"
              placeholder="Name"
              value={joinValues.name}
              onChange={(inputEvent) =>
                onChange(event.id, 'name', inputEvent.target.value)
              }
              required
            />

            <label className="visually-hidden" htmlFor={`event-discord-${event.id}`}>
              Discord
            </label>
            <input
              id={`event-discord-${event.id}`}
              type="text"
              placeholder="Discord"
              value={joinValues.discord_name}
              onChange={(inputEvent) =>
                onChange(event.id, 'discord_name', inputEvent.target.value)
              }
              required
            />

            <label className="visually-hidden" htmlFor={`event-role-${event.id}`}>
              Rolle (optional)
            </label>
            <input
              id={`event-role-${event.id}`}
              type="text"
              placeholder="Rolle (optional)"
              value={joinValues.role}
              onChange={(inputEvent) =>
                onChange(event.id, 'role', inputEvent.target.value)
              }
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading
              ? 'Wird gespeichert…'
              : isFull
                ? 'Auf die Warteliste'
                : 'Für Event anmelden'}
          </button>

          <p className="event-join-message" role="status" aria-live="polite">
            {state === 'success' && (
              <span className="event-join-success">
                Erfolgreich angemeldet. Wir melden uns über Discord.
              </span>
            )}
            {state === 'waitlist' && (
              <span className="event-join-success">
                Event ist voll — du stehst jetzt auf der Warteliste.
              </span>
            )}
            {state === 'validation' && (
              <span className="event-join-error">
                Bitte Name und Discord ausfüllen.
              </span>
            )}
            {state === 'duplicate' && (
              <span className="event-join-error">
                Mit diesem Discord-Namen bist du für dieses Event bereits angemeldet.
              </span>
            )}
            {state === 'closed' && (
              <span className="event-join-error">
                Die Anmeldung für dieses Event ist inzwischen geschlossen.
              </span>
            )}
            {state === 'error' && (
              <span className="event-join-error">
                Anmeldung fehlgeschlagen. Versuche es erneut oder melde dich über Discord.
              </span>
            )}
          </p>
        </form>
      ) : (
        <p className="event-closed-note">
          {event.computedStatus === 'abgesagt'
            ? 'Dieses Event wurde abgesagt.'
            : 'Dieses Event ist abgeschlossen.'}
        </p>
      )}
    </article>
  )
}
