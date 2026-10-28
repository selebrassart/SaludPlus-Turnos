/**
 * Repositorios en memoria para probar la capa de servicios.
 *
 * Los servicios reciben sus repositorios por constructor y los importan solo
 * como tipo, así que se los puede reemplazar por estas implementaciones sin
 * tocar una línea de producción. Se comportan como los reales en lo que
 * importa para las reglas de negocio: filtran igual, devuelven `undefined`
 * cuando no encuentran, y aplican las mismas exclusiones (los turnos
 * cancelados no ocupan horario).
 */

import { Appointment } from "@/models/Appointment"
import { Branch } from "@/models/Branch"
import { Medic } from "@/models/Medic"
import { Notification } from "@/models/Notification"
import { Patient } from "@/models/Patient"
import { Review } from "@/models/Review"
import { Specialty } from "@/models/Specialty"

export class FakeAppointmentRepository {
  items: Appointment[] = []

  async findAll() {
    return [...this.items]
  }

  async findOne(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByDoctorId(doctorId: string) {
    return this.items.filter((item) => item.doctorId === doctorId)
  }

  async findByPatientId(patientId: string) {
    return this.items.filter((item) => item.patientId === patientId)
  }

  async findByDoctorAndDate(doctorId: string, date: string) {
    return this.items.filter(
      (item) => item.doctorId === doctorId && item.date === date
    )
  }

  async findScheduledOn(date: string) {
    return this.items.filter(
      (item) => item.date === date && item.status === "scheduled"
    )
  }

  async findClash(
    doctorId: string,
    date: string,
    time: string,
    excludeId?: string
  ) {
    return this.items.find(
      (item) =>
        item.doctorId === doctorId &&
        item.date === date &&
        item.time === time &&
        item.status !== "cancelled" &&
        item.id !== excludeId
    )
  }

  async findPatientClash(
    patientId: string,
    date: string,
    time: string,
    excludeId?: string
  ) {
    return this.items.find(
      (item) =>
        item.patientId === patientId &&
        item.date === date &&
        item.time === time &&
        item.status !== "cancelled" &&
        item.id !== excludeId
    )
  }

  async findByPatientAndDate(patientId: string, date: string) {
    return this.items.filter(
      (item) =>
        item.patientId === patientId &&
        item.date === date &&
        item.status !== "cancelled"
    )
  }

  async findRoomClash(
    branchId: string,
    office: string,
    date: string,
    time: string,
    excludeId?: string
  ) {
    if (!branchId || !office) return undefined
    return this.items.find(
      (item) =>
        item.branchId === branchId &&
        item.office === office &&
        item.date === date &&
        item.time === time &&
        item.status !== "cancelled" &&
        item.id !== excludeId
    )
  }

  async create(item: Appointment) {
    this.items.push(item)
    return item
  }

  async update(id: string, patch: Partial<Appointment>) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, patch)
    return found
  }

  async updateStatusScopedToPatient(
    id: string,
    patientId: string,
    status: Appointment["status"]
  ) {
    const found = this.items.find(
      (item) => item.id === id && item.patientId === patientId
    )
    if (found) found.status = status
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakeMedicRepository {
  items: Medic[] = []
  /** Registra las llamadas para poder afirmar que el promedio se recalculó. */
  ratingCalls: { id: string; average: number; total: number }[] = []
  renamedSpecialties: { specialtyId: string; name: string }[] = []

  async findAll() {
    return [...this.items]
  }

  async findOne(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByUserId(userId: string) {
    return this.items.find((item) => item.userId === userId)
  }

  async findByEmail(email: string) {
    return this.items.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    )
  }

  async findOtherByEmail(email: string, excludeId: string) {
    return this.items.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() && item.id !== excludeId
    )
  }

  async countBySpecialtyId(specialtyId: string) {
    return this.items.filter((item) => item.specialtyId === specialtyId).length
  }

  async renameSpecialty(specialtyId: string, name: string) {
    this.renamedSpecialties.push({ specialtyId, name })
    for (const item of this.items) {
      if (item.specialtyId === specialtyId) item.specialtyName = name
    }
  }

  async setRating(id: string, average: number, total: number) {
    this.ratingCalls.push({ id, average, total })
    const found = this.items.find((item) => item.id === id)
    if (found) {
      found.rating = average
      found.reviewCount = total
    }
  }

  async create(item: Medic) {
    this.items.push(item)
    return item
  }

  async createIfMissing(item: Medic) {
    if (!this.items.some((existing) => existing.id === item.id)) {
      this.items.push(item)
    }
  }

  async update(id: string, patch: Partial<Medic>) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, patch)
    return found
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakePatientRepository {
  items: Patient[] = []

  async findAll() {
    return [...this.items]
  }

  async findOne(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByUserId(userId: string) {
    return this.items.find((item) => item.userId === userId)
  }

  async findByEmail(email: string) {
    return this.items.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    )
  }

  async findOtherByEmail(email: string, excludeId: string) {
    return this.items.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() && item.id !== excludeId
    )
  }

  async create(item: Patient) {
    this.items.push(item)
    return item
  }

  async update(id: string, patch: Partial<Patient>) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, patch)
    return found
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakeSpecialtyRepository {
  items: Specialty[] = []

  async findAll() {
    return [...this.items]
  }

  async findOne(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByName(name: string) {
    return this.items.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    )
  }

  async findOtherByName(name: string, excludeId: string) {
    return this.items.find(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId
    )
  }

  async setActiveDoctors(id: string, total: number) {
    const found = this.items.find((item) => item.id === id)
    if (found) found.activeDoctors = total
  }

  async create(item: Specialty) {
    this.items.push(item)
    return item
  }

  async createIfMissing(item: Specialty) {
    if (!this.items.some((existing) => existing.id === item.id)) {
      this.items.push(item)
    }
  }

  async update(id: string, patch: Partial<Specialty>) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, patch)
    return found
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakeBranchRepository {
  items: Branch[] = []
  doctorsByBranch = new Map<string, number>()

  async findAll() {
    return [...this.items]
  }

  async findActive() {
    return this.items.filter((item) => item.active)
  }

  async findOne(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByName(name: string) {
    return this.items.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    )
  }

  async findOtherByName(name: string, excludeId: string) {
    return this.items.find(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId
    )
  }

  async countDoctors(id: string) {
    return this.doctorsByBranch.get(id) ?? 0
  }

  async create(item: Branch) {
    this.items.push(item)
    return item
  }

  async createIfMissing(item: Branch) {
    if (!this.items.some((existing) => existing.id === item.id)) {
      this.items.push(item)
    }
  }

  async update(id: string, patch: Partial<Branch>) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, patch)
    return found
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakeReviewRepository {
  items: Review[] = []

  async findByDoctorId(doctorId: string) {
    return this.items.filter((item) => item.doctorId === doctorId)
  }

  async findByAppointmentId(appointmentId: string) {
    return this.items.find((item) => item.appointmentId === appointmentId)
  }

  async findAppointmentIdsByPatient(patientId: string) {
    return this.items
      .filter((item) => item.patientId === patientId)
      .map((item) => item.appointmentId)
  }

  async summaryForDoctor(doctorId: string) {
    const propias = this.items.filter((item) => item.doctorId === doctorId)
    if (!propias.length) return { average: 0, total: 0 }
    const suma = propias.reduce((total, item) => total + item.score, 0)
    return { average: suma / propias.length, total: propias.length }
  }

  async create(item: Review) {
    this.items.push(item)
    return item
  }
}

export class FakeUserRepository {
  items: {
    id: string
    name: string
    email: string
    role: string
    emailVerified: boolean
    createdAt: Date
    updatedAt: Date
    image: string | null
  }[] = []

  async findAll() {
    return [...this.items]
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id)
  }

  async findByEmail(email: string) {
    return this.items.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    )
  }

  async findOtherByEmail(email: string, excludeId: string) {
    return this.items.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() && item.id !== excludeId
    )
  }

  async countByRole(role: string) {
    return this.items.filter((item) => item.role === role).length
  }

  async updateRole(id: string, role: string) {
    const found = this.items.find((item) => item.id === id)
    if (found) found.role = role
  }

  async updateProfile(
    id: string,
    attributes: { name: string; email: string; role: string }
  ) {
    const found = this.items.find((item) => item.id === id)
    if (!found) return undefined
    Object.assign(found, attributes)
    return found
  }

  async delete(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
    return { id }
  }
}

export class FakeNotificationRepository {
  items: Notification[] = []

  async findByUserId(userId: string) {
    return this.items.filter((item) => item.userId === userId)
  }

  async countUnread(userId: string) {
    return this.items.filter(
      (item) => item.userId === userId && item.readAt === null
    ).length
  }

  /** Reproduce el índice único sobre (userId, dedupeKey). */
  async createIfMissing(item: Notification) {
    const repetido =
      item.dedupeKey !== null &&
      this.items.some(
        (existing) =>
          existing.userId === item.userId &&
          existing.dedupeKey === item.dedupeKey
      )
    if (repetido) return false

    this.items.push(item)
    return true
  }

  async markAllRead(userId: string) {
    for (const item of this.items) {
      if (item.userId === userId) item.readAt = new Date()
    }
  }

  async markRead(userId: string, id: string) {
    const found = this.items.find(
      (item) => item.id === id && item.userId === userId
    )
    if (found) found.readAt = new Date()
  }
}

/** Registra los avisos emitidos sin depender del servicio real. */
export class SpyNotificationService {
  calls: { method: string; args: unknown[] }[] = []

  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args })
  }

  async appointmentBooked(...args: unknown[]) {
    this.record("appointmentBooked", ...args)
  }
  async appointmentCancelled(...args: unknown[]) {
    this.record("appointmentCancelled", ...args)
  }
  async appointmentRescheduled(...args: unknown[]) {
    this.record("appointmentRescheduled", ...args)
  }
  async appointmentStatusChanged(...args: unknown[]) {
    this.record("appointmentStatusChanged", ...args)
  }
  async reviewReceived(...args: unknown[]) {
    this.record("reviewReceived", ...args)
  }

  metodosLlamados(): string[] {
    return this.calls.map((call) => call.method)
  }
}
