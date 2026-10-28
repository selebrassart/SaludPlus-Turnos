import "server-only"
import { Medic, type MedicInput } from "@/models/Medic"
import type { BranchRepository } from "@/repository/BranchRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { SpecialtyRepository } from "@/repository/SpecialtyRepository"
import type { UserRepository } from "@/repository/UserRepository"

interface ResolvedSpecialty {
  id: string
  name: string
}

export class MedicService {
  private repository: MedicRepository
  private specialtyRepository: SpecialtyRepository
  private branchRepository: BranchRepository
  private userRepository: UserRepository

  constructor(
    repository: MedicRepository,
    specialtyRepository: SpecialtyRepository,
    branchRepository: BranchRepository,
    userRepository: UserRepository
  ) {
    this.repository = repository
    this.specialtyRepository = specialtyRepository
    this.branchRepository = branchRepository
    this.userRepository = userRepository
  }

  findAll(): Promise<Medic[]> {
    return this.repository.findAll()
  }

  findOne(id: string): Promise<Medic | undefined> {
    return this.repository.findOne(id)
  }

  findByUserId(userId: string): Promise<Medic | undefined> {
    return this.repository.findByUserId(userId)
  }

  async create(input: MedicInput): Promise<Medic> {
    const duplicate = await this.repository.findByEmail(input.email)
    if (duplicate) {
      throw new Error("Ya existe un médico con ese email")
    }

    const specialty = await this.resolveSpecialty(input.specialtyId)
    const branchId = await this.resolveBranch(input.branchId)

    const medic = new Medic({
      id: crypto.randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      specialtyId: specialty.id,
      specialtyName: specialty.name,
      branchId,
      office: input.office,
      avatar: input.avatar,
      license: input.license,
      yearsExperience: input.yearsExperience,
      workDays: input.workDays,
      startTime: input.startTime,
      endTime: input.endTime,
      breakStart: input.breakStart,
      breakEnd: input.breakEnd,
      slotMinutes: input.slotMinutes,
      // Un profesional recién cargado no tiene reseñas: arranca sin estrellas,
      // no con cinco.
      rating: 0,
      reviewCount: 0,
    })

    const created = await this.repository.create(medic)
    await this.refreshDoctorCount(specialty.id)
    return created
  }

  async update(id: string, input: MedicInput): Promise<Medic | undefined> {
    const current = await this.repository.findOne(id)
    if (!current) throw new Error("El médico no existe")

    const duplicate = await this.repository.findOtherByEmail(input.email, id)
    if (duplicate) {
      throw new Error("Ya existe otro médico con ese email")
    }

    const specialty = await this.resolveSpecialty(input.specialtyId)
    const branchId = await this.resolveBranch(input.branchId)

    // Se guarda antes del UPDATE: leerlo después daría la especialidad nueva y
    // el contador de la anterior nunca bajaría.
    const previousSpecialtyId = current.specialtyId

    const updated = await this.repository.update(id, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      specialtyId: specialty.id,
      specialtyName: specialty.name,
      branchId,
      office: input.office,
      avatar: input.avatar,
      license: input.license,
      yearsExperience: input.yearsExperience,
      workDays: input.workDays,
      startTime: input.startTime,
      endTime: input.endTime,
      breakStart: input.breakStart,
      breakEnd: input.breakEnd,
      slotMinutes: input.slotMinutes,
    })

    // Ambos contadores se mueven cuando se reasigna un profesional.
    await this.refreshDoctorCount(previousSpecialtyId)
    await this.refreshDoctorCount(specialty.id)

    return updated
  }

  /**
   * Los turnos caen en cascada por la clave foránea, y la cuenta de acceso se
   * borra junto con el profesional para no dejar credenciales huérfanas.
   */
  async remove(id: string): Promise<{ id: string } | undefined> {
    const medic = await this.repository.findOne(id)
    if (!medic) throw new Error("El médico no existe")

    const result = await this.repository.delete(id)

    if (medic.userId) {
      await this.userRepository.delete(medic.userId)
    }
    await this.refreshDoctorCount(medic.specialtyId)

    return result
  }

  /**
   * Runs when a user picks the "doctor" role at sign-up: creates the linked
   * domain record if it does not exist yet. The specialty is left empty for an
   * admin to fill in later.
   */
  async ensureForUser(
    userId: string,
    fullName: string,
    email: string
  ): Promise<void> {
    const existing = await this.repository.findByUserId(userId)
    if (existing) return

    // Una ficha cargada por un admin antes de que la persona se registre se
    // adopta en lugar de duplicarse.
    const byEmail = await this.repository.findByEmail(email)
    if (byEmail) {
      await this.repository.update(byEmail.id, { userId })
      return
    }

    const parts = fullName.trim().split(" ")
    await this.repository.create(
      new Medic({
        id: crypto.randomUUID(),
        firstName: parts[0] ?? fullName,
        lastName: parts.slice(1).join(" "),
        email,
        userId,
      })
    )
  }

  /**
   * El formulario manda un id elegido del catálogo y el nombre se lee de la
   * especialidad, así las dos columnas no pueden separarse.
   */
  private async resolveSpecialty(
    specialtyId: string
  ): Promise<ResolvedSpecialty> {
    if (!specialtyId) return { id: "", name: "" }

    const specialty = await this.specialtyRepository.findOne(specialtyId)
    if (!specialty) {
      throw new Error("La especialidad seleccionada no existe")
    }
    return { id: specialty.id, name: specialty.name }
  }

  /** La sede es opcional, pero si se indica una tiene que existir. */
  private async resolveBranch(branchId: string): Promise<string | null> {
    if (!branchId) return null

    const branch = await this.branchRepository.findOne(branchId)
    if (!branch) {
      throw new Error("La sede seleccionada no existe")
    }
    return branch.id
  }

  private async refreshDoctorCount(specialtyId: string): Promise<void> {
    if (!specialtyId) return
    const total = await this.repository.countBySpecialtyId(specialtyId)
    await this.specialtyRepository.setActiveDoctors(specialtyId, total)
  }
}
