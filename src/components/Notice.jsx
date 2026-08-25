export default function Notice({ notice, onDismiss }) {
  if (!notice) return null

  return (
    <div
      className={`admin-notice admin-notice-${notice.type === 'success' ? 'success' : 'error'}`}
      role="status"
      aria-live="polite"
    >
      <span>{notice.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Meldung schliessen">
        ✕
      </button>
    </div>
  )
}
