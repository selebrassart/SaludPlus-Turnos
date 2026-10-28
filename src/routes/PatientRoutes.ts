"use server"

import * as patientController from "@/controllers/PatientController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type { PatientDto, PatientFormInput } from "@/models/Patient"

export async function getPatients(): Promise<PatientDto[]> {
  return patientController.findAll()
}

export async function getMyPatientProfile(): Promise<PatientDto | undefined> {
  return patientController.findMine()
}

export async function savePatient(
  input: PatientFormInput
): Promise<ActionResult<PatientDto | undefined>> {
  const { id, ...attributes } = input
  return runAction(() =>
    id
      ? patientController.update(id, attributes)
      : patientController.create(attributes)
  )
}

export async function deletePatient(
  id: string
): Promise<ActionResult<{ id: string } | undefined>> {
  return runAction(() => patientController.remove(id))
}
