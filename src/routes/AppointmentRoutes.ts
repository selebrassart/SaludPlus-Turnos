"use server"

import * as appointmentController from "@/controllers/AppointmentController"
import type {
  AppointmentDto,
  AppointmentInput,
  AppointmentResult,
  AppointmentStatus,
} from "@/models/Appointment"

export async function getAppointments(): Promise<AppointmentDto[]> {
  return appointmentController.findAll()
}

export async function getTakenSlots(
  doctorId: string,
  date: string
): Promise<string[]> {
  return appointmentController.takenSlots(doctorId, date)
}

export async function createAppointment(
  input: AppointmentInput
): Promise<AppointmentResult> {
  return appointmentController.create(input)
}

export async function rescheduleAppointment(
  id: string,
  date: string,
  time: string
): Promise<AppointmentResult> {
  return appointmentController.reschedule(id, date, time)
}

export async function cancelAppointment(id: string): Promise<void> {
  return appointmentController.cancel(id)
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  return appointmentController.setStatus(id, status)
}

export async function saveAppointmentNotes(
  id: string,
  notes: string
): Promise<void> {
  return appointmentController.saveNotes(id, notes)
}
