import { patients } from "@/lib/db/schema"
import { todayISODate } from "@/lib/format/date"

export type PatientRow = typeof patients.$inferSelect

export { patients as patientTable }

export interface PatientDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dni: string
  birthDate: string
  bloodType?: string
  createdAt: string
}

export interface PatientInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  dni: string
  birthDate: string
  bloodType?: string
}

/** Admin form payload: absent fields fall back to the defaults set in the validation layer. */
export type PatientFormInput = Partial<PatientInput> & { id?: string }

export class Patient {
  // Campos declarados y asignados a mano en lugar de "parameter properties":
  // esa sintaxis de TypeScript genera código, no solo tipos, y rompe con
  // cualquier herramienta que se limite a borrar anotaciones (Node, esbuild).
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dni: string
  birthDate: string
  createdAt: string
  bloodType?: string | null
  userId?: string | null

  constructor(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string = "",
    dni: string = "",
    birthDate: string = "1990-01-01",
    createdAt: string = todayISODate(),
    bloodType?: string | null,
    userId?: string | null
  ) {
    this.id = id
    this.firstName = firstName
    this.lastName = lastName
    this.email = email
    this.phone = phone
    this.dni = dni
    this.birthDate = birthDate
    this.createdAt = createdAt
    this.bloodType = bloodType
    this.userId = userId
  }

  static fromRow(row: PatientRow): Patient {
    return new Patient(
      row.id,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.dni,
      row.birthDate,
      row.createdAt,
      row.bloodType,
      row.userId
    )
  }
}

export function toPatientDto(patient: Patient): PatientDto {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
    phone: patient.phone,
    dni: patient.dni,
    birthDate: patient.birthDate,
    bloodType: patient.bloodType ?? undefined,
    createdAt: patient.createdAt,
  }
}
