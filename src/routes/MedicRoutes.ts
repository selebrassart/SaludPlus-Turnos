"use server"

import * as medicController from "@/controllers/MedicController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type { MedicDto, MedicFormInput } from "@/models/Medic"

export async function getMedics(): Promise<MedicDto[]> {
  return medicController.findAll()
}

export async function getMyMedicProfile(): Promise<MedicDto | undefined> {
  return medicController.findMine()
}

export async function saveMedic(
  input: MedicFormInput
): Promise<ActionResult<MedicDto | undefined>> {
  const { id, ...attributes } = input
  return runAction(() =>
    id
      ? medicController.update(id, attributes)
      : medicController.create(attributes)
  )
}

export async function deleteMedic(
  id: string
): Promise<ActionResult<{ id: string } | undefined>> {
  return runAction(() => medicController.remove(id))
}
