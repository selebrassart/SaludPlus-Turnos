import type { BranchInput } from "@/models/Branch"

export function sanitizeBranchInput(raw: unknown): BranchInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (!name) throw new Error("El nombre de la sede es obligatorio")

  const address = typeof input.address === "string" ? input.address.trim() : ""
  if (!address) throw new Error("La dirección es obligatoria")

  return {
    name,
    address,
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    // Una sede se crea activa salvo que se indique lo contrario.
    active: input.active === undefined ? true : Boolean(input.active),
  }
}
