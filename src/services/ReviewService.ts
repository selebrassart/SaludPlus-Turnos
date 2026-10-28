import "server-only"
import { Review, type RatingSummary, type ReviewInput } from "@/models/Review"
import type { SessionUser } from "@/models/User"
import type { AppointmentRepository } from "@/repository/AppointmentRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { ReviewRepository } from "@/repository/ReviewRepository"
import type { NotificationService } from "./NotificationService"
import type { PatientService } from "./PatientService"

export class ReviewService {
  private repository: ReviewRepository
  private appointmentRepository: AppointmentRepository
  private medicRepository: MedicRepository
  private patientService: PatientService
  private notificationService: NotificationService

  constructor(
    repository: ReviewRepository,
    appointmentRepository: AppointmentRepository,
    medicRepository: MedicRepository,
    patientService: PatientService,
    notificationService: NotificationService
  ) {
    this.repository = repository
    this.appointmentRepository = appointmentRepository
    this.medicRepository = medicRepository
    this.patientService = patientService
    this.notificationService = notificationService
  }

  /**
   * Reseñas de un profesional, de la más nueva a la más vieja.
   *
   * Devuelve las entidades; es el controller el que las convierte al DTO
   * público, sin identidad del paciente.
   */
  async listForDoctor(doctorId: string): Promise<Review[]> {
    const reviews = await this.repository.findByDoctorId(doctorId)
    return [...reviews].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }

  /**
   * Promedio y cantidad, calculados desde la tabla y no desde la copia
   * cacheada en `doctors`: es la fuente de verdad.
   */
  async summaryForDoctor(doctorId: string): Promise<RatingSummary> {
    return this.repository.summaryForDoctor(doctorId)
  }

  /** Turnos del paciente que ya calificó, para no volver a ofrecerlo. */
  async reviewedAppointmentIds(user: SessionUser): Promise<string[]> {
    const patient = await this.patientService.findByUserId(user.id)
    if (!patient) return []
    return this.repository.findAppointmentIdsByPatient(patient.id)
  }

  /**
   * Solo el paciente que fue atendido puede calificar, una sola vez, y
   * únicamente un turno ya completado: son las tres condiciones que hacen que
   * una estrella signifique algo.
   */
  async create(user: SessionUser, input: ReviewInput): Promise<Review> {
    const patient = await this.patientService.findByUserId(user.id)
    if (!patient) {
      throw new Error("No se encontró el perfil del paciente.")
    }

    const appointment = await this.appointmentRepository.findOne(
      input.appointmentId
    )
    if (!appointment) throw new Error("El turno no existe")

    if (appointment.patientId !== patient.id) {
      throw new Error("Solo podés calificar tus propios turnos")
    }

    if (appointment.status !== "completed") {
      throw new Error(
        "Solo se pueden calificar los turnos que ya fueron atendidos"
      )
    }

    const existing = await this.repository.findByAppointmentId(appointment.id)
    if (existing) {
      throw new Error("Este turno ya fue calificado")
    }

    const review = await this.repository.create(
      new Review(
        crypto.randomUUID(),
        appointment.id,
        appointment.doctorId,
        patient.id,
        input.score,
        input.comment ?? null
      )
    )

    await this.refreshDoctorRating(appointment.doctorId)
    await this.notificationService.reviewReceived(appointment, input.score)

    return review
  }

  /**
   * Recalcula el promedio guardado en `doctors`. La fuente de verdad es la
   * tabla `reviews`; la columna es solo una copia para no rehacer el promedio
   * en cada listado.
   */
  async refreshDoctorRating(doctorId: string): Promise<void> {
    const summary = await this.repository.summaryForDoctor(doctorId)
    await this.medicRepository.setRating(
      doctorId,
      summary.average,
      summary.total
    )
  }
}
