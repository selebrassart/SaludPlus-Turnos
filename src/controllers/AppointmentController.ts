import "server-only"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import {
  toAppointmentDto,
  type AppointmentDto,
  type AppointmentResult,
} from "@/models/Appointment"
import { appointmentService } from "@/services/container"
import {
  sanitizeAppointmentInput,
  sanitizeAppointmentStatus,
  sanitizeReschedule,
} from "@/validations/AppointmentValidation"

export async function findAll(): Promise<AppointmentDto[]> {
  const user = await requireUser()
  const appointments = await appointmentService.findAllForUser(user)
  return appointments.map(toAppointmentDto)
}

export async function takenSlots(
  doctorId: string,
  date: string
): Promise<string[]> {
  // Se pasa el usuario para que el calendario también deshabilite los
  // horarios que esta persona ya tiene ocupados con otro profesional.
  const user = await requireUser()
  return appointmentService.takenSlots(doctorId, date, user)
}

export async function create(input: unknown): Promise<AppointmentResult> {
  const user = await requireUser()
  const result = await appointmentService.create(user, sanitizeAppointmentInput(input))
  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath("/")
  return {
    ok: true,
    appointment: result.appointment
      ? toAppointmentDto(result.appointment)
      : undefined,
  }
}

export async function reschedule(
  id: string,
  date: unknown,
  time: unknown
): Promise<AppointmentResult> {
  const user = await requireUser()
  const slot = sanitizeReschedule(date, time)
  const result = await appointmentService.reschedule(
    user,
    id,
    slot.date,
    slot.time
  )
  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath("/")
  return {
    ok: true,
    appointment: result.appointment
      ? toAppointmentDto(result.appointment)
      : undefined,
  }
}

export async function cancel(id: string): Promise<void> {
  const user = await requireUser()
  await appointmentService.cancel(user, id)
  revalidatePath("/")
}

export async function setStatus(id: string, status: unknown): Promise<void> {
  const user = await requireUser()
  await appointmentService.setStatus(user, id, sanitizeAppointmentStatus(status))
  revalidatePath("/")
}

export async function saveNotes(id: string, notes: string): Promise<void> {
  const user = await requireUser()
  await appointmentService.saveNotes(user, id, notes)
  revalidatePath("/")
}
