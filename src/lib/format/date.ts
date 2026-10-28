const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

const shortMonthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

const weekdayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]

const millisecondsPerDay = 86400000

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function todayISODate(): string {
  return toISODate(new Date())
}

/** Builds a local Date from an ISO date so the calendar day is not shifted by the timezone. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatLongDate(iso: string): string {
  const date = parseISODate(iso)
  return `${capitalize(weekdayNames[date.getDay()])} ${date.getDate()} de ${monthNames[date.getMonth()]}`
}

export function formatShortDate(iso: string): string {
  const date = parseISODate(iso)
  return `${date.getDate()} ${shortMonthNames[date.getMonth()]} ${date.getFullYear()}`
}

export function formatShortMonth(iso: string): string {
  return shortMonthNames[parseISODate(iso).getMonth()]
}

export function calculateAge(birthDate: string): number {
  const birth = parseISODate(birthDate)
  const now = new Date()
  const monthDelta = now.getMonth() - birth.getMonth()
  const hasHadBirthday =
    monthDelta > 0 || (monthDelta === 0 && now.getDate() >= birth.getDate())
  return now.getFullYear() - birth.getFullYear() - (hasHadBirthday ? 0 : 1)
}

export function daysUntil(iso: string): number {
  const target = parseISODate(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / millisecondsPerDay)
}
