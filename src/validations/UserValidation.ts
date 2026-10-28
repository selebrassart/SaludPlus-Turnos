import type { Role, UserInput } from "@/models/User"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validRoles: Role[] = ["patient", "doctor", "admin"]

/** Better Auth rejects anything shorter, so it is checked before the round trip. */
export const MIN_PASSWORD_LENGTH = 8

export function sanitizeUserInput(raw: unknown): UserInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (!name) throw new Error("El nombre es obligatorio")

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  if (!emailPattern.test(email)) throw new Error("Email inválido")

  const role = input.role
  if (typeof role !== "string" || !validRoles.includes(role as Role)) {
    throw new Error("Rol inválido")
  }

  return { name, email, role: role as Role }
}

export function sanitizePassword(raw: unknown): string {
  const password = typeof raw === "string" ? raw : ""
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
    )
  }
  return password
}
