import {
  DEFAULT_SPECIALTY_ICON,
  specialtyIconOptions,
} from "@/lib/specialtyIconNames"
import type { SpecialtyInput } from "@/models/Specialty"

export function sanitizeSpecialtyInput(raw: unknown): SpecialtyInput {
  const input = (raw ?? {}) as Record<string, unknown>

  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (!name) throw new Error("El nombre es obligatorio")

  const description =
    typeof input.description === "string" ? input.description.trim() : ""
  if (!description) throw new Error("La descripción es obligatoria")

  // An icon outside the catalogue would render as a blank card, so anything
  // unknown falls back to the default instead of being stored as-is.
  const rawIcon = typeof input.icon === "string" ? input.icon.trim() : ""
  const icon: string = (specialtyIconOptions as readonly string[]).includes(
    rawIcon
  )
    ? rawIcon
    : DEFAULT_SPECIALTY_ICON

  return { name, description, icon }
}
