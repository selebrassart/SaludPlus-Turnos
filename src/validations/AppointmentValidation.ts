import type { AppointmentInput, AppointmentStatus } from "@/models/Appointment"

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^\d{2}:\d{2}$/
const validStatuses: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "absent",
]

export function sanitizeAppointmentInput(raw: unknown): AppointmentInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const doctorId =
    typeof input.doctorId === "string" ? input.doctorId.trim() : ""
  if (!doctorId) throw new Error("Elegí un profesional")

  const date = typeof input.date === "string" ? input.date.trim() : ""
  if (!isoDatePattern.test(date)) throw new Error("Fecha inválida")

  const time = typeof input.time === "string" ? input.time.trim() : ""
  if (!timePattern.test(time)) throw new Error("Hora inválida")

  const reason =
    typeof input.reason === "string" && input.reason.trim()
      ? input.reason.trim()
      : undefined

  return { doctorId, date, time, reason }
}

/** Fecha y hora nuevas al reprogramar: mismo formato que al reservar. */
export function sanitizeReschedule(
  rawDate: unknown,
  rawTime: unknown
): { date: string; time: string } {
  const date = typeof rawDate === "string" ? rawDate.trim() : ""
  if (!isoDatePattern.test(date)) throw new Error("Fecha inválida")

  const time = typeof rawTime === "string" ? rawTime.trim() : ""
  if (!timePattern.test(time)) throw new Error("Hora inválida")

  return { date, time }
}

export function sanitizeAppointmentStatus(raw: unknown): AppointmentStatus {
  if (
    typeof raw !== "string" ||
    !validStatuses.includes(raw as AppointmentStatus)
  ) {
    throw new Error("Estado de turno inválido")
  }
  return raw as AppointmentStatus
}
