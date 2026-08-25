import { useEffect, useState } from 'react'

/**
 * Sehr kleiner History-API-Router. Reicht für die paar Routen dieser Seite
 * und spart die react-router Abhängigkeit.
 */

const normalize = (pathname) => {
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  return path === '' ? '/' : path
}

export const currentPath = () => normalize(window.location.pathname)

export function navigate(to, { replace = false } = {}) {
  const target = to.startsWith('/') ? to : `/${to}`

  if (normalize(target) === currentPath()) return

  if (replace) {
    window.history.replaceState({}, '', target)
  } else {
    window.history.pushState({}, '', target)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const sync = () => setPath(currentPath())

    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}
