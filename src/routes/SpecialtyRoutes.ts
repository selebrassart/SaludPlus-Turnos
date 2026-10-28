"use server"

import * as specialtyController from "@/controllers/SpecialtyController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type { SpecialtyDto, SpecialtyFormInput } from "@/models/Specialty"

export async function getSpecialties(): Promise<SpecialtyDto[]> {
  return specialtyController.findAll()
}

export async function saveSpecialty(
  input: SpecialtyFormInput
): Promise<ActionResult<SpecialtyDto | undefined>> {
  const { id, ...attributes } = input
  return runAction(() =>
    id
      ? specialtyController.update(id, attributes)
      : specialtyController.create(attributes)
  )
}

export async function deleteSpecialty(
  id: string
): Promise<ActionResult<{ id: string } | undefined>> {
  return runAction(() => specialtyController.remove(id))
}
