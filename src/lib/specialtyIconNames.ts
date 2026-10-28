/**
 * Plain strings, no component imports: the validation layer runs on the server
 * and only needs to know which names are allowed, not how to draw them.
 */
export const specialtyIconOptions = [
  "Stethoscope",
  "HeartPulse",
  "Baby",
  "Brain",
  "Bone",
  "Eye",
  "Sparkles",
] as const

export type SpecialtyIconName = (typeof specialtyIconOptions)[number]

export const DEFAULT_SPECIALTY_ICON: SpecialtyIconName = "Stethoscope"
