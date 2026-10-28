import { reviews } from "@/lib/db/schema"

export type ReviewRow = typeof reviews.$inferSelect

export { reviews as reviewTable }

export const MIN_SCORE = 1
export const MAX_SCORE = 5

export interface ReviewDto {
  id: string
  appointmentId: string
  doctorId: string
  patientId: string
  score: number
  comment?: string
  createdAt: string
}

export interface ReviewInput {
  appointmentId: string
  score: number
  comment?: string
}

/** Promedio y cantidad de reseñas de un profesional. */
export interface RatingSummary {
  average: number
  total: number
}

export class Review {
  id: string
  appointmentId: string
  doctorId: string
  patientId: string
  score: number
  comment: string | null
  createdAt: Date

  constructor(
    id: string,
    appointmentId: string,
    doctorId: string,
    patientId: string,
    score: number,
    comment: string | null = null,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this.appointmentId = appointmentId
    this.doctorId = doctorId
    this.patientId = patientId
    this.score = score
    this.comment = comment
    this.createdAt = createdAt
  }

  static fromRow(row: ReviewRow): Review {
    return new Review(
      row.id,
      row.appointmentId,
      row.doctorId,
      row.patientId,
      row.score,
      row.comment,
      row.createdAt
    )
  }
}

/**
 * Reseña tal como se muestra a cualquiera, SIN identidad del paciente.
 *
 * En una aplicación de salud, publicar "Juan Pérez calificó al Dr. X" revela
 * que Juan es paciente del Dr. X, y eso es información médica sobre una
 * persona concreta. La opinión es útil; quién la escribió no hace falta.
 */
export interface PublicReviewDto {
  id: string
  score: number
  comment?: string
  createdAt: string
}

export function toPublicReviewDto(review: Review): PublicReviewDto {
  return {
    id: review.id,
    score: review.score,
    comment: review.comment ?? undefined,
    createdAt: review.createdAt.toISOString().slice(0, 10),
  }
}

export function toReviewDto(review: Review): ReviewDto {
  return {
    id: review.id,
    appointmentId: review.appointmentId,
    doctorId: review.doctorId,
    patientId: review.patientId,
    score: review.score,
    comment: review.comment ?? undefined,
    createdAt: review.createdAt.toISOString().slice(0, 10),
  }
}
