import { useEffect, useState } from 'react'
import teamLogo from './assets/logo/AS BS 04.png'
import gallery1 from './assets/gallery/gallery-1.jpg'
import gallery2 from './assets/gallery/gallery-2.jpg'
import gallery3 from './assets/gallery/gallery-3.jpg'
import gallery4 from './assets/gallery/gallery-4.jpg'
import gallery5 from './assets/gallery/gallery-5.jpg'
import gallery6 from './assets/gallery/gallery-6.jpg'
import { supabase } from './lib/supabase'
import Admin from './pages/Admin'
import EventsAdmin from './pages/EventsAdmin'

function App() {
  if (window.location.pathname === '/admin/events') {
    return <EventsAdmin />
  }

  if (window.location.pathname === '/admin') {
    return <Admin />
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [submitState, setSubmitState] = useState('idle')

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    location: '',
    playstyle: '',
    experience: '',
    gear: '',
    contact: '',
    message: '',
  })

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitState('loading')

    try {
      const { error } = await supabase.from('applications').insert([
        {
          callsign: formData.name,
          age: Number(formData.age),
          region: formData.location,
          discord_name: formData.contact,
          preferred_role: formData.playstyle,
          camo: formData.gear,
          motivation: formData.message,
        },
      ])

      if (error) throw error

      setSubmitState('success')
      setFormData({
        name: '',
        age: '',
        location: '',
        playstyle: '',
        experience: '',
        gear: '',
        contact: '',
        message: '',
      })
    } catch (error) {
      console.error(error)
      setSubmitState('error')
    }
  }

  const members = [
    { name: 'Sinan', role: 'Founder / Teamleitung', status: 'Aktiv' },
    { name: 'Can', role: 'Rifleman', status: 'Aktiv' },
    { name: 'Marcus', role: 'Support', status: 'Aktiv' },
    { name: 'Member 4', role: 'Recon / DMR', status: 'Aktiv' },
    { name: 'Luka', role: 'Medic / Utility', status: 'Aktiv' },
  ]

  const values = [
    'Disziplin und respektvoller Umgang',
    'Klare Kommunikation im und ausserhalb des Spiels',
    'Verlässlichkeit bei Trainings, Events und Absprachen',
    'Einheitlicher und gepflegter Teamauftritt',
    'Fokus auf Teamplay statt Ego',
    'Gemeinsame Entwicklung und langfristiger Aufbau',
  ]

  const gear = [
    'Einheitlicher taktischer Auftritt',
    'Sauberes und gepflegtes Equipment',
    'Patch / Teamzugehörigkeit sichtbar integriert',
    'MilSim-orientierter Stil statt random Mischmasch',
    'Unpassende Farbkombinationen und unstimmige Ausrüstung vermeiden',
    'Teamlook geht vor Einzel-Ego',
  ]

  const rules = [
    'Respekt gegenüber Team, Gegnern und Veranstaltern',
    'Pünktlichkeit bei Events, Trainings und Briefings',
    'Keine Alleingänge ohne Absprache',
    'Verlässlichkeit, Disziplin und sauberes Auftreten',
    'Ehrliche und klare Kommunikation',
    'Teaminteressen vor Ego-Aktionen',
  ]

  const events = [
    {
      title: 'Training',
      text: 'Regelmässige gemeinsame Spiel- und Übungstage zur Verbesserung von Teamplay, Kommunikation, Bewegung und Abstimmung.',
    },
    {
      title: 'Events',
      text: 'Teilnahme an Airsoft- und MilSim-Events in der Schweiz und im DACH-Raum mit klarem Teamfokus.',
    },
    {
      title: 'Aufbau',
      text: 'Schrittweiser Ausbau des Teams, der Struktur, des Auftritts und der Online-Präsenz.',
    },
  ]

  const services = [
    {
      title: 'Unit Informationen',
      text: 'Klare Einblicke in Struktur, Werte, Auftritt, Anforderungen und interne Abläufe.',
    },
    {
      title: 'Gear & Einstieg',
      text: 'Orientierung für neue Spieler zu Loadout, Farben, Teamoptik und sinnvollem Startsetup.',
    },
    {
      title: 'Trainings & Spieltage',
      text: 'Infos zu gemeinsamen Aktivitäten, Weiterentwicklung und möglicher Teilnahme.',
    },
    {
      title: 'Kontakt & Austausch',
      text: 'Anlaufstelle für Fragen, Gastspieler, Kontakte, Kooperationen und allgemeines Interesse.',
    },
  ]

  const galleryItems = [
    {
      title: 'Patch / Identity',
      text: 'AS BS 04 Branding, Patch und visueller Teamauftritt.',
      image: gallery1,
    },
    {
      title: 'Team Setup',
      text: 'Einheitlicher Auftritt und strukturierte Präsenz als Unit.',
      image: gallery2,
    },
    {
      title: 'Loadout',
      text: 'Gear, Plate Carrier, Replika und abgestimmte Optik.',
      image: gallery3,
    },
    {
      title: 'Training',
      text: 'Teamplay, Kommunikation und saubere taktische Abläufe.',
      image: gallery4,
    },
    {
      title: 'Field Presence',
      text: 'MilSim-orientierter Auftritt auf dem Spielfeld.',
      image: gallery5,
    },
    {
      title: 'Events',
      text: 'Eindrücke aus Gamedays, Trainings und Community-Aktivitäten.',
      image: gallery6,
    },
  ]

  const faq = [
    {
      question: 'Muss ich direkt beitreten, um Kontakt aufzunehmen?',
      answer:
        'Nein. Du kannst dich auch einfach informieren, Fragen stellen oder erst einmal den Kontakt suchen.',
    },
    {
      question: 'Kann ich mich auch melden, wenn ich noch Anfänger bin?',
      answer:
        'Ja. Nicht jeder startet mit kompletter Erfahrung oder fertigem Loadout. Wichtig ist die richtige Einstellung.',
    },
    {
      question: 'Geht es bei euch nur um Spieltage?',
      answer:
        'Nein. Es geht auch um Struktur, Auftreten, Disziplin, Training, Kommunikation und langfristigen Teamaufbau.',
    },
    {
      question: 'Kann man euch auch wegen Events oder Austausch kontaktieren?',
      answer:
        'Ja. Die Seite soll nicht nur Recruitment abdecken, sondern auch als Kontaktpunkt für Community und Zusammenarbeit dienen.',
    },
  ]

  const socials = [
    { name: 'Instagram', link: 'https://www.instagram.com/as_bs_04/' },
    { name: 'Discord', link: 'https://discord.gg/SccaWd6h' },
    { name: 'TikTok', link: 'https://www.tiktok.com/@airsoft.squad.bs.04?_r=1&_t=ZN-95Q4cYGndJe' },
    { name: 'Kontakt', link: 'mailto:info@airsodftsquadbasel.ch' },
  ]

  return (
    <div className="site-shell">
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="logo-area" onClick={closeMenu}>
            <div className="logo-badge image-badge">
              <img src={teamLogo} alt="AS BS 04 Patch" />
            </div>

            <div className="brand-copy">
              <p className="eyebrow">Tactical Airsoft Team / Basel Region</p>
              <h1>Airsoft Squad Basel 04</h1>
            </div>
          </a>

          <button
            className={`menu-toggle ${menuOpen ? 'active' : ''}`}
            type="button"
            aria-label="Menü öffnen"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
            <a href="#about" onClick={closeMenu}>Über uns</a>
            <a href="#team" onClick={closeMenu}>Team</a>
            <a href="#services" onClick={closeMenu}>Infos</a>
            <a href="#gear" onClick={closeMenu}>Gear</a>
            <a href="#events" onClick={closeMenu}>Events</a>
            <a href="#media" onClick={closeMenu}>Media</a>
            <a href="#faq" onClick={closeMenu}>FAQ</a>
            <a href="#join" className="nav-cta" onClick={closeMenu}>Bewerbung</a>
          </nav>
        </div>
      </header>

      {menuOpen && <div className="nav-backdrop" onClick={closeMenu}></div>}

      <main>
        <section className="hero" id="top">
          <div className="hero-glow hero-glow-left"></div>
          <div className="hero-glow hero-glow-right"></div>
          <div className="hero-grid-overlay"></div>
          <img src={teamLogo} alt="AS BS 04 Watermark" className="hero-watermark" />

          <div className="container hero-grid">
            <div className="hero-text">
              <p className="hero-tag">TACTICAL TEAM / BASEL REGION / MILSIM ORIENTIERT</p>
              <h2>Disziplin. Teamplay. Klare Linie.</h2>
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

              <div className="hero-stats">
                <div className="hero-stat">
                  <span>Bereich</span>
                  <strong>Airsoft / MilSim</strong>
                </div>
                <div className="hero-stat">
                  <span>Region</span>
                  <strong>Schweiz / DACH</strong>
                </div>
                <div className="hero-stat">
                  <span>Status</span>
                  <strong>Recruitment aktiv</strong>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-card-top">
                <span>Status</span>
                <span className="status-live">IM AUFBAU</span>
              </div>

              <div className="stat-grid">
                <div className="stat-box">
                  <p>Fokus</p>
                  <h3>Struktur</h3>
                </div>
                <div className="stat-box">
                  <p>Auftreten</p>
                  <h3>Einheitlich</h3>
                </div>
                <div className="stat-box">
                  <p>Spielstil</p>
                  <h3>Taktisch</h3>
                </div>
                <div className="stat-box">
                  <p>Kontakt</p>
                  <h3>Discord / Mail</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <div className="section-heading">
              <p>ÜBER UNS</p>
              <h2>Kein random Haufen. Ein Team mit Linie.</h2>
            </div>

            <div className="about-box">
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
            <div className="section-heading">
              <p>TEAM</p>
              <h2>Mitglieder & Rollen</h2>
            </div>

            <div className="card-grid">
              {members.map((member, index) => (
                <div className="player-card" key={index}>
                  <div className="player-icon">{member.name.charAt(0)}</div>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                  <span>{member.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="values" className="section">
          <div className="container">
            <div className="section-heading">
              <p>WERTE</p>
              <h2>Wofür das Team steht</h2>
            </div>

            <div className="goal-grid">
              {values.map((value, index) => (
                <div className="goal-card" key={index}>
                  <div className="goal-number">0{index + 1}</div>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="section services-section">
          <div className="container">
            <div className="section-heading">
              <p>MEHR ALS NUR RECRUITMENT</p>
              <h2>Was Besucher hier finden</h2>
            </div>

            <div className="services-grid">
              {services.map((service, index) => (
                <div className="service-card" key={index}>
                  <div className="service-line"></div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="gear" className="section dark-section">
          <div className="container">
            <div className="section-heading">
              <p>GEAR / DRESSCODE</p>
              <h2>Auftreten und Ausrüstung</h2>
            </div>

            <div className="about-box gear-intro">
              <p>
                Unser Ziel ist ein geschlossener und einheitlicher Teamauftritt.
                Kleidung, Gear und Patch sollen optisch zusammenpassen und die
                Teamzugehörigkeit klar zeigen. Individualität ist okay, aber nicht
                auf Kosten des Gesamtbilds.
              </p>
            </div>

            <div className="goal-grid">
              {gear.map((item, index) => (
                <div className="goal-card" key={index}>
                  <div className="goal-number">0{index + 1}</div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="camo" className="section">
          <div className="container">
            <div className="section-heading">
              <p>CAMO / FARBEN</p>
              <h2>Erlaubte Teamoptik</h2>
            </div>

            <div className="camo-grid">
              <div className="camo-box">
                <h3>Erlaubt</h3>
                <ul>
                  <li>OD / Ranger Green</li>
                  <li>Schwarz als Ergänzung</li>
                  <li>Stimmige Tarnmuster nach Teamfreigabe</li>
                </ul>
              </div>

              <div className="camo-box">
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
            <div className="section-heading">
              <p>RECRUITMENT</p>
              <h2>Aufnahmekriterien</h2>
            </div>

            <div className="requirements-intro about-box">
              <p>
                Wer Teil von AS BS 04 werden will, muss mehr mitbringen als nur Gear.
                Entscheidend sind Disziplin, Teamfähigkeit, Verlässlichkeit und die
                Bereitschaft, sich in ein strukturiertes Team einzufügen.
              </p>
            </div>

            <div className="requirements-grid">
              <div className="requirement-box">
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

              <div className="requirement-box">
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
            <div className="section-heading">
              <p>TEAMREGELN</p>
              <h2>Was intern erwartet wird</h2>
            </div>

            <div className="goal-grid">
              {rules.map((rule, index) => (
                <div className="goal-card" key={index}>
                  <div className="goal-number">0{index + 1}</div>
                  <p>{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="events" className="section dark-section">
          <div className="container">
            <div className="section-heading">
              <p>TRAINING & EVENTS</p>
              <h2>Aktivität und Entwicklung</h2>
            </div>

            <div className="card-grid">
              {events.map((event, index) => (
                <div className="player-card event-card" key={index}>
                  <div className="player-icon">{event.title.charAt(0)}</div>
                  <h3>{event.title}</h3>
                  <p>{event.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="media" className="section media-section">
          <div className="container">
            <div className="section-heading">
              <p>MEDIA / EINDRÜCKE</p>
              <h2>Patch, Präsenz und Teamästhetik</h2>
            </div>

            <div className="media-intro about-box">
              <p>
                Nicht nur reden, sondern zeigen. Diese Sektion gibt Besuchern einen
                visuellen Eindruck von Teamidentität, Gear, Auftreten und allgemeiner
                Stimmung rund um AS BS 04.
              </p>
            </div>

            <div className="media-grid">
              {galleryItems.map((item, index) => (
                <article
                  className="media-card"
                  key={index}
                  onClick={() => setSelectedImage(item.image)}
                >
                  <div className="media-image-wrap">
                    <img src={item.image} alt={item.title} className="media-image" />
                    <div className="media-overlay"></div>
                  </div>

                  <div className="media-content">
                    <span className="media-index">0{index + 1}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container">
            <div className="section-heading">
              <p>FAQ</p>
              <h2>Häufige Fragen</h2>
            </div>

            <div className="faq-list">
              {faq.map((item, index) => (
                <details className="faq-item" key={index}>
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
              <div className="section-heading left">
                <p>BEWERBUNG</p>
                <h2>Werde Teil von AS BS 04</h2>
              </div>

              <p className="join-text">
                Wer Teil von AS BS 04 werden will, muss mehr mitbringen als nur Gear.
                Entscheidend sind Disziplin, Teamfähigkeit, Verlässlichkeit und die
                Bereitschaft, sich in ein strukturiertes Team einzufügen.
              </p>

              <div className="join-info-box">
                <p><strong>Mindestalter:</strong> 18 Jahre</p>
                <p><strong>Ablauf:</strong> Erstkontakt → Kennenlernen → gemeinsamer Spieltag → Entscheidung</p>
              </div>

              <div className="join-actions">
                <a
                  href="https://discord.gg/SccaWd6h"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  Über Discord bewerben
                </a>
              </div>
            </div>

            <div className="join-card form-card">
              <h3>Bewerbungsformular</h3>
              <p>
                Trag deine Angaben ein. Die Bewerbung wird direkt in unser Recruitment-System übernommen.
              </p>

              <form className="application-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="age">Alter</label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      min="18"
                      value={formData.age}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Wohnort / Region</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="playstyle">Spielstil / Rolle</label>
                    <input
                      id="playstyle"
                      name="playstyle"
                      type="text"
                      placeholder="z. B. Rifleman, Support, DMR"
                      value={formData.playstyle}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="experience">Erfahrung</label>
                    <textarea
                      id="experience"
                      name="experience"
                      rows="4"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="Wie lange spielst du schon, welche Events, welche Erfahrung?"
                      required
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="gear">Gear / Loadout</label>
                    <textarea
                      id="gear"
                      name="gear"
                      rows="3"
                      value={formData.gear}
                      onChange={handleChange}
                      placeholder="Uniform, Plate Carrier, Replika, Farben, Stil"
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="contact">Discord / Kontaktmöglichkeit</label>
                    <input
                      id="contact"
                      name="contact"
                      type="text"
                      value={formData.contact}
                      onChange={handleChange}
                      placeholder="Discord Name, Mail oder andere Kontaktmöglichkeit"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="message">Zusätzliche Nachricht</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Alles, was du uns noch mitteilen willst"
                    ></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary form-submit"
                  disabled={submitState === 'loading'}
                >
                  {submitState === 'loading' ? 'Wird gesendet...' : 'Bewerbung absenden'}
                </button>

                {submitState === 'success' && (
                  <p className="form-status success">
                    Bewerbung erfolgreich übermittelt.
                  </p>
                )}

                {submitState === 'error' && (
                  <p className="form-status error">
                    Übermittlung fehlgeschlagen. Prüfe Supabase oder die Konfiguration.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>

        <section className="section dark-section">
          <div className="container">
            <div className="section-heading">
              <p>KANÄLE</p>
              <h2>Kontakt & Community</h2>
            </div>

            <div className="social-grid">
              {socials.map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  className="social-card"
                  target={social.link.startsWith('http') ? '_blank' : undefined}
                  rel={social.link.startsWith('http') ? 'noreferrer' : undefined}
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>

            <img
              src={selectedImage}
              alt="AS BS 04 Gallery"
              className="lightbox-image"
            />
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="container footer-inner">
          <p>© 2026 AS BS 04 — Airsoft / MilSim Team</p>
        </div>
      </footer>
    </div>
  )
}

export default App