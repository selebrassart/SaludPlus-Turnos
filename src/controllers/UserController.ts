import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth/session"
import { toUserDto, type UserDto } from "@/models/User"
import { userService } from "@/services/container"
import {
  sanitizePassword,
  sanitizeUserInput,
} from "@/validations/UserValidation"

export async function findAll(): Promise<UserDto[]> {
  const admin = await requireAdmin()
  const rows = await userService.findAll()
  return rows.map((row) => toUserDto(row, admin.id))
}

export async function create(
  input: unknown,
  password: unknown
): Promise<UserDto> {
  const admin = await requireAdmin()
  const row = await userService.create(
    sanitizeUserInput(input),
    sanitizePassword(password)
  )
  revalidatePath("/")
  return toUserDto(row, admin.id)
}

export async function update(
  id: string,
  input: unknown
): Promise<UserDto | undefined> {
  const admin = await requireAdmin()
  const row = await userService.update(id, sanitizeUserInput(input), admin.id)
  revalidatePath("/")
  return row ? toUserDto(row, admin.id) : undefined
}

export async function remove(id: string): Promise<{ id: string } | undefined> {
  const admin = await requireAdmin()
  const result = await userService.remove(id, admin.id)
  revalidatePath("/")
  return result
}
