import { useEffect, useRef, useState } from 'react'
import teamLogo from '../assets/logo/logo.jpg'
import { navLinks } from '../data/site'
import Link from './Link'

export default function Navbar({ session, isHome = true }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const toggleRef = useRef(null)

  const closeMenu = () => setMenuOpen(false)
  const sectionHref = (hash) => (isHome ? hash : `/${hash}`)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Menü schliesst sich, sobald wieder genug Platz für die Desktop-Navigation da ist.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1101px)')
    const handleChange = (event) => {
      if (event.matches) setMenuOpen(false)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === 'undefined') return undefined

    const sections = navLinks
      .map(({ href }) => document.getElementById(href.slice(1)))
      .filter(Boolean)

    if (sections.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isHome])

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container nav-inner">
          {isHome ? (
            <a href="#top" className="logo-area" onClick={closeMenu}>
              <BrandContent />
            </a>
          ) : (
            <Link to="/" className="logo-area" onClick={closeMenu}>
              <BrandContent />
            </Link>
          )}

          <button
            ref={toggleRef}
            className={`menu-toggle ${menuOpen ? 'active' : ''}`}
            type="button"
            aria-label={menuOpen ? 'Menü schliessen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>

          <nav
            id="primary-navigation"
            aria-label="Hauptnavigation"
            className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}
          >
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={sectionHref(href)}
                onClick={closeMenu}
                className={activeSection === href.slice(1) ? 'is-active' : undefined}
                aria-current={activeSection === href.slice(1) ? 'true' : undefined}
              >
                {label}
              </a>
            ))}

            <a href={sectionHref('#join')} className="nav-cta" onClick={closeMenu}>
              Bewerbung
            </a>

            <Link to="/admin" className="nav-login" onClick={closeMenu}>
              <span>{session ? 'Dashboard' : 'Admin Login'}</span>
            </Link>
          </nav>
        </div>
      </header>

      {menuOpen && (
        <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true"></div>
      )}
    </>
  )
}

function BrandContent() {
  return (
    <>
      <div className="logo-badge">
        <img
          src={teamLogo}
          alt=""
          width="58"
          height="58"
          aria-hidden="true"
        />
      </div>

      <div className="brand-copy">
        <p className="eyebrow">Tactical Airsoft Team / Basel Region</p>
        <span className="brand-name">Airsoft Squad Basel 04</span>
      </div>
    </>
  )
}
