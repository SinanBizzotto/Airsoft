import Footer from '../components/Footer'
import Link from '../components/Link'
import Navbar from '../components/Navbar'
import { contact } from '../data/site'

export default function NotFound({ session }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Direkt zum Inhalt
      </a>

      <Navbar session={session} isHome={false} />

      <main id="main-content" className="section content-page">
        <div className="container">
          <div className="section-heading">
            <p>Fehler 404</p>
            <h1>Diese Seite gibt es nicht.</h1>
          </div>

          <div className="about-box">
            <p>
              Der aufgerufene Link existiert nicht oder wurde verschoben. Über die
              Startseite findest du Team, Gear, Events und die Bewerbung.
            </p>
          </div>

          <div className="join-actions">
            <Link to="/" className="btn btn-primary">
              Zur Startseite
            </Link>
            <a
              href={contact.discord}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-secondary"
            >
              Discord
            </a>
          </div>
        </div>
      </main>

      <Footer isHome={false} />
    </div>
  )
}
