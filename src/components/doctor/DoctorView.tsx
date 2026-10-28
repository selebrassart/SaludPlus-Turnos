"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  UserX,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { useServerState } from "@/hooks/useServerState"
import { appointmentStatusConfig } from "@/lib/appointmentStatus"
import { formatLongDate, todayISODate } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"
import { cn } from "@/lib/utils"
import type { AppointmentDto, AppointmentStatus } from "@/models/Appointment"
import type { PatientDto } from "@/models/Patient"
import {
  saveAppointmentNotes,
  setAppointmentStatus,
} from "@/routes/AppointmentRoutes"
import PatientDetailSheet from "@/components/doctor/PatientDetailSheet"
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

const toneStyles: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  accent: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
}

const statusToastLabels: Partial<Record<AppointmentStatus, string>> = {
  completed: "Paciente marcado como atendido",
  absent: "Paciente marcado como ausente",
}

function KpiCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: keyof typeof toneStyles
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            toneStyles[tone]
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-3xl leading-none font-semibold tracking-tight">
            {value}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DoctorView({
  doctorName,
  specialtyName,
  appointments: initialAppointments,
  patients,
}: {
  doctorName: string
  specialtyName: string
  appointments: AppointmentDto[]
  patients: PatientDto[]
}) {
  const router = useRouter()
  const [appointments, setAppointments] = useServerState(initialAppointments)
  const [selected, setSelected] = useState<AppointmentDto | null>(null)
  const [notes, setNotes] = useState("")

  const stats = useMemo(
    () => ({
      total: appointments.length,
      completed: appointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
      pending: appointments.filter(
        (appointment) => appointment.status === "scheduled"
      ).length,
      absent: appointments.filter(
        (appointment) => appointment.status === "absent"
      ).length,
    }),
    [appointments]
  )

  async function updateStatus(id: string, status: AppointmentStatus) {
    setAppointments((previous) =>
      previous.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment
      )
    )
    try {
      await setAppointmentStatus(id, status)
      toast.success(statusToastLabels[status] ?? "Turno actualizado")
    } catch {
      toast.error("No se pudo actualizar el turno")
    }
    router.refresh()
  }

  function openDetail(appointment: AppointmentDto) {
    setSelected(appointment)
    setNotes(appointment.notes ?? "")
  }

  async function saveNotes() {
    if (!selected) return
    const id = selected.id
    setAppointments((previous) =>
      previous.map((appointment) =>
        appointment.id === id ? { ...appointment, notes } : appointment
      )
    )
    setSelected(null)
    try {
      await saveAppointmentNotes(id, notes)
      toast.success("Observaciones guardadas")
    } catch {
      toast.error("No se pudieron guardar las observaciones")
    }
    router.refresh()
  }

  const selectedPatient = selected
    ? patients.find((patient) => patient.id === selected.patientId)
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          {formatLongDate(todayISODate())}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Agenda del día
        </h1>
        <p className="text-muted-foreground">
          {doctorName}
          {specialtyName ? ` · ${specialtyName}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5" />}
          value={stats.total}
          label="Turnos de hoy"
          tone="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="size-5" />}
          value={stats.completed}
          label="Atendidos"
          tone="success"
        />
        <KpiCard
          icon={<Clock className="size-5" />}
          value={stats.pending}
          label="Pendientes"
          tone="accent"
        />
        <KpiCard
          icon={<UserX className="size-5" />}
          value={stats.absent}
          label="Ausentes"
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Pacientes citados
          </CardTitle>
          <CardDescription>
            Gestioná el estado de cada consulta a lo largo del día.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {appointments.map((appointment) => {
            const status = appointmentStatusConfig[appointment.status]
            const isPending = appointment.status === "scheduled"
            return (
              <div
                key={appointment.id}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center",
                  isPending
                    ? "border-border bg-card"
                    : "border-transparent bg-muted/40"
                )}
              >
                <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-border sm:border-r sm:pr-4">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {appointment.time}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openDetail(appointment)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <Avatar className="size-11">
                    <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
                      {getInitials(appointment.patientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{appointment.patientName}</p>
                      <Badge
                        variant="outline"
                        className={cn("font-normal", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {appointment.reason}
                    </p>
                  </div>
                </button>

                {isPending ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => updateStatus(appointment.id, "completed")}
                    >
                      <CheckCircle2 data-icon="inline-start" />
                      Atendido
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => updateStatus(appointment.id, "absent")}
                    >
                      <UserX data-icon="inline-start" />
                      Ausente
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => openDetail(appointment)}
                  >
                    Ver detalle
                  </Button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <PatientDetailSheet
        appointment={selected}
        patient={selectedPatient}
        notes={notes}
        onNotesChange={setNotes}
        onOpenChange={(open) => !open && setSelected(null)}
        onSave={saveNotes}
      />
    </div>
  )
}
