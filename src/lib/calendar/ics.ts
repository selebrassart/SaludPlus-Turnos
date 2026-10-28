import type { AppointmentDto } from "@/models/Appointment"

/**
 * Genera el archivo .ics de un turno (RFC 5545).
 *
 * Sin dependencias ni servicios externos: es texto plano. El navegador lo abre
 * en Google Calendar, Outlook o el calendario del teléfono, que es lo que en la
 * práctica evita que la persona se olvide del turno.
 */

/**
 * Argentina está en UTC-3 todo el año: no aplica horario de verano desde 2009.
 *
 * Se emiten horas absolutas en UTC en lugar de "hora flotante" porque así el
 * turno cae en el momento correcto sin importar en qué zona horaria esté
 * configurado el dispositivo de quien lo abre. Si alguna vez volviera a haber
 * horario de verano, este es el único lugar a tocar.
 */
const UTC_OFFSET_HOURS = 3

/** Duración de la consulta. Cuando cada profesional tenga su agenda, saldrá de ahí. */
const DEFAULT_DURATION_MINUTES = 30

/**
 * Escapa los caracteres que en un valor TEXT del formato tienen significado
 * propio. Sin esto, un motivo de consulta con una coma parte el campo en dos.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/**
 * Pliega las líneas a 75 octetos, como exige el RFC.
 *
 * Se cuenta en bytes UTF-8, no en caracteres: una descripción con acentos
 * llega al límite antes de lo que sugiere su longitud, y cortar en medio de un
 * carácter multibyte produce un archivo que algunos clientes rechazan.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const partes: string[] = []
  let actual = ""
  let bytes = 0
  // La primera línea admite 75 octetos; las continuaciones llevan un espacio
  // inicial que también cuenta.
  let limite = 75

  for (const caracter of line) {
    const tamano = encoder.encode(caracter).length
    if (bytes + tamano > limite) {
      partes.push(actual)
      actual = ""
      bytes = 0
      limite = 74
    }
    actual += caracter
    bytes += tamano
  }
  if (actual) partes.push(actual)

  return partes.join("\r\n ")
}

/** "2026-06-10" + "10:00" → "20260610T130000Z" */
export function toIcsUtcStamp(
  date: string,
  time: string,
  addMinutes = 0
): string {
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)

  const instante = Date.UTC(
    year,
    month - 1,
    day,
    hour + UTC_OFFSET_HOURS,
    minute + addMinutes
  )
  return new Date(instante).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
}

function place(appointment: AppointmentDto): string {
  return [
    appointment.branchName,
    appointment.office && `Consultorio ${appointment.office}`,
  ]
    .filter(Boolean)
    .join(", ")
}

export function buildAppointmentIcs(
  appointment: AppointmentDto,
  options: { now?: Date; durationMinutes?: number } = {}
): string {
  const duracion = options.durationMinutes ?? DEFAULT_DURATION_MINUTES
  const generadoEn = (options.now ?? new Date())
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 15)

  const descripcion = [
    appointment.specialtyName,
    appointment.reason && `Motivo: ${appointment.reason}`,
  ]
    .filter(Boolean)
    .join(" — ")

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SaludPlus//Turnos Medicos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // El UID identifica el evento: reimportar el mismo turno actualiza el que
    // ya está en el calendario en lugar de agregar un duplicado.
    `UID:${appointment.id}@saludplus`,
    `DTSTAMP:${generadoEn}Z`,
    `DTSTART:${toIcsUtcStamp(appointment.date, appointment.time)}`,
    `DTEND:${toIcsUtcStamp(appointment.date, appointment.time, duracion)}`,
    `SUMMARY:${escapeText(`Consulta con ${appointment.doctorName}`)}`,
  ]

  if (descripcion) lineas.push(`DESCRIPTION:${escapeText(descripcion)}`)

  const lugar = place(appointment)
  if (lugar) lineas.push(`LOCATION:${escapeText(lugar)}`)

  lineas.push(
    appointment.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    // Aviso del propio calendario 24 horas antes, además del de la campanita.
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de turno medico",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  )

  // El RFC exige CRLF, y una línea en blanco final.
  return lineas.map(foldLine).join("\r\n") + "\r\n"
}

/** Nombre sugerido de descarga: legible y sin caracteres problemáticos. */
export function icsFileName(appointment: AppointmentDto): string {
  return `turno-${appointment.date}-${appointment.time.replace(":", "")}.ics`
}
