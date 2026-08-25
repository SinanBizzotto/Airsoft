const DASH = '–'

const dateTimeFormatter = new Intl.DateTimeFormat('de-CH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const longDateFormatter = new Intl.DateTimeFormat('de-CH', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('de-CH', {
  hour: '2-digit',
  minute: '2-digit',
})

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value, fallback = DASH) {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : fallback
}

export function formatDateLong(value, fallback = DASH) {
  const date = toDate(value)
  return date ? longDateFormatter.format(date) : fallback
}

export function formatTime(value, fallback = DASH) {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : fallback
}

/**
 * Wert für <input type="datetime-local">. `toISOString()` würde nach UTC
 * verschieben und im Formular die falsche Uhrzeit anzeigen.
 */
export function toDateTimeLocalValue(value) {
  const date = toDate(value)
  if (!date) return ''

  const pad = (number) => String(number).padStart(2, '0')

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Lokale Formulareingabe zurück in einen ISO-Timestamp (UTC) übersetzen. */
export function fromDateTimeLocalValue(value) {
  const date = toDate(value)
  return date ? date.toISOString() : null
}

export function isPast(value) {
  const date = toDate(value)
  return date ? date.getTime() < Date.now() : false
}

export { DASH }
