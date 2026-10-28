"use client"

import type React from "react"
import { useState } from "react"
import type { BranchDto } from "@/models/Branch"
import type { MedicDto } from "@/models/Medic"
import type { PatientDto } from "@/models/Patient"
import type { SpecialtyDto } from "@/models/Specialty"
import type { Role, UserDto } from "@/models/User"
import {
  DEFAULT_SPECIALTY_ICON,
  resolveSpecialtyIcon,
  specialtyIconOptions,
} from "@/lib/specialtyIcons"
import { calculateAge, todayISODate } from "@/lib/format/date"
import { DEFAULT_SCHEDULE, generateTimeSlots } from "@/lib/bookingSlots"
import { DNI_MAX_DIGITS, formatDni, normalizeDni } from "@/lib/format/dni"
import { MIN_PASSWORD_LENGTH } from "@/validations/UserValidation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type EditableEntity =
  | "users"
  | "patients"
  | "doctors"
  | "specialties"
  | "branches"

export type AdminRecord =
  | PatientDto
  | MedicDto
  | SpecialtyDto
  | UserDto
  | BranchDto

export const editableEntityLabels: Record<EditableEntity, string> = {
  users: "usuario",
  patients: "paciente",
  doctors: "médico",
  specialties: "especialidad",
  branches: "sede",
}

/** Spelled out per entity because the article is gendered in Spanish. */
export const newRecordLabels: Record<EditableEntity, string> = {
  users: "Nuevo usuario",
  patients: "Nuevo paciente",
  doctors: "Nuevo médico",
  specialties: "Nueva especialidad",
  branches: "Nueva sede",
}

/** Valor del select de sede cuando el profesional todavía no tiene una. */
const NO_BRANCH = "__none__"

/**
 * One flat bag of fields shared by the entities. Each form renders only its own
 * subset, and the caller reads only the keys it sent.
 */
export interface RecordFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  dni: string
  birthDate: string
  specialtyId: string
  branchId: string
  office: string
  license: string
  yearsExperience: number
  workDays: number[]
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  slotMinutes: number
  name: string
  description: string
  icon: string
  address: string
  active: boolean
  role: Role
  password: string
}

const emptyValues: RecordFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dni: "",
  birthDate: "",
  specialtyId: "",
  branchId: "",
  office: "",
  license: "",
  yearsExperience: 1,
  workDays: [1, 2, 3, 4, 5],
  startTime: DEFAULT_SCHEDULE.startTime,
  endTime: DEFAULT_SCHEDULE.endTime,
  breakStart: DEFAULT_SCHEDULE.breakStart,
  breakEnd: DEFAULT_SCHEDULE.breakEnd,
  slotMinutes: DEFAULT_SCHEDULE.slotMinutes,
  name: "",
  description: "",
  icon: DEFAULT_SPECIALTY_ICON,
  address: "",
  active: true,
  role: "patient",
  password: "",
}

/** Índice = getDay() de JavaScript: 0 es domingo. */
const weekdayLabels = ["D", "L", "M", "M", "J", "V", "S"]
const weekdayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]

const roleLabels: Record<Role, string> = {
  patient: "Paciente",
  doctor: "Médico",
  admin: "Administrador",
}

function initialValues(
  entity: EditableEntity,
  record: AdminRecord | null
): RecordFormValues {
  if (!record) return emptyValues

  if (entity === "patients") {
    const patient = record as PatientDto
    return {
      ...emptyValues,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dni: formatDni(patient.dni),
      birthDate: patient.birthDate,
    }
  }

  if (entity === "doctors") {
    const medic = record as MedicDto
    return {
      ...emptyValues,
      firstName: medic.firstName,
      lastName: medic.lastName,
      email: medic.email,
      phone: medic.phone,
      specialtyId: medic.specialtyId,
      branchId: medic.branchId,
      office: medic.office,
      license: medic.license,
      yearsExperience: medic.yearsExperience,
      workDays: medic.workDays,
      startTime: medic.startTime,
      endTime: medic.endTime,
      breakStart: medic.breakStart,
      breakEnd: medic.breakEnd,
      slotMinutes: medic.slotMinutes,
    }
  }

  if (entity === "specialties") {
    const specialty = record as SpecialtyDto
    return {
      ...emptyValues,
      name: specialty.name,
      description: specialty.description,
      icon: specialty.icon || DEFAULT_SPECIALTY_ICON,
    }
  }

  if (entity === "branches") {
    const branch = record as BranchDto
    return {
      ...emptyValues,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      active: branch.active,
    }
  }

  const user = record as UserDto
  return {
    ...emptyValues,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export default function RecordFormDialog({
  open,
  onOpenChange,
  entity,
  record,
  specialties,
  branches,
  submitting,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: EditableEntity
  record: AdminRecord | null
  specialties: SpecialtyDto[]
  branches: BranchDto[]
  submitting: boolean
  error: string | null
  onSubmit: (values: RecordFormValues) => void
}) {
  const label = editableEntityLabels[entity]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {record ? "Editar" : "Nuevo"} {label}
          </DialogTitle>
          <DialogDescription>
            {record
              ? "Modificá los datos y guardá los cambios."
              : `Completá el formulario para dar de alta un ${label}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Remounting on entity/record change resets the fields without an
            effect that fights the user's typing. */}
        <RecordForm
          key={`${entity}:${record ? record.id : "new"}`}
          entity={entity}
          record={record}
          specialties={specialties}
          branches={branches}
          submitting={submitting}
          error={error}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function RecordForm({
  entity,
  record,
  specialties,
  branches,
  submitting,
  error,
  onSubmit,
}: {
  entity: EditableEntity
  record: AdminRecord | null
  specialties: SpecialtyDto[]
  branches: BranchDto[]
  submitting: boolean
  error: string | null
  onSubmit: (values: RecordFormValues) => void
}) {
  const [values, setValues] = useState(() => initialValues(entity, record))

  function set<K extends keyof RecordFormValues>(
    key: K,
    value: RecordFormValues[K]
  ) {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  const isPerson = entity === "patients" || entity === "doctors"

  return (
    // `min-h-0` para que el cuerpo pueda achicarse y aparezca el scroll.
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <FieldGroup className="py-4">
          {isPerson && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="firstName">Nombre</FieldLabel>
                  <Input
                    id="firstName"
                    required
                    value={values.firstName}
                    onChange={(event) => set("firstName", event.target.value)}
                    placeholder="Ej. Juan"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Apellido</FieldLabel>
                  <Input
                    id="lastName"
                    required
                    value={values.lastName}
                    onChange={(event) => set("lastName", event.target.value)}
                    placeholder="Ej. Pérez"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <Input
                  id="phone"
                  value={values.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="+54 11 0000-0000"
                />
              </Field>
            </>
          )}

          {entity === "patients" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dni">DNI</FieldLabel>
                <Input
                  id="dni"
                  required
                  inputMode="numeric"
                  value={values.dni}
                  onChange={(event) =>
                    // Se puntea mientras se escribe, pero se guarda sin puntos.
                    set(
                      "dni",
                      formatDni(
                        normalizeDni(event.target.value).slice(0, DNI_MAX_DIGITS)
                      )
                    )
                  }
                  placeholder="00.000.000"
                />
                <FieldDescription>
                  Entre 7 y {DNI_MAX_DIGITS} dígitos, sin letras.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
                <Input
                  id="birthDate"
                  type="date"
                  required
                  max={todayISODate()}
                  value={values.birthDate}
                  onChange={(event) => set("birthDate", event.target.value)}
                />
                <FieldDescription>
                  {values.birthDate
                    ? `Edad: ${calculateAge(values.birthDate)} años`
                    : "La edad se calcula a partir de esta fecha."}
                </FieldDescription>
              </Field>
            </div>
          )}

          {entity === "doctors" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="specialtyId">Especialidad</FieldLabel>
                  {/* Se elige del catálogo, nunca se tipea: un nombre libre que
                      no coincidía dejaba al médico sin especialidad asociada. */}
                  <Select
                    value={values.specialtyId}
                    onValueChange={(value) => set("specialtyId", value ?? "")}
                  >
                    <SelectTrigger id="specialtyId" className="w-full">
                      <SelectValue>
                        {specialties.find(
                          (specialty) => specialty.id === values.specialtyId
                        )?.name ?? "Sin asignar"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="license">Matrícula</FieldLabel>
                  <Input
                    id="license"
                    value={values.license}
                    onChange={(event) => set("license", event.target.value)}
                    placeholder="MN 00000"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="branchId">Sede</FieldLabel>
                  <Select
                    value={values.branchId || NO_BRANCH}
                    onValueChange={(value) =>
                      set("branchId", value === NO_BRANCH ? "" : (value ?? ""))
                    }
                  >
                    <SelectTrigger id="branchId" className="w-full">
                      <SelectValue>
                        {branches.find((branch) => branch.id === values.branchId)
                          ?.name ?? "Sin asignar"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={NO_BRANCH}>Sin asignar</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                            {!branch.active && " (inactiva)"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="yearsExperience">
                    Años de experiencia
                  </FieldLabel>
                  <Input
                    id="yearsExperience"
                    type="number"
                    min={0}
                    max={70}
                    value={values.yearsExperience}
                    onChange={(event) =>
                      set("yearsExperience", Number(event.target.value))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="office">Consultorio</FieldLabel>
                  <Input
                    id="office"
                    value={values.office}
                    onChange={(event) => set("office", event.target.value)}
                    placeholder="Ej. 101"
                    disabled={!values.branchId}
                  />
                  <FieldDescription>
                    {values.branchId
                      ? "El número de consultorio dentro de esa sede."
                      : "Elegí una sede para poder asignar consultorio."}
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel>Días de atención</FieldLabel>
                {/* Ya no es decorativo: el calendario de reserva bloquea los días
                    que no estén marcados acá. */}
                <div className="flex gap-1.5">
                  {weekdayLabels.map((label, day) => {
                    const active = values.workDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={active}
                        aria-label={weekdayNames[day]}
                        onClick={() =>
                          set(
                            "workDays",
                            active
                              ? values.workDays.filter((d) => d !== day)
                              : [...values.workDays, day].sort()
                          )
                        }
                        className={
                          active
                            ? "size-9 rounded-lg border border-primary bg-primary text-sm font-medium text-primary-foreground"
                            : "size-9 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:border-primary/40"
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <FieldDescription>
                  {values.workDays.length
                    ? "Los pacientes solo van a poder reservar en estos días."
                    : "Sin días marcados nadie puede reservar con este profesional."}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Jornada de atención</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">Abre</span>
                    <Input
                      type="time"
                      value={values.startTime}
                      onChange={(event) => set("startTime", event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">Cierra</span>
                    <Input
                      type="time"
                      value={values.endTime}
                      onChange={(event) => set("endTime", event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">Corte</span>
                    <Input
                      type="time"
                      value={values.breakStart}
                      onChange={(event) => set("breakStart", event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">Retoma</span>
                    <Input
                      type="time"
                      value={values.breakEnd}
                      onChange={(event) => set("breakEnd", event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">Consulta</span>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      step={5}
                      value={values.slotMinutes}
                      onChange={(event) =>
                        set("slotMinutes", Number(event.target.value))
                      }
                    />
                    <span className="text-muted-foreground">min</span>
                  </label>
                </div>
                <FieldDescription>
                  {/* La cuenta se muestra en vivo: es la forma más directa de ver
                      que una jornada mal cargada deja al profesional sin turnos. */}
                  {(() => {
                    const total = generateTimeSlots(values).length
                    if (total === 0) {
                      return "Con esta jornada no entra ningún turno: revisá los horarios."
                    }
                    return `${total} ${total === 1 ? "turno" : "turnos"} por día de atención. Dejá el corte vacío para jornada continua.`
                  })()}
                </FieldDescription>
              </Field>
            </>
          )}

          {entity === "specialties" && (
            <>
              <Field>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input
                  id="name"
                  required
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Ej. Cardiología"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                <Textarea
                  id="description"
                  required
                  rows={3}
                  value={values.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="Atención integral del corazón y el sistema circulatorio."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="icon">Ícono</FieldLabel>
                <Select
                  value={values.icon}
                  onValueChange={(value) =>
                    set("icon", value ?? DEFAULT_SPECIALTY_ICON)
                  }
                >
                  <SelectTrigger id="icon" className="w-full">
                    <SelectValue>{values.icon}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {specialtyIconOptions.map((option) => {
                        const Icon = resolveSpecialtyIcon(option)
                        return (
                          <SelectItem key={option} value={option}>
                            <Icon className="size-4" />
                            {option}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {entity === "branches" && (
            <>
              <Field>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input
                  id="name"
                  required
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Ej. Sede Central"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Dirección</FieldLabel>
                <Input
                  id="address"
                  required
                  value={values.address}
                  onChange={(event) => set("address", event.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <Input
                  id="phone"
                  value={values.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="+54 11 0000-0000"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="active">Estado</FieldLabel>
                <Select
                  value={values.active ? "active" : "inactive"}
                  onValueChange={(value) => set("active", value === "active")}
                >
                  <SelectTrigger id="active" className="w-full">
                    <SelectValue>
                      {values.active ? "Activa" : "Inactiva"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Una sede inactiva deja de ofrecerse al reservar, pero conserva
                  los turnos que ya se atendieron ahí.
                </FieldDescription>
              </Field>
            </>
          )}

          {entity === "users" && (
            <>
              <Field>
                <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
                <Input
                  id="name"
                  required
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role">Rol</FieldLabel>
                <Select
                  value={values.role}
                  onValueChange={(value) =>
                    set("role", (value as Role) ?? "patient")
                  }
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue>{roleLabels[values.role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.keys(roleLabels) as Role[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {roleLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {!record && (
                <Field>
                  <FieldLabel htmlFor="password">Contraseña inicial</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={values.password}
                    onChange={(event) => set("password", event.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              )}
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          }
        />
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner data-icon="inline-start" />}
          {record ? "Guardar cambios" : "Crear registro"}
        </Button>
      </DialogFooter>
    </form>
  )
}
