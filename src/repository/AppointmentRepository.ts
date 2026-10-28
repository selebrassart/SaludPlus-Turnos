import "server-only"
import { and, asc, desc, eq, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  Appointment,
  appointmentTable,
  type AppointmentStatus,
} from "@/models/Appointment"
import type { Repository } from "./BaseRepository"

export class AppointmentRepository implements Repository<Appointment> {
  async findAll(): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .orderBy(desc(appointmentTable.date), asc(appointmentTable.time))
    return rows.map(Appointment.fromRow)
  }

  async findOne(id: string): Promise<Appointment | undefined> {
    const [row] = await db
      .select()
      .from(appointmentTable)
      .where(eq(appointmentTable.id, id))
      .limit(1)
    return row ? Appointment.fromRow(row) : undefined
  }

  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .where(eq(appointmentTable.doctorId, doctorId))
      .orderBy(asc(appointmentTable.time))
    return rows.map(Appointment.fromRow)
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .where(eq(appointmentTable.patientId, patientId))
      .orderBy(desc(appointmentTable.date), asc(appointmentTable.time))
    return rows.map(Appointment.fromRow)
  }

  async findByDoctorAndDate(
    doctorId: string,
    date: string
  ): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.doctorId, doctorId),
          eq(appointmentTable.date, date)
        )
      )
    return rows.map(Appointment.fromRow)
  }

  /** Turnos agendados para una fecha. Base del recordatorio del día previo. */
  async findScheduledOn(date: string): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.date, date),
          eq(appointmentTable.status, "scheduled")
        )
      )
      .orderBy(asc(appointmentTable.time))
    return rows.map(Appointment.fromRow)
  }

  /**
   * `excludeId` deja fuera al propio turno: al reprogramar, el registro que se
   * está moviendo no puede contarse como su propio conflicto.
   */
  async findClash(
    doctorId: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<Appointment | undefined> {
    const [row] = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.doctorId, doctorId),
          eq(appointmentTable.date, date),
          eq(appointmentTable.time, time),
          // Un turno cancelado libera el horario, igual que en el índice único.
          ne(appointmentTable.status, "cancelled"),
          ...(excludeId ? [ne(appointmentTable.id, excludeId)] : [])
        )
      )
      .limit(1)
    return row ? Appointment.fromRow(row) : undefined
  }

  /**
   * Una persona no puede estar en dos consultas a la vez.
   *
   * Faltaba: había guarda para la agenda del médico y para el consultorio,
   * pero ninguna para el paciente, así que se podía reservar cardiología y
   * fonoaudiología el mismo día a las 08:00 con dos profesionales distintos.
   * Los dos turnos eran válidos por separado y ninguno de los dos chequeos
   * los veía.
   */
  async findPatientClash(
    patientId: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<Appointment | undefined> {
    const [row] = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.patientId, patientId),
          eq(appointmentTable.date, date),
          eq(appointmentTable.time, time),
          ne(appointmentTable.status, "cancelled"),
          ...(excludeId ? [ne(appointmentTable.id, excludeId)] : [])
        )
      )
      .limit(1)
    return row ? Appointment.fromRow(row) : undefined
  }

  /** Horarios que el paciente ya tiene ocupados ese día, con cualquier médico. */
  async findByPatientAndDate(
    patientId: string,
    date: string
  ): Promise<Appointment[]> {
    const rows = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.patientId, patientId),
          eq(appointmentTable.date, date),
          ne(appointmentTable.status, "cancelled")
        )
      )
    return rows.map((row) => Appointment.fromRow(row))
  }

  /**
   * Un consultorio es un recurso físico compartido: dos profesionales distintos
   * no pueden estar atendiendo en la misma sala, sede, día y hora.
   */
  async findRoomClash(
    branchId: string,
    office: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<Appointment | undefined> {
    if (!branchId || !office) return undefined

    const [row] = await db
      .select()
      .from(appointmentTable)
      .where(
        and(
          eq(appointmentTable.branchId, branchId),
          eq(appointmentTable.office, office),
          eq(appointmentTable.date, date),
          eq(appointmentTable.time, time),
          ne(appointmentTable.status, "cancelled"),
          ...(excludeId ? [ne(appointmentTable.id, excludeId)] : [])
        )
      )
      .limit(1)
    return row ? Appointment.fromRow(row) : undefined
  }

  async create(item: Appointment): Promise<Appointment> {
    await db.insert(appointmentTable).values({
      id: item.id,
      patientId: item.patientId,
      patientName: item.patientName,
      doctorId: item.doctorId,
      doctorName: item.doctorName,
      specialtyName: item.specialtyName,
      branchId: item.branchId,
      branchName: item.branchName,
      office: item.office,
      date: item.date,
      time: item.time,
      status: item.status,
      reason: item.reason ?? null,
      notes: item.notes ?? null,
    })
    return item
  }

  async update(
    id: string,
    item: Partial<Appointment>
  ): Promise<Appointment | undefined> {
    await db
      .update(appointmentTable)
      .set(item)
      .where(eq(appointmentTable.id, id))
    return this.findOne(id)
  }

  async updateStatusScopedToPatient(
    id: string,
    patientId: string,
    status: AppointmentStatus
  ): Promise<void> {
    await db
      .update(appointmentTable)
      .set({ status })
      .where(
        and(
          eq(appointmentTable.id, id),
          eq(appointmentTable.patientId, patientId)
        )
      )
  }

  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(appointmentTable).where(eq(appointmentTable.id, id))
    return { id }
  }
}
