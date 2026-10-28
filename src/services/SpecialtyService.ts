import "server-only"
import { Specialty, type SpecialtyInput } from "@/models/Specialty"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { SpecialtyRepository } from "@/repository/SpecialtyRepository"

export class SpecialtyService {
  private repository: SpecialtyRepository
  private medicRepository: MedicRepository

  constructor(
    repository: SpecialtyRepository,
    medicRepository: MedicRepository
  ) {
    this.repository = repository
    this.medicRepository = medicRepository
  }

  findAll(): Promise<Specialty[]> {
    return this.repository.findAll()
  }

  findOne(id: string): Promise<Specialty | undefined> {
    return this.repository.findOne(id)
  }

  async create(input: SpecialtyInput): Promise<Specialty> {
    const duplicate = await this.repository.findByName(input.name)
    if (duplicate) {
      throw new Error(`Ya existe una especialidad llamada "${duplicate.name}"`)
    }

    const specialty = new Specialty(
      crypto.randomUUID(),
      input.name,
      input.description,
      input.icon,
      0
    )
    return this.repository.create(specialty)
  }

  async update(
    id: string,
    input: SpecialtyInput
  ): Promise<Specialty | undefined> {
    const current = await this.repository.findOne(id)
    if (!current) throw new Error("La especialidad no existe")

    const duplicate = await this.repository.findOtherByName(input.name, id)
    if (duplicate) {
      throw new Error(`Ya existe una especialidad llamada "${duplicate.name}"`)
    }

    // El nombre anterior se copia ANTES del UPDATE: compararlo después solo
    // funciona mientras el repositorio devuelva instancias nuevas en cada
    // consulta, y de eso depende que el renombre se propague a los médicos.
    const previousName = current.name

    const updated = await this.repository.update(id, input)

    if (previousName !== input.name) {
      await this.medicRepository.renameSpecialty(id, input.name)
    }

    return updated
  }

  /**
   * Deleting a specialty that still has doctors would leave every one of them
   * pointing at an id that no longer resolves, so the operation is refused with
   * the reason instead.
   */
  async remove(id: string): Promise<{ id: string } | undefined> {
    const specialty = await this.repository.findOne(id)
    if (!specialty) throw new Error("La especialidad no existe")

    const assigned = await this.medicRepository.countBySpecialtyId(id)
    if (assigned > 0) {
      throw new Error(
        `No se puede eliminar "${specialty.name}": tiene ${assigned} ${
          assigned === 1 ? "médico asignado" : "médicos asignados"
        }. Reasigná esos profesionales primero.`
      )
    }

    return this.repository.delete(id)
  }

  /** Recomputes the badge shown in the admin grid after a doctor changes. */
  async refreshDoctorCount(specialtyId: string): Promise<void> {
    if (!specialtyId) return
    const total = await this.medicRepository.countBySpecialtyId(specialtyId)
    await this.repository.setActiveDoctors(specialtyId, total)
  }
}
