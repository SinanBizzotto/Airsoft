import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unerwarteter Fehler in der Anwendung:', error, info)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="fatal-error">
        <div className="fatal-error-box">
          <p className="fatal-error-eyebrow">AS BS 04</p>
          <h1>Da ist etwas schiefgelaufen.</h1>
          <p>
            Die Seite konnte nicht korrekt geladen werden. Lade die Seite neu oder
            melde dich bei uns, falls das Problem bestehen bleibt.
          </p>

          <div className="fatal-error-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Seite neu laden
            </button>
            <a className="btn btn-secondary" href="mailto:info@airsoftsquadbasel.ch">
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </div>
    )
  }
}
