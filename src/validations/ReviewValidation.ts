import { MAX_SCORE, MIN_SCORE, type ReviewInput } from "@/models/Review"

const MAX_COMMENT_LENGTH = 500

export function sanitizeReviewInput(raw: unknown): ReviewInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const appointmentId =
    typeof input.appointmentId === "string" ? input.appointmentId.trim() : ""
  if (!appointmentId) throw new Error("Falta indicar el turno a calificar")

  const score = Number(input.score)
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new Error(
      `La calificación debe ser un número entero entre ${MIN_SCORE} y ${MAX_SCORE}`
    )
  }

  const rawComment = typeof input.comment === "string" ? input.comment.trim() : ""
  if (rawComment.length > MAX_COMMENT_LENGTH) {
    throw new Error(
      `El comentario no puede superar los ${MAX_COMMENT_LENGTH} caracteres`
    )
  }

  return {
    appointmentId,
    score,
    comment: rawComment || undefined,
  }
}
