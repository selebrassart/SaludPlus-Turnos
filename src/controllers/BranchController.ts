import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser } from "@/lib/auth/session"
import { toBranchDto, type BranchDto } from "@/models/Branch"
import { branchService } from "@/services/container"
import { sanitizeBranchInput } from "@/validations/BranchValidation"

export async function findAll(): Promise<BranchDto[]> {
  await requireUser()
  const branches = await branchService.findAll()
  return branches.map(toBranchDto)
}

/** Lo que se le ofrece al paciente al reservar: solo sedes en servicio. */
export async function findActive(): Promise<BranchDto[]> {
  await requireUser()
  const branches = await branchService.findActive()
  return branches.map(toBranchDto)
}

export async function create(input: unknown): Promise<BranchDto> {
  await requireAdmin()
  const branch = await branchService.create(sanitizeBranchInput(input))
  revalidatePath("/")
  return toBranchDto(branch)
}

export async function update(
  id: string,
  input: unknown
): Promise<BranchDto | undefined> {
  await requireAdmin()
  const branch = await branchService.update(id, sanitizeBranchInput(input))
  revalidatePath("/")
  return branch ? toBranchDto(branch) : undefined
}

export async function remove(id: string): Promise<{ id: string } | undefined> {
  await requireAdmin()
  const result = await branchService.remove(id)
  revalidatePath("/")
  return result
}
