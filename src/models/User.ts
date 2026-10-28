import { user } from "@/lib/db/schema"

export type UserRow = typeof user.$inferSelect

export { user as userTable }

export type Role = "patient" | "doctor" | "admin"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  image?: string | null
}

/** Shape sent to the admin panel. Never carries credentials. */
export interface UserDto {
  id: string
  name: string
  email: string
  role: Role
  emailVerified: boolean
  createdAt: string
  /** True for the account running the current session, which cannot self-delete. */
  isCurrent: boolean
}

export interface UserInput {
  name: string
  email: string
  role: Role
}

/** Admin form payload: absent fields fall back to the validation defaults. */
export type UserFormInput = Partial<UserInput> & { id?: string }

export function toUserDto(row: UserRow, currentUserId: string): UserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: (row.role as Role) ?? "patient",
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    isCurrent: row.id === currentUserId,
  }
}
