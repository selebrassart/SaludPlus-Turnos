"use client"

import { useEffect, useState } from "react"
import { Briefcase, MapPin, MessageSquareOff, Stethoscope } from "lucide-react"
import { formatLongDate } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"
import type { MedicDto } from "@/models/Medic"
import { MAX_SCORE, type PublicReviewDto, type RatingSummary } from "@/models/Review"
import StarRating from "@/components/StarRating"
import { getDoctorReviews } from "@/routes/ReviewRoutes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

export default function DoctorReviewsDialog({
  medic,
  open,
  onOpenChange,
}: {
  medic: MedicDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{medic ? medic.displayName : "Profesional"}</DialogTitle>
          <DialogDescription>
            Opiniones de pacientes que ya se atendieron.
          </DialogDescription>
        </DialogHeader>

        {/* Remontar al cambiar de profesional descarta las reseñas del
            anterior, que si no quedarían en pantalla mientras cargan las
            nuevas. */}
        {medic && <DoctorReviews key={medic.id} medic={medic} />}
      </DialogContent>
    </Dialog>
  )
}

function DoctorReviews({ medic }: { medic: MedicDto }) {
  const [data, setData] = useState<{
    summary: RatingSummary
    reviews: PublicReviewDto[]
  } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    getDoctorReviews(medic.id)
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setError(true)
      })

    return () => {
      active = false
    }
  }, [medic.id])

  return (
    <DialogBody>
      <div className="flex flex-col gap-5 py-1">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            {medic.avatar ? (
              <AvatarImage src={medic.avatar} alt={medic.displayName} />
            ) : null}
            <AvatarFallback className="bg-accent text-accent-foreground">
              {getInitials(medic.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="size-3.5" />
                {medic.specialtyName}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5" />
                {medic.yearsExperience}{" "}
                {medic.yearsExperience === 1 ? "año" : "años"}
              </span>
            </div>
            {medic.branchName && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {medic.branchName}
                {medic.office && ` · Consultorio ${medic.office}`}
              </span>
            )}
          </div>
        </div>

        <Summary data={data} error={error} />

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las reseñas. Probá de nuevo en un momento.
            </AlertDescription>
          </Alert>
        ) : !data ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner />
            Cargando reseñas...
          </div>
        ) : (
          <ReviewList reviews={data.reviews} />
        )}
      </div>
    </DialogBody>
  )
}

function Summary({
  data,
  error,
}: {
  data: { summary: RatingSummary; reviews: PublicReviewDto[] } | null
  error: boolean
}) {
  if (error || !data) return null

  const { average, total } = data.summary

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Todavía no tiene calificaciones. No se muestra una nota inventada: la
        primera aparece cuando alguien se atiende y la deja.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          de {MAX_SCORE}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <StarRating score={Math.round(average)} />
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "opinión" : "opiniones"}
          {/* Con muy pocas opiniones el promedio dice poco, y callarlo sería
              dejar que un 5.0 de una sola persona parezca un 5.0 de cuarenta. */}
          {total < 3 && " · todavía son pocas"}
        </span>
      </div>
    </div>
  )
}

function ReviewList({ reviews }: { reviews: PublicReviewDto[] }) {
  if (reviews.length === 0) return null

  const conComentario = reviews.filter((review) => review.comment?.trim())

  if (conComentario.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
        <MessageSquareOff className="size-4 shrink-0" />
        Las calificaciones que tiene no vinieron con comentario.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {conComentario.map((review) => (
        <li
          key={review.id}
          className="rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <StarRating score={review.score} size="size-3.5" />
            <span className="text-xs text-muted-foreground">
              {formatLongDate(review.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm whitespace-pre-line">{review.comment}</p>
          {/* Sin nombre a propósito: decir quién la escribió revelaría que esa
              persona es paciente de este profesional. */}
          <Badge variant="secondary" className="mt-2 font-normal">
            Paciente atendido
          </Badge>
        </li>
      ))}
    </ul>
  )
}
