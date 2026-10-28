import {
  DEFAULT_SCHEDULE,
  generateTimeSlots,
  toMinutes,
} from "@/lib/bookingSlots"
import type { MedicInput } from "@/models/Medic"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const officePattern = /^[A-Za-z0-9\s.\-/]{1,12}$/
const defaultWorkDays = [1, 2, 3, 4, 5]

function sanitizeWorkDays(value: unknown): number[] {
  if (!Array.isArray(value)) return defaultWorkDays
  const days = value
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  return days.length > 0 ? days : defaultWorkDays
}

/** El consultorio es una etiqueta corta: "101", "3B", "PB-2". */
function sanitizeOffice(value: unknown): string {
  const office = typeof value === "string" ? value.trim() : ""
  if (!office) return ""

  if (!officePattern.test(office)) {
    throw new Error(
      "El consultorio solo admite letras, números y guiones (hasta 12 caracteres)"
    )
  }
  return office
}

/** Hora "HH:MM" válida, o el valor por defecto si viene mal. */
function sanitizeTime(value: unknown, fallback: string): string {
  const texto = typeof value === "string" ? value.trim() : ""
  return toMinutes(texto) === null ? fallback : texto
}

/**
 * Jornada de atención del profesional.
 *
 * Se valida como conjunto y no campo por campo: una hora de cierre anterior a
 * la de apertura, o una duración que no deja entrar ni un turno, dejan al
 * profesional sin horarios disponibles y nadie puede reservar con él. Es mejor
 * rechazarlo en el formulario que descubrirlo al no ver turnos.
 */
function sanitizeSchedule(input: Record<string, unknown>) {
  const startTime = sanitizeTime(input.startTime, DEFAULT_SCHEDULE.startTime)
  const endTime = sanitizeTime(input.endTime, DEFAULT_SCHEDULE.endTime)

  // El corte es opcional: vacío en los dos campos significa jornada continua.
  const breakStart =
    typeof input.breakStart === "string" && input.breakStart.trim()
      ? sanitizeTime(input.breakStart, DEFAULT_SCHEDULE.breakStart)
      : ""
  const breakEnd =
    typeof input.breakEnd === "string" && input.breakEnd.trim()
      ? sanitizeTime(input.breakEnd, DEFAULT_SCHEDULE.breakEnd)
      : ""

  const slotMinutes = Math.trunc(
    Number(input.slotMinutes ?? DEFAULT_SCHEDULE.slotMinutes)
  )

  if ((toMinutes(endTime) ?? 0) <= (toMinutes(startTime) ?? 0)) {
    throw new Error("El horario de cierre debe ser posterior al de apertura")
  }

  if (!Number.isFinite(slotMinutes) || slotMinutes < 5 || slotMinutes > 240) {
    throw new Error("La duración de la consulta debe estar entre 5 y 240 minutos")
  }

  if (breakStart && breakEnd && (toMinutes(breakEnd) ?? 0) <= (toMinutes(breakStart) ?? 0)) {
    throw new Error("El fin del descanso debe ser posterior a su inicio")
  }

  const schedule = { startTime, endTime, breakStart, breakEnd, slotMinutes }

  if (generateTimeSlots(schedule).length === 0) {
    throw new Error(
      "Con esa jornada no entra ningún turno: revisá los horarios y la duración"
    )
  }

  return schedule
}

export function sanitizeMedicInput(raw: unknown): MedicInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const firstName =
    typeof input.firstName === "string" ? input.firstName.trim() : ""
  if (!firstName) throw new Error("El nombre es obligatorio")

  const lastName =
    typeof input.lastName === "string" ? input.lastName.trim() : ""
  if (!lastName) throw new Error("El apellido es obligatorio")

  const email = typeof input.email === "string" ? input.email.trim() : ""
  if (!emailPattern.test(email)) throw new Error("Email inválido")

  const branchId =
    typeof input.branchId === "string" ? input.branchId.trim() : ""
  const office = sanitizeOffice(input.office)

  // Un consultorio sin sede no identifica ningún lugar: "Consultorio 4" no
  // dice nada si no se sabe en qué edificio está.
  if (office && !branchId) {
    throw new Error("Para indicar un consultorio hay que elegir una sede")
  }

  const yearsExperience = Number(input.yearsExperience ?? 1)

  return {
    firstName,
    lastName,
    email,
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    specialtyId:
      typeof input.specialtyId === "string" ? input.specialtyId.trim() : "",
    // Lo reescribe MedicService leyéndolo de la especialidad elegida.
    specialtyName: "",
    branchId,
    office,
    avatar: typeof input.avatar === "string" ? input.avatar.trim() : "",
    license: typeof input.license === "string" ? input.license.trim() : "",
    yearsExperience: Number.isNaN(yearsExperience)
      ? 1
      : Math.max(0, yearsExperience),
    workDays: sanitizeWorkDays(input.workDays),
    ...sanitizeSchedule(input),
  }
}
