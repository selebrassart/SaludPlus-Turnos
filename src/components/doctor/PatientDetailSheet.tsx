"use client"

import type React from "react"
import { Clock, Droplet, Mail, Phone, Save, Stethoscope } from "lucide-react"
import { appointmentStatusConfig } from "@/lib/appointmentStatus"
import { calculateAge } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"
import { cn } from "@/lib/utils"
import type { AppointmentDto } from "@/models/Appointment"
import type { PatientDto } from "@/models/Patient"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  )
}

export default function PatientDetailSheet({
  appointment,
  patient,
  notes,
  onNotesChange,
  onOpenChange,
  onSave,
}: {
  appointment: AppointmentDto | null
  patient?: PatientDto
  notes: string
  onNotesChange: (notes: string) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
}) {
  return (
    <Sheet open={!!appointment} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalle del paciente</SheetTitle>
          <SheetDescription>
            Información clínica y observaciones de la consulta.
          </SheetDescription>
        </SheetHeader>

        {appointment && (
          <div className="scroll-area flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="bg-accent text-lg font-semibold text-accent-foreground">
                  {getInitials(appointment.patientName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">
                  {appointment.patientName}
                </p>
                {patient && (
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(patient.birthDate)} años · DNI {patient.dni}
                  </p>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 font-normal",
                    appointmentStatusConfig[appointment.status].className
                  )}
                >
                  {appointmentStatusConfig[appointment.status].label}
                </Badge>
              </div>
            </div>

            {patient && (
              <div className="grid grid-cols-2 gap-3">
                <InfoTile
                  icon={<Mail className="size-4" />}
                  label="Email"
                  value={patient.email}
                />
                <InfoTile
                  icon={<Phone className="size-4" />}
                  label="Teléfono"
                  value={patient.phone}
                />
                <InfoTile
                  icon={<Droplet className="size-4" />}
                  label="Grupo sanguíneo"
                  value={patient.bloodType ?? "—"}
                />
                <InfoTile
                  icon={<Clock className="size-4" />}
                  label="Horario"
                  value={`${appointment.time} hs`}
                />
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="size-4 text-primary" />
                Motivo de consulta
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {appointment.reason}
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Observaciones médicas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="Agregá diagnóstico, indicaciones o notas de seguimiento..."
                className="min-h-32 resize-none"
              />
            </div>
          </div>
        )}

        <SheetFooter>
          <Button onClick={onSave}>
            <Save data-icon="inline-start" />
            Guardar observaciones
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
