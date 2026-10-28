"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  HeartPulse,
  MapPin,
  PartyPopper,
  Star,
  Stethoscope,
} from "lucide-react"
import { toast } from "sonner"
import { generateTimeSlots } from "@/lib/bookingSlots"
import { formatLongDate, toISODate } from "@/lib/format/date"
import { getInitials } from "@/lib/format/initials"
import { resolveSpecialtyIcon } from "@/lib/specialtyIcons"
import { cn } from "@/lib/utils"
import type { BranchDto } from "@/models/Branch"
import { medicSchedule, type MedicDto } from "@/models/Medic"
import type { SpecialtyDto } from "@/models/Specialty"
import {
  createAppointment,
  getTakenSlots,
} from "@/routes/AppointmentRoutes"
import RatingBadge from "@/components/RatingBadge"
import DoctorReviewsDialog from "@/components/DoctorReviewsDialog"
import Reveal, { staggerDelay } from "@/components/Reveal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const steps = [
  { id: 1, label: "Sede", icon: MapPin },
  { id: 2, label: "Especialidad", icon: Stethoscope },
  { id: 3, label: "Profesional", icon: HeartPulse },
  { id: 4, label: "Fecha y hora", icon: CalendarDays },
]

export default function BookingStepper({
  branches,
  specialties,
  medics,
  onBooked,
}: {
  branches: BranchDto[]
  specialties: SpecialtyDto[]
  medics: MedicDto[]
  onBooked?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [reviewsFor, setReviewsFor] = useState<MedicDto | null>(null)
  const [branchId, setBranchId] = useState("")
  const [specialtyId, setSpecialtyId] = useState("")
  const [medic, setMedic] = useState<MedicDto | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taken, setTaken] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Los horarios ocupados se piden al elegir profesional y día, para apagarlos
  // antes de que la persona los toque.
  useEffect(() => {
    if (!medic || !date) {
      setTaken([])
      return
    }

    let active = true
    setLoadingSlots(true)

    getTakenSlots(medic.id, toISODate(date))
      .then((slots) => {
        if (active) setTaken(slots)
      })
      .catch(() => {
        // Si falla, se muestran todos: la reserva sigue validando en el servidor.
        if (active) setTaken([])
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [medic, date])

  /** Profesionales que efectivamente atienden en la sede elegida. */
  const branchMedics = useMemo(
    () => medics.filter((candidate) => candidate.branchId === branchId),
    [medics, branchId]
  )

  /**
   * Solo se ofrecen las especialidades que tienen a alguien atendiendo en esa
   * sede: elegir una para después encontrar la lista vacía es una vía muerta.
   */
  const availableSpecialties = useMemo(() => {
    const ids = new Set(branchMedics.map((candidate) => candidate.specialtyId))
    return specialties.filter((specialty) => ids.has(specialty.id))
  }, [specialties, branchMedics])

  const filteredMedics = useMemo(
    () =>
      branchMedics.filter((candidate) => candidate.specialtyId === specialtyId),
    [branchMedics, specialtyId]
  )

  const branchName = branches.find((branch) => branch.id === branchId)?.name ?? ""

  /** Los horarios salen de la jornada del profesional, no de una lista fija. */
  const timeSlots = useMemo(
    () => (medic ? generateTimeSlots(medicSchedule(medic)) : []),
    [medic]
  )

  const specialtyName =
    specialties.find((specialty) => specialty.id === specialtyId)?.name ?? ""

  function selectBranch(value: string) {
    if (value === branchId) return
    // La especialidad y el profesional elegidos pueden no existir en la sede
    // nueva, así que se descartan en vez de arrastrar una selección inválida.
    setBranchId(value)
    setSpecialtyId("")
    setMedic(null)
  }

  function reset() {
    setStep(1)
    setBranchId("")
    setSpecialtyId("")
    setMedic(null)
    setDate(undefined)
    setTime("")
  }

  useEffect(() => {
    if (time && taken.includes(time)) setTime("")
  }, [taken, time])

  const canContinue =
    (step === 1 && branchId) ||
    (step === 2 && specialtyId) ||
    (step === 3 && medic) ||
    (step === 4 && date && time)

  async function handleContinue() {
    if (step < 4) {
      setStep((current) => current + 1)
      return
    }
    if (!medic || !date || !time) return

    setSaving(true)
    const result = await createAppointment({
      doctorId: medic.id,
      date: toISODate(date),
      time,
    })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo reservar el turno")
      return
    }
    router.refresh()
    setConfirmOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center">
        {steps.map((current, index) => {
          const done = step > current.id
          const active = step === current.id
          return (
            <li
              key={current.id}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-primary/10 text-primary ring-4 ring-primary/10",
                    !done &&
                      !active &&
                      "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-4" /> : current.id}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:block",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {current.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-4",
                    done ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">¿A qué sede vas a ir?</h3>
            <p className="text-sm text-muted-foreground">
              Elegí dónde te queda cómodo atenderte. Después vas a ver solo los
              profesionales que trabajan ahí.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {branches.map((branch, index) => {
              const selected = branchId === branch.id
              return (
                <Reveal key={branch.id} delay={staggerDelay(index, 50)}>
                  <button
                    type="button"
                    onClick={() => selectBranch(branch.id)}
                    className={cn(
                      "lift-on-hover flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left hover:shadow-md",
                      selected
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <MapPin className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {branch.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {branch.address}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {branch.doctorCount}{" "}
                        {branch.doctorCount === 1
                          ? "profesional"
                          : "profesionales"}
                      </span>
                    </span>
                    {selected && (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    )}
                  </button>
                </Reveal>
              )
            })}
          </div>
          {!branches.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay sedes disponibles en este momento.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">
              ¿Qué especialidad necesitás?
            </h3>
            <p className="text-sm text-muted-foreground">
              Elegí el área de atención para tu consulta.
            </p>
          </div>
          <Select
            value={specialtyId}
            onValueChange={(value) => setSpecialtyId(value ?? "")}
          >
            <SelectTrigger className="w-full sm:max-w-sm">
              <SelectValue>
                {specialtyName || "Seleccioná una especialidad"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableSpecialties.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableSpecialties.map((specialty) => {
              const Icon = resolveSpecialtyIcon(specialty.icon)
              const selected = specialtyId === specialty.id
              return (
                <button
                  key={specialty.id}
                  type="button"
                  onClick={() => setSpecialtyId(specialty.id)}
                  className={cn(
                    "group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md",
                    selected
                      ? "border-primary ring-2 ring-primary/15"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold">
                    {specialty.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {specialty.activeDoctors} profesionales
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">Elegí un profesional</h3>
            <p className="text-sm text-muted-foreground">
              {specialtyName} en {branchName}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredMedics.map((candidate, index) => {
              const selected = medic?.id === candidate.id
              return (
                <Reveal key={candidate.id} delay={staggerDelay(index, 50)}>
                  <button
                    type="button"
                    onClick={() => setMedic(candidate)}
                    className={cn(
                      "lift-on-hover flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left hover:shadow-md",
                      selected
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <Avatar className="size-14">
                      <AvatarImage
                        src={candidate.avatar}
                        alt={candidate.displayName}
                      />
                      <AvatarFallback>
                        {getInitials(candidate.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {candidate.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.specialtyName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <RatingBadge
                          rating={candidate.rating}
                          reviewCount={candidate.reviewCount}
                          showCount={false}
                        />
                        <span aria-hidden>·</span>
                        <span>{candidate.yearsExperience} años exp.</span>
                      </div>
                      {candidate.office && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Consultorio {candidate.office}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    )}
                  </button>

                  {/* Fuera del botón de selección: un botón dentro de otro
                      botón es HTML inválido, y el navegador decide solo cuál
                      de los dos recibe el clic. */}
                  <button
                    type="button"
                    onClick={() => setReviewsFor(candidate)}
                    className="mt-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Star className="size-3.5" />
                    {candidate.reviewCount > 0
                      ? `Ver ${candidate.reviewCount} ${candidate.reviewCount === 1 ? "reseña" : "reseñas"}`
                      : "Ver ficha"}
                  </button>
                </Reveal>
              )
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">Elegí fecha y horario</h3>
            <p className="text-sm text-muted-foreground">
              Turnos disponibles con {medic?.displayName}.
            </p>
          </div>
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
                  // Antes se bloqueaba el domingo y nada más, así que se podía
                  // reservar con alguien un día que no atiende.
                  return !medic?.workDays.includes(candidate.getDay())
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
                {timeSlots.map((slot, index) => {
                  const selected = time === slot
                  const busy = taken.includes(slot)
                  return (
                    <Reveal key={slot} delay={staggerDelay(index, 20, 240)}>
                      <button
                        type="button"
                        disabled={!date || busy || loadingSlots}
                        title={busy ? "Horario ya reservado" : undefined}
                        onClick={() => setTime(slot)}
                        className={cn(
                          "w-full rounded-lg border px-2 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
                          busy && "line-through"
                        )}
                      >
                        {slot}
                      </button>
                    </Reveal>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1}
        >
          <ArrowLeft data-icon="inline-start" />
          Atrás
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue || saving}>
          {step === 4
            ? saving
              ? "Confirmando..."
              : "Confirmar turno"
            : "Continuar"}
          {step === 4 ? (
            <Check data-icon="inline-end" />
          ) : (
            <ArrowRight data-icon="inline-end" />
          )}
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            reset()
            onBooked?.()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper className="size-7" />
            </div>
            <DialogTitle className="text-center">
              ¡Turno confirmado!
            </DialogTitle>
            <DialogDescription className="text-center">
              Te enviamos los detalles por correo electrónico. Podés verlo en{" "}
              <span className="font-medium text-foreground">Mis turnos</span>.
            </DialogDescription>
          </DialogHeader>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarImage src={medic?.avatar} alt="" />
                  <AvatarFallback>
                    {medic ? getInitials(medic.displayName) : ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{medic?.displayName}</p>
                  <Badge variant="secondary" className="mt-0.5 font-normal">
                    {specialtyName}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary" />
                  {date ? formatLongDate(toISODate(date)) : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />
                  {time} hs
                </span>
              </div>
            </CardContent>
          </Card>
          <DialogFooter>
            <DialogClose render={<Button className="w-full">Listo</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoctorReviewsDialog
        medic={reviewsFor}
        open={reviewsFor !== null}
        onOpenChange={(open) => {
          if (!open) setReviewsFor(null)
        }}
      />
    </div>
  )
}
