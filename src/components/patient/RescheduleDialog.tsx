"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock } from "lucide-react"
import { generateTimeSlots } from "@/lib/bookingSlots"
import { formatLongDate, toISODate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { AppointmentDto } from "@/models/Appointment"
import { medicSchedule, type MedicDto } from "@/models/Medic"
import { getTakenSlots } from "@/routes/AppointmentRoutes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

export default function RescheduleDialog({
  appointment,
  medic,
  open,
  onOpenChange,
  submitting,
  error,
  onSubmit,
}: {
  appointment: AppointmentDto | null
  /** Aporta los días que el profesional atiende; puede faltar en datos viejos. */
  medic: MedicDto | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting: boolean
  error: string | null
  onSubmit: (date: string, time: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reprogramar turno</DialogTitle>
          <DialogDescription>
            {appointment
              ? `Elegí la nueva fecha y hora para tu consulta con ${appointment.doctorName}.`
              : "Elegí la nueva fecha y hora."}
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          // Remontar al cambiar de turno descarta la selección del anterior.
          <RescheduleForm
            key={appointment.id}
            appointment={appointment}
            medic={medic}
            submitting={submitting}
            error={error}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RescheduleForm({
  appointment,
  medic,
  submitting,
  error,
  onSubmit,
}: {
  appointment: AppointmentDto
  medic: MedicDto | undefined
  submitting: boolean
  error: string | null
  onSubmit: (date: string, time: string) => void
}) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [taken, setTaken] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (!date) {
      setTaken([])
      return
    }

    let active = true
    setLoadingSlots(true)

    getTakenSlots(appointment.doctorId, toISODate(date))
      .then((slots) => {
        if (!active) return
        // El horario actual del propio turno no cuenta como ocupado: si se
        // cambia solo la fecha, se puede conservar la misma hora.
        setTaken(
          slots.filter(
            (slot) =>
              !(
                toISODate(date) === appointment.date && slot === appointment.time
              )
          )
        )
      })
      .catch(() => {
        if (active) setTaken([])
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [date, appointment])

  useEffect(() => {
    if (time && taken.includes(time)) setTime("")
  }, [taken, time])

  // Sin datos del profesional se usa la jornada por defecto: el servidor
  // valida igual, así que en el peor caso se ofrece un horario que rechaza.
  const timeSlots = useMemo(
    () => generateTimeSlots(medic ? medicSchedule(medic) : undefined),
    [medic]
  )

  const unchanged =
    !!date && toISODate(date) === appointment.date && time === appointment.time

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!date || !time) return
        onSubmit(toISODate(date), time)
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody>
        <div className="flex flex-col gap-4 py-4">
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            Turno actual:{" "}
            <span className="font-medium text-foreground">
              {formatLongDate(appointment.date)} a las {appointment.time} hs
            </span>
          </p>

          <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
            <div className="flex justify-center rounded-xl border border-border bg-card p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(candidate) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  if (candidate < today) return true
                  // Sin datos del profesional se permite cualquier día y decide
                  // el servidor, que es quien tiene la información completa.
                  if (!medic) return false
                  return !medic.workDays.includes(candidate.getDay())
                }}
                className="bg-transparent p-0"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="size-4 text-primary" />
                {date ? formatLongDate(toISODate(date)) : "Seleccioná un día"}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {timeSlots.map((slot) => {
                  const selected = time === slot
                  const busy = taken.includes(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!date || busy || loadingSlots}
                      title={busy ? "Horario ya reservado" : undefined}
                      onClick={() => setTime(slot)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
                        selected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
                        busy && "line-through"
                      )}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {unchanged && (
            <p className="text-sm text-muted-foreground">
              Es el mismo horario que ya tenías: elegí otro para poder guardar.
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          }
        />
        <Button type="submit" disabled={submitting || !date || !time || unchanged}>
          {submitting && <Spinner data-icon="inline-start" />}
          Confirmar cambio
        </Button>
      </DialogFooter>
    </form>
  )
}
