import { useState } from 'react'
import teamLogo from '../assets/logo/logo.jpg'
import AdminBackground from '../components/AdminBackground'
import Link from '../components/Link'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import '../styles/admin.css'

const ERROR_MESSAGES = {
  'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
  'Email not confirmed': 'Diese E-Mail-Adresse wurde noch nicht bestätigt.',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!isSupabaseConfigured) {
      setError('Der Login ist nicht konfiguriert. Bitte die Umgebungsvariablen prüfen.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) throw signInError
    } catch (signInError) {
      console.error(signInError)
      setError(
        ERROR_MESSAGES[signInError?.message] ||
          'Anmeldung fehlgeschlagen. Bitte prüfe deine Verbindung und versuche es erneut.'
      )
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <AdminBackground />

      <main className="login-card">
        <div className="login-logo">
          <img src={teamLogo} alt="" aria-hidden="true" />
        </div>

        <p className="admin-eyebrow">AS BS 04 / Admin Access</p>
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Zugriff auf Recruitment und Event Verwaltung.</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">E-Mail</label>
            <input
              id="login-email"
              className="admin-input"
              type="email"
              autoComplete="email"
              placeholder="name@example.ch"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Passwort</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                className="admin-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? 'Verbergen' : 'Zeigen'}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={loading}
          >
            {loading ? 'Anmeldung läuft…' : 'Einloggen'}
          </button>
        </form>

        <Link to="/" className="login-back">
          ← Zurück zur Website
        </Link>
      </main>
    </div>
  )
}
