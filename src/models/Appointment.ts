import { appointments } from "@/lib/db/schema"

export type AppointmentRow = typeof appointments.$inferSelect

export { appointments as appointmentTable }

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "absent"

export interface AppointmentDto {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  specialtyName: string
  branchName: string
  office: string
  date: string
  time: string
  status: AppointmentStatus
  reason?: string
  notes?: string
}

export interface AppointmentResult {
  ok: boolean
  error?: string
  appointment?: AppointmentDto
}

export interface AppointmentInput {
  doctorId: string
  date: string
  time: string
  reason?: string
}

/**
 * Es un objeto y no una lista de parámetros posicionales: la entidad ya tiene
 * catorce campos y varios son strings seguidos, donde un desorden no lo detecta
 * el compilador.
 */
export interface AppointmentAttributes {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  specialtyName: string
  /** Sede y consultorio copiados del médico al momento de reservar. */
  branchId?: string | null
  branchName?: string
  office?: string
  date: string
  time: string
  status?: AppointmentStatus
  reason?: string | null
  notes?: string | null
}

export class Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  specialtyName: string
  branchId: string | null
  branchName: string
  office: string
  date: string
  time: string
  status: AppointmentStatus
  reason: string | null
  notes: string | null

  constructor(attributes: AppointmentAttributes) {
    this.id = attributes.id
    this.patientId = attributes.patientId
    this.patientName = attributes.patientName
    this.doctorId = attributes.doctorId
    this.doctorName = attributes.doctorName
    this.specialtyName = attributes.specialtyName
    this.branchId = attributes.branchId ?? null
    this.branchName = attributes.branchName ?? ""
    this.office = attributes.office ?? ""
    this.date = attributes.date
    this.time = attributes.time
    this.status = attributes.status ?? "scheduled"
    this.reason = attributes.reason ?? null
    this.notes = attributes.notes ?? null
  }

  static fromRow(row: AppointmentRow): Appointment {
    return new Appointment({
      id: row.id,
      patientId: row.patientId,
      patientName: row.patientName,
      doctorId: row.doctorId,
      doctorName: row.doctorName,
      specialtyName: row.specialtyName,
      branchId: row.branchId,
      branchName: row.branchName,
      office: row.office,
      date: row.date,
      time: row.time,
      status: row.status as AppointmentStatus,
      reason: row.reason,
      notes: row.notes,
    })
  }
}

export function toAppointmentDto(appointment: Appointment): AppointmentDto {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    specialtyName: appointment.specialtyName,
    branchName: appointment.branchName,
    office: appointment.office,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    reason: appointment.reason ?? undefined,
    notes: appointment.notes ?? undefined,
  }
}
