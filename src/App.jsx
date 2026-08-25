import { lazy, Suspense, useEffect } from 'react'
import './App.css'
import { useAuth } from './lib/useAuth'
import { useRoute } from './lib/router'
import Home from './pages/Home'

// Nur die Startseite gehört ins Haupt-Bundle. Alles andere wird erst geladen,
// wenn die Route tatsächlich aufgerufen wird.
const Admin = lazy(() => import('./pages/Admin'))
const EventsAdmin = lazy(() => import('./pages/EventsAdmin'))
const Legal = lazy(() => import('./pages/Legal'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PAGE_TITLES = {
  '/': 'AS BS 04 — Airsoft Squad Basel | Taktisches MilSim Team',
  '/impressum': 'Impressum — AS BS 04',
  '/datenschutz': 'Datenschutz — AS BS 04',
  '/admin': 'Recruitment Dashboard — AS BS 04',
  '/admin/events': 'Event Verwaltung — AS BS 04',
}

export default function App() {
  const route = useRoute()
  const { session, loading } = useAuth()

  useEffect(() => {
    document.title = PAGE_TITLES[route] || 'Seite nicht gefunden — AS BS 04'
  }, [route])

  // Beim Wechsel der Route oben starten — ausser es wird ein Anker angesprungen.
  useEffect(() => {
    if (window.location.hash) return
    window.scrollTo(0, 0)
  }, [route])

  return (
    <Suspense fallback={<PageLoading />}>
      <RouteFocus route={route} />
      {renderRoute(route, session, loading)}
    </Suspense>
  )
}

function renderRoute(route, session, loading) {
  if (route === '/admin' || route === '/admin/events') {
    if (loading) return <PageLoading label="Zugang wird geprüft…" />
    if (!session) return <Login />
    return route === '/admin/events' ? <EventsAdmin /> : <Admin />
  }

  if (route === '/') return <Home session={session} />
  if (route === '/impressum') return <Legal view="impressum" session={session} />
  if (route === '/datenschutz') return <Legal view="datenschutz" session={session} />

  return <NotFound session={session} />
}

// Bewusst ausserhalb der Komponente: überlebt das Aus- und Wiedereinhängen durch
// Suspense und macht den zweiten Effect-Durchlauf im StrictMode zum No-op.
let lastFocusedRoute = null

/**
 * Bei einem Routenwechsel bleibt der Fokus sonst auf dem angeklickten Link —
 * Screenreader lesen dann an der alten Stelle weiter. Rendert nichts.
 */
function RouteFocus({ route }) {
  useEffect(() => {
    const isFirstRoute = lastFocusedRoute === null
    const isSameRoute = lastFocusedRoute === route

    lastFocusedRoute = route
    if (isFirstRoute || isSameRoute) return

    const main = document.querySelector('main')
    if (!main) return

    main.setAttribute('tabindex', '-1')
    main.focus({ preventScroll: true })
  }, [route])

  return null
}

function PageLoading({ label = 'Wird geladen…' }) {
  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <span className="auth-loading-spinner" aria-hidden="true"></span>
      <p>{label}</p>
    </div>
  )
}
