import { specialties } from "@/lib/db/schema"

export type SpecialtyRow = typeof specialties.$inferSelect

export { specialties as specialtyTable }

export interface SpecialtyDto {
  id: string
  name: string
  description: string
  icon: string
  activeDoctors: number
}

export interface SpecialtyInput {
  name: string
  description: string
  icon: string
}

/** Admin form payload: absent fields fall back to the validation defaults. */
export type SpecialtyFormInput = Partial<SpecialtyInput> & { id?: string }

export class Specialty {
  id: string
  name: string
  description: string
  icon: string
  activeDoctors: number

  constructor(
    id: string,
    name: string,
    description: string,
    icon: string,
    activeDoctors: number = 0
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.icon = icon
    this.activeDoctors = activeDoctors
  }

  static fromRow(row: SpecialtyRow): Specialty {
    return new Specialty(
      row.id,
      row.name,
      row.description,
      row.icon,
      row.activeDoctors
    )
  }
}

export function toSpecialtyDto(specialty: Specialty): SpecialtyDto {
  return {
    id: specialty.id,
    name: specialty.name,
    description: specialty.description,
    icon: specialty.icon,
    activeDoctors: specialty.activeDoctors,
  }
}
