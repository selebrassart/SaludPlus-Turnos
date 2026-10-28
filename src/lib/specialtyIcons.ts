import {
  Baby,
  Bone,
  Brain,
  Eye,
  HeartPulse,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react"

export {
  DEFAULT_SPECIALTY_ICON,
  specialtyIconOptions,
  type SpecialtyIconName,
} from "./specialtyIconNames"

/**
 * Shared by the admin grid, the booking stepper and the specialty form so the
 * catalogue offered when creating a specialty is exactly the one that can be
 * rendered afterwards.
 */
const specialtyIcons: Record<string, LucideIcon> = {
  Stethoscope,
  HeartPulse,
  Baby,
  Brain,
  Bone,
  Eye,
  Sparkles,
}

export function resolveSpecialtyIcon(icon: string): LucideIcon {
  return specialtyIcons[icon] ?? Stethoscope
}
