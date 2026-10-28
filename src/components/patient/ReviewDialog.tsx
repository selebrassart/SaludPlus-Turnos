"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AppointmentDto } from "@/models/Appointment"
import { MAX_SCORE, MIN_SCORE } from "@/models/Review"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const scoreLabels: Record<number, string> = {
  1: "Muy malo",
  2: "Malo",
  3: "Regular",
  4: "Bueno",
  5: "Excelente",
}

const scores = Array.from(
  { length: MAX_SCORE - MIN_SCORE + 1 },
  (_, index) => MIN_SCORE + index
)

export default function ReviewDialog({
  appointment,
  open,
  onOpenChange,
  submitting,
  error,
  onSubmit,
}: {
  appointment: AppointmentDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting: boolean
  error: string | null
  onSubmit: (score: number, comment: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calificar la atención</DialogTitle>
          <DialogDescription>
            {appointment
              ? `Tu consulta con ${appointment.doctorName}.`
              : "Contanos cómo fue tu consulta."}
          </DialogDescription>
        </DialogHeader>

        {/* Remontar al cambiar de turno limpia la puntuación anterior. */}
        <ReviewForm
          key={appointment?.id ?? "none"}
          submitting={submitting}
          error={error}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReviewForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean
  error: string | null
  onSubmit: (score: number, comment: string) => void
}) {
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")

  // Al pasar el mouse se previsualiza esa puntuación sin cambiar la elegida.
  const shown = hovered || score

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(score, comment)
      }}
    >
      <div className="flex flex-col gap-5 py-4">
        <Field>
          <FieldLabel>¿Cómo fue la atención?</FieldLabel>
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHovered(0)}
          >
            {scores.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                aria-pressed={score === value}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(0)}
                onClick={() => setScore(value)}
                className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    value <= shown
                      ? "fill-warning text-warning"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
          <FieldDescription>
            {shown ? scoreLabels[shown] : "Elegí de 1 a 5 estrellas."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="comment">Comentario (opcional)</FieldLabel>
          <Textarea
            id="comment"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Contanos cómo fue tu experiencia."
          />
        </Field>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          }
        />
        <Button type="submit" disabled={submitting || score === 0}>
          {submitting && <Spinner data-icon="inline-start" />}
          Enviar calificación
        </Button>
      </DialogFooter>
    </form>
  )
}
