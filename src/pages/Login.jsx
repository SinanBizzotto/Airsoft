import { useState } from 'react'
import { supabase } from '../lib/supabase'
import teamLogo from '../assets/logo/AS BS 04.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes loginFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -18px, 0) scale(1.03); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes loginPulse {
          0% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
          100% { opacity: 0.25; transform: scale(1); }
        }

        .login-logo-bg {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .login-logo-bg img {
          width: min(50vw, 620px);
          animation: loginFloat 9s ease-in-out infinite;
          filter: drop-shadow(0 0 40px rgba(179,18,23,0.35));
        }

        .login-red-glow-1,
        .login-red-glow-2 {
          position: fixed;
          width: 36vw;
          height: 36vw;
          border-radius: 999px;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
          animation: loginPulse 7s ease-in-out infinite;
        }

        .login-red-glow-1 {
          top: -10vw;
          left: -8vw;
          background: rgba(179,18,23,0.28);
        }

        .login-red-glow-2 {
          bottom: -12vw;
          right: -8vw;
          background: rgba(179,18,23,0.18);
          animation-delay: 1.8s;
        }
      `}</style>

      <div className="login-red-glow-1"></div>
      <div className="login-red-glow-2"></div>

      <div className="login-logo-bg">
        <img src={teamLogo} alt="AS BS 04 Background Logo" />
      </div>

      <div style={styles.card}>
        <img src={teamLogo} alt="AS BS 04 Logo" style={styles.logo} />

        <p style={styles.eyebrow}>AS BS 04 / Admin Access</p>
        <h1 style={styles.title}>Login</h1>
        <p style={styles.subtitle}>
          Zugriff auf Recruitment und Event Verwaltung.
        </p>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Anmeldung läuft...' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, #191b23 0%, #0b0c10 48%, #06070a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '460px',
    padding: '32px',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 20px 70px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    textAlign: 'center',
  },
  logo: {
    width: '88px',
    marginBottom: '16px',
  },
  eyebrow: {
    margin: '0 0 8px 0',
    color: '#b31217',
    fontSize: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '34px',
  },
  subtitle: {
    margin: '0 0 24px 0',
    color: '#b8bcc7',
    lineHeight: 1.5,
  },
  form: {
    display: 'grid',
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(12,14,20,0.9)',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(179,18,23,0.7)',
    background: 'rgba(179,18,23,0.22)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
}