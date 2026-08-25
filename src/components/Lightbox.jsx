import { useEffect, useRef } from 'react'

export default function Lightbox({ item, onClose, onPrev, onNext, position }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const { body } = document
    const previousOverflow = body.style.overflow

    body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') {
        onClose()
        return
      }

      if (keyEvent.key === 'ArrowLeft') {
        onPrev()
        return
      }

      if (keyEvent.key === 'ArrowRight') {
        onNext()
        return
      }

      if (keyEvent.key !== 'Tab') return

      // Fokus innerhalb des Dialogs halten.
      const focusable = dialogRef.current?.querySelectorAll('button')
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (keyEvent.shiftKey && document.activeElement === first) {
        keyEvent.preventDefault()
        last.focus()
      } else if (!keyEvent.shiftKey && document.activeElement === last) {
        keyEvent.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Galerie: ${item.title}`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="lightbox-content"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Galerie schliessen"
        >
          <span aria-hidden="true">✕</span>
        </button>

        <button
          type="button"
          className="lightbox-nav lightbox-prev"
          onClick={onPrev}
          aria-label="Vorheriges Bild"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          type="button"
          className="lightbox-nav lightbox-next"
          onClick={onNext}
          aria-label="Nächstes Bild"
        >
          <span aria-hidden="true">›</span>
        </button>

        <img src={item.image} alt={item.title} className="lightbox-image" />

        <div className="lightbox-caption">
          <p className="lightbox-counter">{position}</p>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
        </div>
      </div>
    </div>
  )
}
