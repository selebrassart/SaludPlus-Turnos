import { branches } from "@/lib/db/schema"

export type BranchRow = typeof branches.$inferSelect

export { branches as branchTable }

export interface BranchDto {
  id: string
  name: string
  address: string
  phone: string
  active: boolean
  /** Cuántos profesionales atienden acá. Se calcula al leer. */
  doctorCount: number
}

export interface BranchInput {
  name: string
  address: string
  phone: string
  active: boolean
}

/** Payload del formulario de administración. */
export type BranchFormInput = Partial<BranchInput> & { id?: string }

export class Branch {
  id: string
  name: string
  address: string
  phone: string
  active: boolean
  /** Transitorio: no es una columna, se resuelve al consultar. */
  doctorCount: number

  constructor(
    id: string,
    name: string,
    address: string = "",
    phone: string = "",
    active: boolean = true,
    doctorCount: number = 0
  ) {
    this.id = id
    this.name = name
    this.address = address
    this.phone = phone
    this.active = active
    this.doctorCount = doctorCount
  }

  static fromRow(row: BranchRow, doctorCount = 0): Branch {
    return new Branch(
      row.id,
      row.name,
      row.address,
      row.phone,
      row.active,
      doctorCount
    )
  }
}

export function toBranchDto(branch: Branch): BranchDto {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    active: branch.active,
    doctorCount: branch.doctorCount,
  }
}
