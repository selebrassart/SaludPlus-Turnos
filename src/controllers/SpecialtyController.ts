import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser } from "@/lib/auth/session"
import { toSpecialtyDto, type SpecialtyDto } from "@/models/Specialty"
import { specialtyService } from "@/services/container"
import { sanitizeSpecialtyInput } from "@/validations/SpecialtyValidation"

export async function findAll(): Promise<SpecialtyDto[]> {
  await requireUser()
  const specialties = await specialtyService.findAll()
  return specialties.map(toSpecialtyDto)
}

export async function findOne(id: string): Promise<SpecialtyDto | undefined> {
  await requireUser()
  const specialty = await specialtyService.findOne(id)
  return specialty ? toSpecialtyDto(specialty) : undefined
}

export async function create(input: unknown): Promise<SpecialtyDto> {
  await requireAdmin()
  const specialty = await specialtyService.create(sanitizeSpecialtyInput(input))
  revalidatePath("/")
  return toSpecialtyDto(specialty)
}

export async function update(
  id: string,
  input: unknown
): Promise<SpecialtyDto | undefined> {
  await requireAdmin()
  const specialty = await specialtyService.update(
    id,
    sanitizeSpecialtyInput(input)
  )
  revalidatePath("/")
  return specialty ? toSpecialtyDto(specialty) : undefined
}

export async function remove(id: string): Promise<{ id: string } | undefined> {
  await requireAdmin()
  const result = await specialtyService.remove(id)
  revalidatePath("/")
  return result
}
