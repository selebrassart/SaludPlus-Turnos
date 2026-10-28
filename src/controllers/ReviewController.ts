import "server-only"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import {
  toPublicReviewDto,
  toReviewDto,
  type PublicReviewDto,
  type RatingSummary,
  type ReviewDto,
} from "@/models/Review"
import { reviewService } from "@/services/container"
import { sanitizeReviewInput } from "@/validations/ReviewValidation"

/** Turnos que el paciente ya calificó, para no volver a ofrecer el botón. */
export async function findMyReviewedAppointmentIds(): Promise<string[]> {
  const user = await requireUser()
  return reviewService.reviewedAppointmentIds(user)
}

/**
 * Reseñas de un profesional, para mostrarlas en su ficha.
 *
 * Pide sesión —no es información pública de internet— pero no filtra por rol:
 * un paciente que está por elegir profesional necesita verlas tanto como el
 * administrador.
 */
export async function findForDoctor(doctorId: unknown): Promise<{
  summary: RatingSummary
  reviews: PublicReviewDto[]
}> {
  await requireUser()

  if (typeof doctorId !== "string" || !doctorId) {
    return { summary: { average: 0, total: 0 }, reviews: [] }
  }

  const [summary, reviews] = await Promise.all([
    reviewService.summaryForDoctor(doctorId),
    reviewService.listForDoctor(doctorId),
  ])

  return { summary, reviews: reviews.map(toPublicReviewDto) }
}

export async function create(input: unknown): Promise<ReviewDto> {
  const user = await requireUser()
  const review = await reviewService.create(user, sanitizeReviewInput(input))
  revalidatePath("/")
  return toReviewDto(review)
}
