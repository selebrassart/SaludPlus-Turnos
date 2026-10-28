import "server-only"
import { formatLongDate, toISODate } from "@/lib/format/date"
import type { Appointment, AppointmentStatus } from "@/models/Appointment"
import {
  Notification,
  type NotificationType,
} from "@/models/Notification"
import type { AppointmentRepository } from "@/repository/AppointmentRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { NotificationRepository } from "@/repository/NotificationRepository"
import type { PatientRepository } from "@/repository/PatientRepository"

/** Cuántos días antes del turno se avisa. */
const REMINDER_DAYS_AHEAD = 1

function place(appointment: Appointment): string {
  return [
    appointment.branchName,
    appointment.office && `consultorio ${appointment.office}`,
  ]
    .filter(Boolean)
    .join(", ")
}

const statusMessages: Partial<
  Record<AppointmentStatus, { title: string; body: (a: Appointment) => string }>
> = {
  completed: {
    title: "Consulta registrada como atendida",
    body: (a) =>
      `Tu consulta con ${a.doctorName} del ${formatLongDate(a.date)} figura como atendida. Ya podés calificar la atención.`,
  },
  absent: {
    title: "Figurás como ausente",
    body: (a) =>
      `El turno con ${a.doctorName} del ${formatLongDate(a.date)} quedó registrado como ausente.`,
  },
  cancelled: {
    title: "Turno cancelado",
    body: (a) =>
      `El turno con ${a.doctorName} del ${formatLongDate(a.date)} fue cancelado.`,
  },
}

export class NotificationService {
  private repository: NotificationRepository
  private appointmentRepository: AppointmentRepository
  private patientRepository: PatientRepository
  private medicRepository: MedicRepository

  constructor(
    repository: NotificationRepository,
    appointmentRepository: AppointmentRepository,
    patientRepository: PatientRepository,
    medicRepository: MedicRepository
  ) {
    this.repository = repository
    this.appointmentRepository = appointmentRepository
    this.patientRepository = patientRepository
    this.medicRepository = medicRepository
  }

  list(userId: string) {
    return this.repository.findByUserId(userId)
  }

  countUnread(userId: string) {
    return this.repository.countUnread(userId)
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId)
  }

  markRead(userId: string, id: string) {
    return this.repository.markRead(userId, id)
  }

  // --- Emisores ------------------------------------------------------------

  /**
   * Avisa al paciente y al profesional que se reservó un turno.
   *
   * Nada de esto puede tumbar la reserva: un aviso que no sale es una molestia,
   * perder el turno de una persona es un problema de verdad. Por eso cada envío
   * va aislado en `safely`.
   */
  async appointmentBooked(appointment: Appointment): Promise<void> {
    const { patientUserId, doctorUserId } = await this.participants(appointment)
    const where = place(appointment)

    await this.safely(() =>
      this.push(patientUserId, {
        type: "appointment_booked",
        title: "Turno confirmado",
        body: `${appointment.doctorName} · ${formatLongDate(appointment.date)} a las ${appointment.time} hs${where ? ` en ${where}` : ""}.`,
        dedupeKey: `booked:${appointment.id}`,
      })
    )

    await this.safely(() =>
      this.push(doctorUserId, {
        type: "appointment_booked",
        title: "Nuevo turno agendado",
        body: `${appointment.patientName} reservó para el ${formatLongDate(appointment.date)} a las ${appointment.time} hs.`,
        dedupeKey: `booked-doctor:${appointment.id}`,
      })
    )
  }

  async appointmentRescheduled(
    appointment: Appointment,
    previousDate: string,
    previousTime: string
  ): Promise<void> {
    const { patientUserId, doctorUserId } = await this.participants(appointment)
    const cambio = `del ${formatLongDate(previousDate)} ${previousTime} hs al ${formatLongDate(appointment.date)} ${appointment.time} hs`

    await this.safely(() =>
      this.push(patientUserId, {
        type: "appointment_rescheduled",
        title: "Turno reprogramado",
        body: `Tu turno con ${appointment.doctorName} se movió ${cambio}.`,
        // La fecha entra en la clave: reprogramar dos veces genera dos avisos.
        dedupeKey: `rescheduled:${appointment.id}:${appointment.date}:${appointment.time}`,
      })
    )

    await this.safely(() =>
      this.push(doctorUserId, {
        type: "appointment_rescheduled",
        title: "Turno reprogramado",
        body: `${appointment.patientName} movió su turno ${cambio}.`,
        dedupeKey: `rescheduled-doctor:${appointment.id}:${appointment.date}:${appointment.time}`,
      })
    )
  }

  async appointmentCancelled(appointment: Appointment): Promise<void> {
    const { patientUserId, doctorUserId } = await this.participants(appointment)

    await this.safely(() =>
      this.push(patientUserId, {
        type: "appointment_cancelled",
        title: "Turno cancelado",
        body: `Se canceló tu turno con ${appointment.doctorName} del ${formatLongDate(appointment.date)}.`,
        dedupeKey: `cancelled:${appointment.id}`,
      })
    )

    await this.safely(() =>
      this.push(doctorUserId, {
        type: "appointment_cancelled",
        title: "Turno cancelado",
        body: `${appointment.patientName} canceló el turno del ${formatLongDate(appointment.date)} a las ${appointment.time} hs.`,
        dedupeKey: `cancelled-doctor:${appointment.id}`,
      })
    )
  }

  async appointmentStatusChanged(appointment: Appointment): Promise<void> {
    const message = statusMessages[appointment.status]
    if (!message) return

    const { patientUserId } = await this.participants(appointment)

    await this.safely(() =>
      this.push(patientUserId, {
        type: "appointment_status",
        title: message.title,
        body: message.body(appointment),
        dedupeKey: `status:${appointment.id}:${appointment.status}`,
      })
    )
  }

  async reviewReceived(
    appointment: Appointment,
    score: number
  ): Promise<void> {
    const { doctorUserId } = await this.participants(appointment)

    await this.safely(() =>
      this.push(doctorUserId, {
        type: "review_received",
        title: "Recibiste una calificación",
        body: `${appointment.patientName} calificó con ${score} ${score === 1 ? "estrella" : "estrellas"} la consulta del ${formatLongDate(appointment.date)}.`,
        dedupeKey: `review:${appointment.id}`,
      })
    )
  }

  // --- Recordatorios -------------------------------------------------------

  /**
   * Crea los recordatorios de los turnos de mañana.
   *
   * Se llama desde dos lados: al abrir la app (para la persona que entró) y
   * desde `/api/cron/reminders` (para todos). La deduplicación por
   * `dedupeKey` hace que las dos vías convivan sin pisarse.
   */
  async generateReminders(onlyPatientId?: string): Promise<number> {
    const target = new Date()
    target.setDate(target.getDate() + REMINDER_DAYS_AHEAD)
    const targetDate = toISODate(target)

    const appointments =
      await this.appointmentRepository.findScheduledOn(targetDate)

    const pending = onlyPatientId
      ? appointments.filter((a) => a.patientId === onlyPatientId)
      : appointments

    let created = 0
    for (const appointment of pending) {
      const done = await this.safely(async () => {
        const { patientUserId } = await this.participants(appointment)
        const where = place(appointment)

        return this.push(patientUserId, {
          type: "appointment_reminder",
          title: "Tenés un turno mañana",
          body: `${appointment.doctorName} · ${formatLongDate(appointment.date)} a las ${appointment.time} hs${where ? ` en ${where}` : ""}.`,
          dedupeKey: `reminder:${appointment.id}`,
        })
      })
      if (done) created++
    }

    return created
  }

  // --- Internos ------------------------------------------------------------

  /** Resuelve las cuentas de acceso detrás del paciente y del profesional. */
  private async participants(appointment: Appointment): Promise<{
    patientUserId: string | null
    doctorUserId: string | null
  }> {
    const [patient, medic] = await Promise.all([
      this.patientRepository.findOne(appointment.patientId),
      this.medicRepository.findOne(appointment.doctorId),
    ])

    return {
      patientUserId: patient?.userId ?? null,
      doctorUserId: medic?.userId ?? null,
    }
  }

  private async push(
    userId: string | null,
    data: {
      type: NotificationType
      title: string
      body: string
      dedupeKey: string
    }
  ): Promise<boolean> {
    // Una ficha sin cuenta de acceso asociada no tiene a dónde recibir el aviso.
    if (!userId) return false

    return this.repository.createIfMissing(
      new Notification(
        crypto.randomUUID(),
        userId,
        data.type,
        data.title,
        data.body,
        data.dedupeKey
      )
    )
  }

  /** Un aviso que falla nunca debe voltear la operación que lo originó. */
  private async safely(
    operation: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      return await operation()
    } catch (error) {
      console.error("[notificaciones] no se pudo registrar el aviso:", error)
      return false
    }
  }
}
