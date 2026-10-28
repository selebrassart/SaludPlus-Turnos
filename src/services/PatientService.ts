import "server-only"
import { Patient, type PatientInput } from "@/models/Patient"
import type { PatientRepository } from "@/repository/PatientRepository"
import type { UserRepository } from "@/repository/UserRepository"
import { todayISODate } from "@/lib/format/date"

export class PatientService {
  private repository: PatientRepository
  private userRepository: UserRepository

  constructor(
    repository: PatientRepository,
    userRepository: UserRepository
  ) {
    this.repository = repository
    this.userRepository = userRepository
  }

  findAll(): Promise<Patient[]> {
    return this.repository.findAll()
  }

  findOne(id: string): Promise<Patient | undefined> {
    return this.repository.findOne(id)
  }

  findByUserId(userId: string): Promise<Patient | undefined> {
    return this.repository.findByUserId(userId)
  }

  async create(input: PatientInput): Promise<Patient> {
    const duplicate = await this.repository.findByEmail(input.email)
    if (duplicate) {
      throw new Error("Ya existe un paciente con ese email")
    }

    const patient = new Patient(
      crypto.randomUUID(),
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.dni,
      input.birthDate,
      todayISODate(),
      input.bloodType ?? null
    )
    return this.repository.create(patient)
  }

  async update(id: string, input: PatientInput): Promise<Patient | undefined> {
    const current = await this.repository.findOne(id)
    if (!current) throw new Error("El paciente no existe")

    const duplicate = await this.repository.findOtherByEmail(input.email, id)
    if (duplicate) {
      throw new Error("Ya existe otro paciente con ese email")
    }

    return this.repository.update(id, {
      ...input,
      bloodType: input.bloodType ?? null,
    })
  }

  /**
   * Appointments cascade from the FK, and the login account is removed with the
   * patient so no orphan credentials survive the deletion.
   */
  async remove(id: string): Promise<{ id: string } | undefined> {
    const patient = await this.repository.findOne(id)
    if (!patient) throw new Error("El paciente no existe")

    const result = await this.repository.delete(id)

    if (patient.userId) {
      await this.userRepository.delete(patient.userId)
    }

    return result
  }

  /**
   * Devuelve la ficha del usuario, creándola si falta.
   *
   * El alta de cuenta llama a `/api/set-role` desde el navegador y esa llamada
   * puede fallar en silencio —o correr antes de que la cookie de sesión esté
   * disponible—, dejando una cuenta con rol "patient" (el default de la
   * columna) pero sin ninguna fila en `patients`. Esa persona podía navegar
   * hasta el último paso de la reserva y ahí chocarse con "No se encontró el
   * perfil del paciente". Recuperar la situación acá es más robusto que confiar
   * en que aquel fetch haya salido bien.
   */
  async findOrCreateForUser(
    userId: string,
    fullName: string,
    email: string
  ): Promise<Patient> {
    await this.ensureForUser(userId, fullName, email)

    const patient = await this.repository.findByUserId(userId)
    if (!patient) {
      throw new Error("No se pudo crear el perfil del paciente.")
    }
    return patient
  }

  /**
   * Runs when a user picks the "patient" role at sign-up: creates the linked
   * domain record if it does not exist yet.
   */
  async ensureForUser(
    userId: string,
    fullName: string,
    email: string
  ): Promise<void> {
    const existing = await this.repository.findByUserId(userId)
    if (existing) return

    // A patient row loaded by an admin before the person signed up is adopted
    // instead of duplicated.
    const byEmail = await this.repository.findByEmail(email)
    if (byEmail) {
      await this.repository.update(byEmail.id, { userId })
      return
    }

    const parts = fullName.trim().split(" ")
    const patient = new Patient(
      crypto.randomUUID(),
      parts[0] ?? fullName,
      parts.slice(1).join(" "),
      email
    )
    patient.userId = userId
    await this.repository.create(patient)
  }
}
