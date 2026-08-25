import Footer from '../components/Footer'
import Link from '../components/Link'
import Navbar from '../components/Navbar'
import { contact } from '../data/site'

export default function Legal({ view, session }) {
  const isImpressum = view === 'impressum'

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Direkt zum Inhalt
      </a>

      <Navbar session={session} isHome={false} />

      <main id="main-content" className="section content-page">
        <div className="container">
          <div className="section-heading">
            <p>{isImpressum ? 'Impressum' : 'Datenschutz'}</p>
            <h1>{isImpressum ? 'Impressum' : 'Datenschutzerklärung'}</h1>
          </div>

          <div className="legal-tabs">
            <Link to="/impressum" className={isImpressum ? 'is-active' : undefined}>
              Impressum
            </Link>
            <Link to="/datenschutz" className={!isImpressum ? 'is-active' : undefined}>
              Datenschutz
            </Link>
          </div>

          <div className="legal-body">
            {isImpressum ? <Impressum /> : <Datenschutz />}
          </div>
        </div>
      </main>

      <Footer isHome={false} />
    </div>
  )
}

function Impressum() {
  return (
    <>
      <section className="legal-block">
        <h2>Verantwortlich für den Inhalt</h2>
        <p>
          Airsoft Squad Basel 04 (AS BS 04)
          <br />
          Privates Airsoft-Team ohne Handelsregistereintrag
          <br />
          Region Basel, Schweiz
        </p>
        <p className="legal-todo">
          Hinweis: Für eine rechtlich vollständige Seite müssen hier noch die
          Kontaktadresse (Strasse, PLZ, Ort) und eine verantwortliche Person ergänzt
          werden.
        </p>
      </section>

      <section className="legal-block">
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <br />
          Discord:{' '}
          <a href={contact.discord} target="_blank" rel="noreferrer noopener">
            AS BS 04 Server
          </a>
        </p>
      </section>

      <section className="legal-block">
        <h2>Haftungsausschluss</h2>
        <p>
          Die Inhalte dieser Seite werden mit Sorgfalt erstellt, für Richtigkeit,
          Vollständigkeit und Aktualität wird jedoch keine Gewähr übernommen. Für Inhalte
          verlinkter externer Seiten sind ausschliesslich deren Betreiber verantwortlich.
        </p>
        <p>
          AS BS 04 ist ein privates Airsoft-Team im Sport- und Freizeitbereich. Es besteht
          keine Verbindung zu Behörden, militärischen Einheiten oder offiziellen
          Organisationen.
        </p>
      </section>

      <section className="legal-block">
        <h2>Urheberrecht</h2>
        <p>
          Texte, Bilder, Logo und Patch-Design gehören AS BS 04. Eine Weiterverwendung
          ausserhalb der Seite ist nur mit vorheriger schriftlicher Zustimmung erlaubt.
        </p>
      </section>
    </>
  )
}

function Datenschutz() {
  return (
    <>
      <section className="legal-block">
        <h2>Grundsatz</h2>
        <p>
          Wir verarbeiten personenbezogene Daten nur so weit, wie es für den Betrieb dieser
          Seite und die Bearbeitung von Bewerbungen und Event-Anmeldungen nötig ist. Es
          findet kein Verkauf und keine Weitergabe zu Werbezwecken statt.
        </p>
      </section>

      <section className="legal-block">
        <h2>Welche Daten wir erheben</h2>
        <ul>
          <li>
            <strong>Bewerbungsformular:</strong> Name/Callsign, Alter, Region, Rolle,
            Erfahrung, Gear-Angaben, Kontaktmöglichkeit und deine Nachricht.
          </li>
          <li>
            <strong>Event-Anmeldung:</strong> Name, Discord-Name und optional die
            gewünschte Rolle.
          </li>
          <li>
            <strong>Technisch:</strong> Server- und Zugriffsprotokolle des Hosting-Anbieters
            (u. a. IP-Adresse, Zeitpunkt, aufgerufene Seite).
          </li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>Zweck und Rechtsgrundlage</h2>
        <p>
          Die Angaben aus dem Bewerbungsformular nutzen wir ausschliesslich, um deine
          Bewerbung zu prüfen und mit dir Kontakt aufzunehmen. Event-Anmeldungen nutzen wir
          zur Teilnehmerplanung. Grundlage ist deine Einwilligung, die du jederzeit
          widerrufen kannst.
        </p>
      </section>

      <section className="legal-block">
        <h2>Auftragsverarbeiter</h2>
        <p>
          Für Datenbank und Login setzen wir <strong>Supabase</strong> ein, für das
          Hosting <strong>Vercel</strong>. Beide Anbieter verarbeiten Daten in unserem
          Auftrag. Zusätzlich werden Schriftarten von Google Fonts geladen, wobei deine
          IP-Adresse an Google übertragen wird.
        </p>
      </section>

      <section className="legal-block">
        <h2>Speicherdauer</h2>
        <p>
          Bewerbungen werden bis zum Abschluss des Verfahrens und danach maximal 12 Monate
          aufbewahrt, sofern du nicht früher eine Löschung verlangst. Event-Anmeldungen
          werden nach dem Event gelöscht oder anonymisiert.
        </p>
      </section>

      <section className="legal-block">
        <h2>Deine Rechte</h2>
        <p>
          Du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen sowie deren
          Berichtigung oder Löschung fordern. Eine kurze Nachricht an{' '}
          <a href={`mailto:${contact.email}`}>{contact.email}</a> genügt.
        </p>
      </section>

      <section className="legal-block">
        <h2>Cookies</h2>
        <p>
          Diese Seite setzt keine Tracking- oder Marketing-Cookies. Für den Admin-Bereich
          wird nach dem Login ein technisch notwendiger Speichereintrag im Browser
          verwendet, um die Sitzung aufrechtzuerhalten.
        </p>
      </section>

      <p className="legal-todo">
        Hinweis: Dieser Text ist eine sachliche Grundlage und ersetzt keine Rechtsberatung.
        Vor dem Live-Gang bitte auf die tatsächlichen Gegebenheiten prüfen und die
        Kontaktadresse im <Link to="/impressum">Impressum</Link> ergänzen.
      </p>
    </>
  )
}
