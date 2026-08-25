import { navigate } from '../lib/router'

const isModifiedEvent = (event) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0

export default function Link({ to, children, onClick, ...rest }) {
  const handleClick = (event) => {
    onClick?.(event)

    // Neuer Tab / Mittelklick soll sich normal verhalten.
    if (isModifiedEvent(event) || event.defaultPrevented) return

    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
