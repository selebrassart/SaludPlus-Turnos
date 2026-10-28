"use client"

import {
  CalendarDays,
  CalendarPlus,
  Download,
  MapPin,
  Star,
  X,
} from "lucide-react"
import { appointmentStatusConfig } from "@/lib/appointmentStatus"
import { formatShortMonth, parseISODate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { AppointmentDto } from "@/models/Appointment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildGoogleCalendarUrl } from "@/lib/calendar/googleCalendar"

export default function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  onReview,
  reviewed = false,
}: {
  appointment: AppointmentDto
  onCancel?: () => void
  /** Solo tiene sentido en turnos todavía agendados. */
  onReschedule?: () => void
  /** Se ofrece solo en turnos atendidos que todavía no fueron calificados. */
  onReview?: () => void
  reviewed?: boolean
}) {
  const status = appointmentStatusConfig[appointment.status]
  const canCancel = appointment.status === "scheduled" && onCancel
  const canReschedule = appointment.status === "scheduled" && onReschedule
  const canReview =
    appointment.status === "completed" && onReview && !reviewed

  // La sede se guarda al reservar; los turnos viejos, de antes de que existiera
  // el concepto, no la tienen y por eso simplemente no se muestra.
  const place = [
    appointment.branchName,
    appointment.office && `Consultorio ${appointment.office}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <span className="text-base leading-none font-semibold">
              {parseISODate(appointment.date).getDate()}
            </span>
            <span className="text-[10px] uppercase">
              {formatShortMonth(appointment.date)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{appointment.doctorName}</p>
              <Badge
                variant="outline"
                className={cn("font-normal", status.className)}
              >
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {appointment.specialtyName} · {appointment.time} hs
            </p>
            {place && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {place}
              </p>
            )}
            {appointment.reason && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {appointment.reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {reviewed && appointment.status === "completed" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-current text-warning" />
              Calificado
            </span>
          )}
          {canReview && (
            <Button variant="outline" size="sm" onClick={onReview}>
              <Star data-icon="inline-start" />
              Calificar
            </Button>
          )}
          {appointment.status === "scheduled" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Agregar el turno a mi calendario"
                  />
                }
              >
                <>
                  <CalendarPlus data-icon="inline-start" />
                  <span className="hidden sm:inline">Agendar</span>
                </>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {/* Abre Google Calendar con el turno cargado; queda guardado
                    al confirmar, y los avisos los manda Google. */}
                <DropdownMenuItem
                  render={
                    <a
                      href={buildGoogleCalendarUrl(appointment)}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <CalendarDays />
                  Google Calendar
                </DropdownMenuItem>
                {/* El .ics es un enlace y no un botón porque la descarga la
                    tiene que manejar el navegador. Sirve para Outlook, Apple
                    y el calendario del teléfono. */}
                <DropdownMenuItem
                  render={
                    <a
                      href={`/api/appointments/${appointment.id}/calendar`}
                    />
                  }
                >
                  <Download />
                  Descargar (.ics)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canReschedule && (
            <Button variant="outline" size="sm" onClick={onReschedule}>
              <CalendarDays data-icon="inline-start" />
              Reprogramar
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onCancel}
            >
              <X data-icon="inline-start" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
