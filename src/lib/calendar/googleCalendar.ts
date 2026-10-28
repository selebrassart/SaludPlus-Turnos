import type { AppointmentDto } from "@/models/Appointment"
import { toIcsUtcStamp } from "@/lib/calendar/ics"

/**
 * Enlace que abre Google Calendar con el turno ya cargado.
 *
 * Por qué esto y no la API de Google Calendar: la API exige credenciales de
 * OAuth 2.0 —un client ID y un client secret que se sacan de la consola de
 * Google Cloud, con pantalla de consentimiento verificada— y guardar el token
 * de cada persona. Sin esas credenciales, una integración con la API no
 * funciona: se puede escribir el código, pero no se puede probar ni usar.
 *
 * Este enlace, en cambio, funciona hoy y sin nada configurado. Abre Google
 * Calendar con el evento completo; la persona toca "Guardar" y el turno queda
 * en su calendario, con los avisos que tenga configurados en Google.
 *
 * Lo que se pierde frente a la API: hace falta ese clic, y si después se
 * cancela o reprograma el turno acá, el evento en Google no se entera. Está
 * anotado en el propio evento para que nadie se confíe.
 *
 * Formato de `dates`: dos marcas UTC básicas separadas por "/", que es lo que
 * espera Google. Se reutiliza `toIcsUtcStamp` para no tener dos conversiones
 * de zona horaria que puedan discrepar.
 */
export function buildGoogleCalendarUrl(
  appointment: AppointmentDto,
  { durationMinutes = 30 }: { durationMinutes?: number } = {}
): string {
  const inicio = toIcsUtcStamp(appointment.date, appointment.time)
  const fin = toIcsUtcStamp(appointment.date, appointment.time, durationMinutes)

  const lugar = [appointment.branchName, appointment.office && `Consultorio ${appointment.office}`]
    .filter(Boolean)
    .join(" · ")

  const detalle = [
    `Profesional: ${appointment.doctorName}`,
    `Especialidad: ${appointment.specialtyName}`,
    appointment.reason ? `Motivo: ${appointment.reason}` : "",
    "",
    "Turno reservado en SaludPlus.",
    "Si lo cancelás o reprogramás allí, este evento no se actualiza solo.",
  ]
    .filter(Boolean)
    .join("\n")

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Turno · ${appointment.specialtyName} · ${appointment.doctorName}`,
    dates: `${inicio}/${fin}`,
    details: detalle,
  })

  // Google ignora un `location` vacío, pero mandarlo igual deja el enlace con
  // un parámetro de más sin valor. Mejor no incluirlo.
  if (lugar) params.set("location", lugar)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
