"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarCheck,
  CalendarPlus,
  Clock,
  History,
  LayoutDashboard,
  MapPin,
  Stethoscope,
} from "lucide-react"
import { toast } from "sonner"
import { useServerState } from "@/hooks/useServerState"
import { daysUntil, formatLongDate, formatShortDate } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"
import type { AppointmentDto } from "@/models/Appointment"
import type { BranchDto } from "@/models/Branch"
import type { MedicDto } from "@/models/Medic"
import type { SpecialtyDto } from "@/models/Specialty"
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/routes/AppointmentRoutes"
import { saveReview } from "@/routes/ReviewRoutes"
import ConfirmDialog from "@/components/ConfirmDialog"
import CountUp from "@/components/CountUp"
import Reveal, { staggerDelay } from "@/components/Reveal"
import AppointmentCard from "@/components/patient/AppointmentCard"
import BookingStepper from "@/components/patient/BookingStepper"
import RescheduleDialog from "@/components/patient/RescheduleDialog"
import ReviewDialog from "@/components/patient/ReviewDialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function isUpcoming(appointment: AppointmentDto): boolean {
  return appointment.status === "scheduled"
}

function formatCountdown(date: string): string {
  const days = daysUntil(date)
  if (days <= 0) return "hoy"
  if (days === 1) return "1 día"
  return `${days} días`
}

function StatMini({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <Card className="lift-on-hover">
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </span>
        <div>
          <p className="text-2xl leading-none font-semibold">
            <CountUp value={value} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PatientView({
  patientName,
  appointments: initialAppointments,
  specialties,
  medics,
  branches,
  reviewedAppointmentIds,
}: {
  patientName: string
  appointments: AppointmentDto[]
  specialties: SpecialtyDto[]
  medics: MedicDto[]
  branches: BranchDto[]
  /** Turnos que esta persona ya calificó: no se vuelve a ofrecer el botón. */
  reviewedAppointmentIds: string[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState("inicio")
  const [appointments, setAppointments] = useServerState(initialAppointments)
  const [toCancel, setToCancel] = useState<AppointmentDto | null>(null)
  const [toReview, setToReview] = useState<AppointmentDto | null>(null)
  const [toReschedule, setToReschedule] = useState<AppointmentDto | null>(null)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [savingReschedule, setSavingReschedule] = useState(false)

  const [reviewError, setReviewError] = useState<string | null>(null)
  const [savingReview, setSavingReview] = useState(false)
  const reviewed = useMemo(
    () => new Set(reviewedAppointmentIds),
    [reviewedAppointmentIds]
  )

  async function submitReschedule(date: string, time: string) {
    if (!toReschedule) return

    setSavingReschedule(true)
    setRescheduleError(null)
    const result = await rescheduleAppointment(toReschedule.id, date, time)
    setSavingReschedule(false)

    if (!result.ok) {
      setRescheduleError(result.error ?? "No se pudo reprogramar el turno")
      return
    }
    setToReschedule(null)
    toast.success("Turno reprogramado")
    router.refresh()
  }

  async function submitReview(score: number, comment: string) {
    if (!toReview) return

    setSavingReview(true)
    setReviewError(null)
    const result = await saveReview({
      appointmentId: toReview.id,
      score,
      comment: comment || undefined,
    })
    setSavingReview(false)

    if (!result.ok) {
      setReviewError(result.error)
      return
    }
    setToReview(null)
    toast.success("¡Gracias! Tu calificación fue registrada.")
    router.refresh()
  }

  const upcoming = useMemo(
    () =>
      appointments
        .filter(isUpcoming)
        .sort((left, right) => left.date.localeCompare(right.date)),
    [appointments]
  )
  const past = useMemo(
    () =>
      appointments
        .filter((appointment) => !isUpcoming(appointment))
        .sort((left, right) => right.date.localeCompare(left.date)),
    [appointments]
  )
  const nextAppointment = upcoming[0]

  async function confirmCancel() {
    if (!toCancel) return
    const target = toCancel
    setAppointments((previous) =>
      previous.map((appointment) =>
        appointment.id === target.id
          ? { ...appointment, status: "cancelled" }
          : appointment
      )
    )
    setToCancel(null)
    try {
      await cancelAppointment(target.id)
      toast.success("Turno cancelado", {
        description: `${target.specialtyName} · ${formatShortDate(target.date)}`,
      })
    } catch {
      toast.error("No se pudo cancelar el turno")
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Hola, {patientName}
        </h1>
        <p className="text-muted-foreground">
          Gestioná tus turnos médicos de forma simple y rápida.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="inicio">
            <LayoutDashboard data-icon="inline-start" />
            Inicio
          </TabsTrigger>
          <TabsTrigger value="reservar">
            <CalendarPlus data-icon="inline-start" />
            Reservar
          </TabsTrigger>
          <TabsTrigger value="turnos">
            <History data-icon="inline-start" />
            Mis turnos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden border-primary/20 lg:col-span-2">
              <div className="flex items-center justify-between bg-primary/10 px-6 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CalendarCheck className="size-4" />
                  Próximo turno
                </span>
                {nextAppointment && (
                  <Badge className="bg-primary text-primary-foreground">
                    En {formatCountdown(nextAppointment.date)}
                  </Badge>
                )}
              </div>
              <CardContent className="pt-5">
                {nextAppointment ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-14">
                        <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
                          {getInitials(nextAppointment.doctorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {nextAppointment.doctorName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {nextAppointment.specialtyName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {nextAppointment.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-4 text-sm sm:text-right">
                      <span className="flex items-center gap-2 font-medium sm:justify-end">
                        <Clock className="size-4 text-primary" />
                        {formatLongDate(nextAppointment.date)}
                      </span>
                      <span className="text-2xl font-semibold tracking-tight">
                        {nextAppointment.time} hs
                      </span>
                      {(nextAppointment.branchName ||
                        nextAppointment.office) && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                          <MapPin className="size-3.5" />
                          {[
                            nextAppointment.branchName,
                            nextAppointment.office &&
                              `Consultorio ${nextAppointment.office}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <Empty className="py-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarPlus />
                      </EmptyMedia>
                      <EmptyTitle>No tenés turnos próximos</EmptyTitle>
                      <EmptyDescription>
                        Reservá tu próxima consulta en segundos.
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={() => setTab("reservar")}>
                      <CalendarPlus data-icon="inline-start" />
                      Reservar turno
                    </Button>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                <StatMini
                  icon={<CalendarCheck className="size-5" />}
                  value={upcoming.length}
                  label="Turnos próximos"
                />
                <StatMini
                  icon={<Stethoscope className="size-5" />}
                  value={
                    past.filter(
                      (appointment) => appointment.status === "completed"
                    ).length
                  }
                  label="Consultas realizadas"
                />
              </div>
              <Card className="flex-1 border-dashed">
                <CardContent className="flex h-full flex-col items-start justify-center gap-3 py-6">
                  <p className="text-sm text-pretty text-muted-foreground">
                    ¿Necesitás ver a un especialista? Reservá un nuevo turno
                    ahora.
                  </p>
                  <Button className="w-full" onClick={() => setTab("reservar")}>
                    <CalendarPlus data-icon="inline-start" />
                    Nueva reserva
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reservar">
          <Card>
            <CardHeader>
              <CardTitle>Reservar un nuevo turno</CardTitle>
              <CardDescription>
                Seguí los pasos para agendar tu consulta médica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingStepper
                branches={branches}
                specialties={specialties}
                medics={medics}
                onBooked={() => setTab("turnos")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="turnos" className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Próximos ({upcoming.length})
            </h2>
            {upcoming.length ? (
              <div className="flex flex-col gap-3">
                {upcoming.map((appointment, index) => (
                  <Reveal key={appointment.id} delay={staggerDelay(index)}>
                    <AppointmentCard
                      appointment={appointment}
                      onCancel={() => setToCancel(appointment)}
                      onReschedule={() => {
                        setRescheduleError(null)
                        setToReschedule(appointment)
                      }}
                      onReview={() => {
                        setReviewError(null)
                        setToReview(appointment)
                      }}
                      reviewed={reviewed.has(appointment.id)}
                    />
                  </Reveal>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No tenés turnos próximos agendados.
                </CardContent>
              </Card>
            )}
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Historial ({past.length})
            </h2>
            <div className="flex flex-col gap-3">
              {past.map((appointment, index) => (
                <Reveal key={appointment.id} delay={staggerDelay(index)}>
                  <AppointmentCard
                    appointment={appointment}
                    onReview={() => {
                      setReviewError(null)
                      setToReview(appointment)
                    }}
                    reviewed={reviewed.has(appointment.id)}
                  />
                </Reveal>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <RescheduleDialog
        appointment={toReschedule}
        medic={medics.find(
          (candidate) => candidate.id === toReschedule?.doctorId
        )}
        open={!!toReschedule}
        onOpenChange={(open) => {
          if (!open) {
            setToReschedule(null)
            setRescheduleError(null)
          }
        }}
        submitting={savingReschedule}
        error={rescheduleError}
        onSubmit={submitReschedule}
      />

      <ReviewDialog
        appointment={toReview}
        open={!!toReview}
        onOpenChange={(open) => {
          if (!open) {
            setToReview(null)
            setReviewError(null)
          }
        }}
        submitting={savingReview}
        error={reviewError}
        onSubmit={submitReview}
      />

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="¿Cancelar este turno?"
        description={
          toCancel
            ? `${toCancel.specialtyName} con ${toCancel.doctorName} el ${formatShortDate(toCancel.date)} a las ${toCancel.time} hs. Esta acción no se puede deshacer.`
            : ""
        }
        cancelLabel="Volver"
        confirmLabel="Sí, cancelar turno"
        onConfirm={confirmCancel}
      />
    </div>
  )
}
