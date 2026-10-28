import "server-only"
import { Branch, type BranchInput } from "@/models/Branch"
import type { BranchRepository } from "@/repository/BranchRepository"

export class BranchService {
  private repository: BranchRepository

  constructor(repository: BranchRepository) {
    this.repository = repository
  }

  findAll(): Promise<Branch[]> {
    return this.repository.findAll()
  }

  findActive(): Promise<Branch[]> {
    return this.repository.findActive()
  }

  findOne(id: string): Promise<Branch | undefined> {
    return this.repository.findOne(id)
  }

  async create(input: BranchInput): Promise<Branch> {
    const duplicate = await this.repository.findByName(input.name)
    if (duplicate) {
      throw new Error(`Ya existe una sede llamada "${duplicate.name}"`)
    }

    return this.repository.create(
      new Branch(
        crypto.randomUUID(),
        input.name,
        input.address,
        input.phone,
        input.active
      )
    )
  }

  async update(id: string, input: BranchInput): Promise<Branch | undefined> {
    const current = await this.repository.findOne(id)
    if (!current) throw new Error("La sede no existe")

    const duplicate = await this.repository.findOtherByName(input.name, id)
    if (duplicate) {
      throw new Error(`Ya existe una sede llamada "${duplicate.name}"`)
    }

    return this.repository.update(id, input)
  }

  /**
   * Borrar una sede con profesionales asignados los dejaría sin lugar donde
   * atender y sin consultorio válido, así que se rechaza explicando por qué.
   * Para sacarla de circulación sin perder la historia está el campo `active`.
   */
  async remove(id: string): Promise<{ id: string } | undefined> {
    const branch = await this.repository.findOne(id)
    if (!branch) throw new Error("La sede no existe")

    const assigned = await this.repository.countDoctors(id)
    if (assigned > 0) {
      throw new Error(
        `No se puede eliminar "${branch.name}": tiene ${assigned} ${
          assigned === 1 ? "médico asignado" : "médicos asignados"
        }. Reasignalos primero, o desactivá la sede para que deje de ofrecerse.`
      )
    }

    return this.repository.delete(id)
  }
}
