import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser } from "@/lib/auth/session"
import { toMedicDto, type MedicDto } from "@/models/Medic"
import { medicService } from "@/services/container"
import { sanitizeMedicInput } from "@/validations/MedicValidation"

export async function findAll(): Promise<MedicDto[]> {
  await requireUser()
  const medics = await medicService.findAll()
  return medics.map(toMedicDto)
}

export async function findOne(id: string): Promise<MedicDto | undefined> {
  await requireUser()
  const medic = await medicService.findOne(id)
  return medic ? toMedicDto(medic) : undefined
}

export async function findMine(): Promise<MedicDto | undefined> {
  const user = await requireUser()
  const medic = await medicService.findByUserId(user.id)
  return medic ? toMedicDto(medic) : undefined
}

export async function create(input: unknown): Promise<MedicDto> {
  await requireAdmin()
  const medic = await medicService.create(sanitizeMedicInput(input))
  revalidatePath("/")
  return toMedicDto(medic)
}

export async function update(
  id: string,
  input: unknown
): Promise<MedicDto | undefined> {
  await requireAdmin()
  const medic = await medicService.update(id, sanitizeMedicInput(input))
  revalidatePath("/")
  return medic ? toMedicDto(medic) : undefined
}

export async function remove(id: string): Promise<{ id: string } | undefined> {
  await requireAdmin()
  const result = await medicService.remove(id)
  revalidatePath("/")
  return result
}
