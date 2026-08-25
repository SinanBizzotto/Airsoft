import teamLogo from '../assets/logo/logo.jpg'
import { contact, navLinks } from '../data/site'
import Link from './Link'

export default function Footer({ isHome = true }) {
  const sectionHref = (hash) => (isHome ? hash : `/${hash}`)
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <div className="logo-badge">
            <img src={teamLogo} alt="" width="58" height="58" aria-hidden="true" />
          </div>
          <div>
            <p className="footer-brand-name">Airsoft Squad Basel 04</p>
            <p className="footer-brand-text">
              Taktisch orientiertes Airsoft- und MilSim-Team aus der Region Basel.
            </p>
          </div>
        </div>

        <nav className="footer-nav" aria-label="Seitenbereiche">
          <p className="footer-heading">Seite</p>
          <ul>
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <a href={sectionHref(href)}>{label}</a>
              </li>
            ))}
            <li>
              <a href={sectionHref('#join')}>Bewerbung</a>
            </li>
          </ul>
        </nav>

        <nav className="footer-nav" aria-label="Kontakt">
          <p className="footer-heading">Kontakt</p>
          <ul>
            <li>
              <a href={contact.discord} target="_blank" rel="noreferrer noopener">
                Discord
              </a>
            </li>
            <li>
              <a href={contact.instagram} target="_blank" rel="noreferrer noopener">
                Instagram
              </a>
            </li>
            <li>
              <a href={contact.tiktok} target="_blank" rel="noreferrer noopener">
                TikTok
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
          </ul>
        </nav>

        <nav className="footer-nav" aria-label="Rechtliches">
          <p className="footer-heading">Rechtliches</p>
          <ul>
            <li>
              <Link to="/impressum">Impressum</Link>
            </li>
            <li>
              <Link to="/datenschutz">Datenschutz</Link>
            </li>
            <li>
              <Link to="/admin">Admin Login</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container footer-bottom">
        <p>© {year} AS BS 04 — Airsoft / MilSim Team</p>
        <p className="footer-note">
          Keine offizielle Verbindung zu Behörden oder militärischen Organisationen.
        </p>
      </div>
    </footer>
  )
}
