import type { AppointmentStatus } from "@/models/Appointment"

export const appointmentStatusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Agendado",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  completed: {
    label: "Atendido",
    className: "border-transparent bg-success/15 text-success",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-transparent bg-muted text-muted-foreground",
  },
  absent: {
    label: "Ausente",
    className: "border-transparent bg-destructive/12 text-destructive",
  },
}
