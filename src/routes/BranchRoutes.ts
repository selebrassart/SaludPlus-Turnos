"use server"

import * as branchController from "@/controllers/BranchController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type { BranchDto, BranchFormInput } from "@/models/Branch"

export async function getBranches(): Promise<BranchDto[]> {
  return branchController.findAll()
}

export async function getActiveBranches(): Promise<BranchDto[]> {
  return branchController.findActive()
}

export async function saveBranch(
  input: BranchFormInput
): Promise<ActionResult<BranchDto | undefined>> {
  const { id, ...attributes } = input
  return runAction(() =>
    id
      ? branchController.update(id, attributes)
      : branchController.create(attributes)
  )
}

export async function deleteBranch(
  id: string
): Promise<ActionResult<{ id: string } | undefined>> {
  return runAction(() => branchController.remove(id))
}
