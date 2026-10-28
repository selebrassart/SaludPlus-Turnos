import "server-only"
import {
  Appointment,
  type AppointmentInput,
  type AppointmentStatus,
} from "@/models/Appointment"
import type { SessionUser } from "@/models/User"
import type { AppointmentRepository } from "@/repository/AppointmentRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { NotificationService } from "./NotificationService"
import type { PatientService } from "./PatientService"

export interface CreateAppointmentResult {
  ok: boolean
  error?: string
  appointment?: Appointment
}

/** PostgreSQL `unique_violation`. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  )
}

export class AppointmentService {
  private repository: AppointmentRepository
  private medicRepository: MedicRepository
  private patientService: PatientService
  private notificationService: NotificationService

  constructor(
    repository: AppointmentRepository,
    medicRepository: MedicRepository,
    patientService: PatientService,
    notificationService: NotificationService
  ) {
    this.repository = repository
    this.medicRepository = medicRepository
    this.patientService = patientService
    this.notificationService = notificationService
  }

  /**
   * Scoped by role: an admin sees every appointment, a doctor only the ones
   * booked with them, and a patient only their own.
   */
  async findAllForUser(user: SessionUser): Promise<Appointment[]> {
    if (user.role === "admin") return this.repository.findAll()

    if (user.role === "doctor") {
      const medic = await this.medicRepository.findByUserId(user.id)
      return medic ? this.repository.findByDoctorId(medic.id) : []
    }

    const patient = await this.patientService.findByUserId(user.id)
    return patient ? this.repository.findByPatientId(patient.id) : []
  }

  /**
   * Un turno, pero solo si a esta persona le corresponde verlo.
   *
   * Misma regla de alcance que `findAllForUser`: el administrador ve todos, el
   * profesional los suyos y el paciente los propios. Devolver `undefined` en
   * lugar de lanzar deja que quien llama decida entre 403 y 404.
   */
  async findOneForUser(
    user: SessionUser,
    id: string
  ): Promise<Appointment | undefined> {
    const appointment = await this.repository.findOne(id)
    if (!appointment) return undefined

    if (user.role === "admin") return appointment

    if (user.role === "doctor") {
      const medic = await this.medicRepository.findByUserId(user.id)
      return medic && appointment.doctorId === medic.id ? appointment : undefined
    }

    const patient = await this.patientService.findByUserId(user.id)
    return patient && appointment.patientId === patient.id
      ? appointment
      : undefined
  }

  /**
   * Horarios ya ocupados de un profesional en una fecha.
   *
   * Sirve para apagar esos botones en el calendario: antes se ofrecían todos y
   * la persona se enteraba de que el horario estaba tomado recién al confirmar,
   * después de haber recorrido los cuatro pasos.
   */
  /**
   * Horarios que el calendario tiene que mostrar deshabilitados.
   *
   * Son dos conjuntos: los que ya tiene tomados el profesional, y los que el
   * propio paciente tiene ocupados ese día con CUALQUIER médico. Sin los
   * segundos, el horario se ofrecía como libre y el rechazo recién aparecía
   * al confirmar, que es la peor forma de enterarse.
   */
  async takenSlots(
    doctorId: string,
    date: string,
    user?: SessionUser
  ): Promise<string[]> {
    const appointments = await this.repository.findByDoctorAndDate(
      doctorId,
      date
    )

    const taken = new Set(
      appointments
        .filter((appointment) => appointment.status !== "cancelled")
        .map((appointment) => appointment.time)
    )

    if (user) {
      const patient = await this.patientService.findByUserId(user.id)
      if (patient) {
        const own = await this.repository.findByPatientAndDate(patient.id, date)
        for (const appointment of own) taken.add(appointment.time)
      }
    }

    return [...taken]
  }

  async create(
    user: SessionUser,
    input: AppointmentInput
  ): Promise<CreateAppointmentResult> {
    let patient
    try {
      patient = await this.patientService.findOrCreateForUser(
        user.id,
        user.name,
        user.email
      )
    } catch (error) {
      return { ok: false, error: (error as Error).message }
    }

    const medic = await this.medicRepository.findOne(input.doctorId)
    if (!medic) {
      return { ok: false, error: "El profesional seleccionado no existe." }
    }

    const clash = await this.repository.findClash(
      input.doctorId,
      input.date,
      input.time
    )
    if (clash) {
      return { ok: false, error: "Ese horario ya fue reservado. Elegí otro." }
    }

    // Una persona no puede estar en dos consultas a la vez. Sin este chequeo
    // se podía reservar con dos profesionales distintos el mismo día y hora:
    // cada turno era válido por separado y ninguna de las otras dos guardas
    // —agenda del médico, consultorio— los veía.
    const ownClash = await this.repository.findPatientClash(
      patient.id,
      input.date,
      input.time
    )
    if (ownClash) {
      return {
        ok: false,
        error: `Ya tenés un turno ese día a las ${input.time} con ${ownClash.doctorName}.`,
      }
    }

    // El consultorio es un recurso compartido: puede estar ocupado por otro
    // profesional aunque este médico tenga la agenda libre.
    if (medic.branchId && medic.office) {
      const roomClash = await this.repository.findRoomClash(
        medic.branchId,
        medic.office,
        input.date,
        input.time
      )
      if (roomClash) {
        return {
          ok: false,
          error: `El consultorio ${medic.office} está ocupado en ese horario. Elegí otro.`,
        }
      }
    }

    const appointment = new Appointment({
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: medic.id,
      doctorName: medic.displayName,
      specialtyName: medic.specialtyName,
      // Copiados a propósito: si el médico cambia de sede, este turno tiene que
      // seguir diciendo dónde se atendió la persona.
      branchId: medic.branchId,
      branchName: medic.branchName,
      office: medic.office,
      date: input.date,
      time: input.time,
      status: "scheduled",
      reason: input.reason ?? null,
    })

    try {
      await this.repository.create(appointment)
    } catch (error) {
      // The clash check above and this insert are not atomic, so two requests
      // for the same slot can both get past it. The partial unique index
      // `appointments_slot_unique` is what actually decides, and the loser
      // lands here as a 23505.
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          error:
            "Ese horario acaba de ser tomado por otra persona. Elegí otro.",
        }
      }
      throw error
    }

    await this.notificationService.appointmentBooked(appointment)

    return { ok: true, appointment }
  }

  /**
   * Mueve un turno a otra fecha y hora conservando su identidad.
   *
   * Cancelar y volver a crear era la única salida hasta ahora, pero eso pierde
   * el historial: el turno original queda como "cancelado" y el nuevo no sabe
   * de dónde viene. Reprogramar mantiene el mismo registro.
   */
  async reschedule(
    user: SessionUser,
    id: string,
    date: string,
    time: string
  ): Promise<CreateAppointmentResult> {
    const appointment = await this.repository.findOne(id)
    if (!appointment) {
      return { ok: false, error: "El turno no existe." }
    }

    if (user.role === "patient") {
      const patient = await this.patientService.findByUserId(user.id)
      if (!patient || appointment.patientId !== patient.id) {
        return { ok: false, error: "Solo podés reprogramar tus propios turnos." }
      }
    }

    if (appointment.status !== "scheduled") {
      return {
        ok: false,
        error: "Solo se pueden reprogramar los turnos agendados.",
      }
    }

    if (appointment.date === date && appointment.time === time) {
      return { ok: false, error: "Elegí una fecha u hora distinta." }
    }

    const clash = await this.repository.findClash(
      appointment.doctorId,
      date,
      time,
      appointment.id
    )
    if (clash) {
      return { ok: false, error: "Ese horario ya fue reservado. Elegí otro." }
    }

    const ownClash = await this.repository.findPatientClash(
      appointment.patientId,
      date,
      time,
      appointment.id
    )
    if (ownClash) {
      return {
        ok: false,
        error: `Ya tenés un turno ese día a las ${time} con ${ownClash.doctorName}.`,
      }
    }

    if (appointment.branchId && appointment.office) {
      const roomClash = await this.repository.findRoomClash(
        appointment.branchId,
        appointment.office,
        date,
        time,
        appointment.id
      )
      if (roomClash) {
        return {
          ok: false,
          error: `El consultorio ${appointment.office} está ocupado en ese horario. Elegí otro.`,
        }
      }
    }

    // Se copian ANTES del UPDATE. Leerlos después funciona solo mientras el
    // repositorio devuelva instancias nuevas en cada consulta; si alguna vez
    // devolviera la misma que se acaba de modificar —una caché, por ejemplo—,
    // el aviso informaría el horario nuevo como si fuera el anterior.
    const previousDate = appointment.date
    const previousTime = appointment.time

    let updated
    try {
      updated = await this.repository.update(id, { date, time })
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          error: "Ese horario acaba de ser tomado por otra persona. Elegí otro.",
        }
      }
      throw error
    }

    if (updated) {
      await this.notificationService.appointmentRescheduled(
        updated,
        previousDate,
        previousTime
      )
    }

    return {
      ok: true,
      appointment: updated,
    }
  }

  async cancel(user: SessionUser, id: string): Promise<void> {
    if (user.role === "patient") {
      const patient = await this.patientService.findByUserId(user.id)
      if (!patient) throw new Error("Unauthorized")
      await this.repository.updateStatusScopedToPatient(
        id,
        patient.id,
        "cancelled"
      )
    } else {
      await this.repository.update(id, { status: "cancelled" })
    }

    // Se relee para avisar solo si la cancelación realmente se aplicó: la
    // versión acotada al paciente no toca nada si el turno no era suyo.
    const cancelled = await this.repository.findOne(id)
    if (cancelled?.status === "cancelled") {
      await this.notificationService.appointmentCancelled(cancelled)
    }
  }

  async setStatus(
    user: SessionUser,
    id: string,
    status: AppointmentStatus
  ): Promise<void> {
    if (user.role === "patient") throw new Error("Unauthorized")
    const updated = await this.repository.update(id, { status })
    if (updated) {
      await this.notificationService.appointmentStatusChanged(updated)
    }
  }

  async saveNotes(user: SessionUser, id: string, notes: string): Promise<void> {
    if (user.role === "patient") throw new Error("Unauthorized")
    await this.repository.update(id, { notes })
  }
}
