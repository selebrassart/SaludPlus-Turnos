import { doctors } from "@/lib/db/schema"
import { DEFAULT_SCHEDULE, type Schedule } from "@/lib/bookingSlots"

export type MedicRow = typeof doctors.$inferSelect

export { doctors as medicTable }

export interface MedicDto {
  id: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  phone: string
  specialtyId: string
  specialtyName: string
  branchId: string
  branchName: string
  office: string
  avatar: string
  license: string
  /** Promedio de reseñas. Solo tiene sentido si reviewCount > 0. */
  rating: number
  reviewCount: number
  yearsExperience: number
  workDays: number[]
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  slotMinutes: number
}

/**
 * Lo que el formulario de administración puede cargar.
 *
 * `rating` y `reviewCount` quedan afuera a propósito: son el resultado de las
 * reseñas de los pacientes, no un dato que alguien escriba a mano.
 */
export interface MedicInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  specialtyId: string
  specialtyName: string
  branchId: string
  office: string
  avatar: string
  license: string
  yearsExperience: number
  workDays: number[]
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  slotMinutes: number
}

/** Admin form payload: absent fields fall back to the validation defaults. */
export type MedicFormInput = Partial<MedicInput> & { id?: string }

/**
 * Atributos con los que se construye un Medic.
 *
 * Es un objeto y no una lista de parámetros posicionales porque la entidad ya
 * tiene quince campos: con posicionales, agregar uno en el medio desalinea en
 * silencio todos los que siguen.
 */
export interface MedicAttributes {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  specialtyId?: string
  specialtyName?: string
  branchId?: string | null
  branchName?: string
  office?: string
  avatar?: string
  license?: string
  rating?: number
  reviewCount?: number
  yearsExperience?: number
  workDays?: number[]
  startTime?: string
  endTime?: string
  breakStart?: string
  breakEnd?: string
  slotMinutes?: number
  userId?: string | null
}

// The Spanish honorific is gendered but the schema only stores the given name,
// so it is inferred from the most common feminine names in the catalog.
const feminineFirstNames = new Set([
  "maría",
  "lucía",
  "ana",
  "sofía",
  "valentina",
  "laura",
  "carla",
  "julia",
  "paula",
  "marta",
])

export class Medic {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  specialtyId: string
  specialtyName: string
  branchId: string | null
  /** Transitorio: no es una columna, se resuelve al consultar la sede. */
  branchName: string
  office: string
  avatar: string
  license: string
  rating: number
  reviewCount: number
  yearsExperience: number
  workDays: number[]
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  slotMinutes: number
  userId?: string | null

  constructor(attributes: MedicAttributes) {
    this.id = attributes.id
    this.firstName = attributes.firstName
    this.lastName = attributes.lastName
    this.email = attributes.email
    this.phone = attributes.phone ?? ""
    this.specialtyId = attributes.specialtyId ?? ""
    this.specialtyName = attributes.specialtyName ?? ""
    this.branchId = attributes.branchId ?? null
    this.branchName = attributes.branchName ?? ""
    this.office = attributes.office ?? ""
    this.avatar = attributes.avatar ?? ""
    this.license = attributes.license ?? ""
    this.rating = attributes.rating ?? 0
    this.reviewCount = attributes.reviewCount ?? 0
    this.yearsExperience = attributes.yearsExperience ?? 1
    this.workDays = attributes.workDays ?? [1, 2, 3, 4, 5]
    this.startTime = attributes.startTime ?? DEFAULT_SCHEDULE.startTime
    this.endTime = attributes.endTime ?? DEFAULT_SCHEDULE.endTime
    this.breakStart = attributes.breakStart ?? DEFAULT_SCHEDULE.breakStart
    this.breakEnd = attributes.breakEnd ?? DEFAULT_SCHEDULE.breakEnd
    this.slotMinutes = attributes.slotMinutes ?? DEFAULT_SCHEDULE.slotMinutes
    this.userId = attributes.userId ?? null
  }

  get title(): string {
    return feminineFirstNames.has(this.firstName.trim().toLowerCase())
      ? "Dra."
      : "Dr."
  }

  get displayName(): string {
    return `${this.title} ${this.firstName} ${this.lastName}`
  }

  static fromRow(row: MedicRow, branchName = ""): Medic {
    return new Medic({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      specialtyId: row.specialtyId,
      specialtyName: row.specialtyName,
      branchId: row.branchId,
      branchName,
      office: row.office,
      avatar: row.avatar,
      license: row.license,
      rating: row.rating,
      reviewCount: row.reviewCount,
      yearsExperience: row.yearsExperience,
      workDays: row.workDays
        .split(",")
        .map((day) => Number.parseInt(day, 10))
        .filter((day) => !Number.isNaN(day)),
      startTime: row.startTime,
      endTime: row.endTime,
      breakStart: row.breakStart,
      breakEnd: row.breakEnd,
      slotMinutes: row.slotMinutes,
      userId: row.userId,
    })
  }
}

export function toMedicDto(medic: Medic): MedicDto {
  return {
    id: medic.id,
    firstName: medic.firstName,
    lastName: medic.lastName,
    displayName: medic.displayName,
    email: medic.email,
    phone: medic.phone,
    specialtyId: medic.specialtyId,
    specialtyName: medic.specialtyName,
    branchId: medic.branchId ?? "",
    branchName: medic.branchName,
    office: medic.office,
    avatar: medic.avatar,
    license: medic.license,
    rating: medic.rating,
    reviewCount: medic.reviewCount,
    yearsExperience: medic.yearsExperience,
    workDays: medic.workDays,
    startTime: medic.startTime,
    endTime: medic.endTime,
    breakStart: medic.breakStart,
    breakEnd: medic.breakEnd,
    slotMinutes: medic.slotMinutes,
  }
}

/** La jornada del profesional, lista para generar sus horarios. */
export function medicSchedule(medic: MedicDto): Schedule {
  return {
    startTime: medic.startTime,
    endTime: medic.endTime,
    breakStart: medic.breakStart,
    breakEnd: medic.breakEnd,
    slotMinutes: medic.slotMinutes,
  }
}
