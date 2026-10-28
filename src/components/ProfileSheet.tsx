"use client"

import {
  Award,
  CalendarCheck,
  CalendarDays,
  Clock,
  Droplet,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Star,
  Stethoscope,
  Users,
} from "lucide-react"
import type { ProfileSummary } from "@/models/Profile"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { calculateAge, formatShortDate } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"

const roleLabels: Record<ProfileSummary["role"], string> = {
  patient: "Paciente",
  doctor: "Profesional médico",
  admin: "Administrador",
}

const weekdayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-medium tracking-wide uppercase">
          {label}
        </span>
      </div>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function ProfileSheet({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileSummary
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="scroll-area w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mi perfil</SheetTitle>
          <SheetDescription>
            Resumen de tu cuenta y actividad en SaludPlus.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-8">
          <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4">
            <Avatar className="size-16">
              {profile.image ? (
                <AvatarImage src={profile.image} alt={profile.name} />
              ) : null}
              <AvatarFallback className="bg-accent text-lg font-semibold text-accent-foreground">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-lg font-semibold">{profile.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {profile.email}
              </p>
              <Badge variant="secondary" className="mt-1.5 font-normal">
                {roleLabels[profile.role]}
              </Badge>
            </div>
          </div>

          {profile.patient && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  icon={CalendarDays}
                  label="Turnos"
                  value={profile.patient.total}
                />
                <Stat
                  icon={Clock}
                  label="Próximos"
                  value={profile.patient.upcoming}
                />
                <Stat
                  icon={CalendarCheck}
                  label="Atendidos"
                  value={profile.patient.completed}
                />
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold">Datos personales</p>
                <InfoRow
                  icon={IdCard}
                  label="DNI"
                  value={profile.patient.dni}
                />
                <InfoRow
                  icon={Phone}
                  label="Teléfono"
                  value={profile.patient.phone}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Nacimiento"
                  value={
                    profile.patient.birthDate !== "—"
                      ? `${formatShortDate(profile.patient.birthDate)} · ${calculateAge(
                          profile.patient.birthDate
                        )} años`
                      : "—"
                  }
                />
                {profile.patient.bloodType && (
                  <InfoRow
                    icon={Droplet}
                    label="Grupo sanguíneo"
                    value={profile.patient.bloodType}
                  />
                )}
                <InfoRow
                  icon={Award}
                  label="Miembro desde"
                  value={
                    profile.patient.memberSince !== "—"
                      ? formatShortDate(profile.patient.memberSince)
                      : "—"
                  }
                />
              </div>
            </>
          )}

          {profile.doctor && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  icon={CalendarDays}
                  label="Hoy"
                  value={profile.doctor.todayTotal}
                />
                <Stat
                  icon={CalendarCheck}
                  label="Atendidos"
                  value={profile.doctor.todayCompleted}
                />
                <Stat
                  icon={Clock}
                  label="Pendientes"
                  value={profile.doctor.todayPending}
                />
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold">Datos profesionales</p>
                <InfoRow
                  icon={Stethoscope}
                  label="Especialidad"
                  value={profile.doctor.specialtyName}
                />
                <InfoRow
                  icon={IdCard}
                  label="Matrícula"
                  value={profile.doctor.license}
                />
                <InfoRow
                  icon={Star}
                  label="Valoración"
                  value={
                    profile.doctor.reviewCount > 0
                      ? `${profile.doctor.rating.toFixed(1)} / 5.0 · ${
                          profile.doctor.reviewCount
                        } ${profile.doctor.reviewCount === 1 ? "reseña" : "reseñas"}`
                      : "Sin calificaciones todavía"
                  }
                />
                <InfoRow
                  icon={MapPin}
                  label="Sede"
                  value={
                    profile.doctor.office
                      ? `${profile.doctor.branchName} · Consultorio ${profile.doctor.office}`
                      : profile.doctor.branchName
                  }
                />
                <InfoRow
                  icon={Award}
                  label="Experiencia"
                  value={`${profile.doctor.yearsExperience} años`}
                />
                <InfoRow
                  icon={Phone}
                  label="Teléfono"
                  value={profile.doctor.phone}
                />
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Días de atención
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.doctor.workDays.map((d) => (
                      <Badge key={d} variant="outline" className="font-normal">
                        {weekdayShort[d]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {profile.admin && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  icon={Users}
                  label="Pacientes"
                  value={profile.admin.totalPatients}
                />
                <Stat
                  icon={Stethoscope}
                  label="Médicos"
                  value={profile.admin.totalDoctors}
                />
                <Stat
                  icon={Award}
                  label="Especialidades"
                  value={profile.admin.totalSpecialties}
                />
                <Stat
                  icon={CalendarDays}
                  label="Turnos"
                  value={profile.admin.totalAppointments}
                />
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold">Estado del sistema</p>
                <InfoRow
                  icon={CalendarCheck}
                  label="Turnos agendados"
                  value={String(profile.admin.scheduled)}
                />
                <InfoRow icon={Mail} label="Correo" value={profile.email} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
