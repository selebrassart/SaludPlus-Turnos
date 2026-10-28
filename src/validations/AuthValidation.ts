import type { Role } from "@/models/User"

const validRoles: Role[] = ["patient", "doctor", "admin"]

export function sanitizeRole(raw: unknown): Role {
  if (typeof raw !== "string" || !validRoles.includes(raw as Role)) {
    throw new Error("Rol inválido")
  }
  return raw as Role
}
