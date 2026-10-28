import {
  DNI_MAX_DIGITS,
  DNI_MIN_DIGITS,
  normalizeDni,
} from "@/lib/format/dni"
import { parseISODate, todayISODate } from "@/lib/format/date"
import type { PatientInput } from "@/models/Patient"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

/** Nadie documentado supera esta edad; sirve para atajar años tipeados mal. */
const MAX_AGE_YEARS = 120

function sanitizeDni(raw: unknown): string {
  const digits = normalizeDni(typeof raw === "string" ? raw : "")

  if (!digits) throw new Error("El DNI es obligatorio")
  if (digits.length < DNI_MIN_DIGITS || digits.length > DNI_MAX_DIGITS) {
    throw new Error(
      `El DNI debe tener entre ${DNI_MIN_DIGITS} y ${DNI_MAX_DIGITS} dígitos`
    )
  }
  return digits
}

function sanitizeBirthDate(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : ""
  if (!value) throw new Error("La fecha de nacimiento es obligatoria")
  if (!isoDatePattern.test(value)) {
    throw new Error("La fecha de nacimiento no tiene un formato válido")
  }

  const birth = parseISODate(value)
  if (Number.isNaN(birth.getTime())) {
    throw new Error("La fecha de nacimiento no es una fecha real")
  }

  // parseISODate normaliza los desbordes (2026-02-31 pasa a marzo), así que se
  // compara contra el texto original para detectar un día que no existe.
  const [year, month, day] = value.split("-").map(Number)
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    throw new Error("La fecha de nacimiento no es una fecha real")
  }

  if (value > todayISODate()) {
    throw new Error("La fecha de nacimiento no puede ser futura")
  }

  const oldest = new Date()
  oldest.setFullYear(oldest.getFullYear() - MAX_AGE_YEARS)
  if (birth < oldest) {
    throw new Error(`La fecha de nacimiento no puede superar los ${MAX_AGE_YEARS} años`)
  }

  return value
}

export function sanitizePatientInput(raw: unknown): PatientInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const firstName =
    typeof input.firstName === "string" ? input.firstName.trim() : ""
  if (!firstName) throw new Error("El nombre es obligatorio")

  const lastName =
    typeof input.lastName === "string" ? input.lastName.trim() : ""
  if (!lastName) throw new Error("El apellido es obligatorio")

  const email = typeof input.email === "string" ? input.email.trim() : ""
  if (!emailPattern.test(email)) throw new Error("Email inválido")

  return {
    firstName,
    lastName,
    email,
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    dni: sanitizeDni(input.dni),
    birthDate: sanitizeBirthDate(input.birthDate),
    bloodType:
      typeof input.bloodType === "string" && input.bloodType.trim()
        ? input.bloodType.trim()
        : undefined,
  }
}
