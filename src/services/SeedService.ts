import "server-only"
import { auth } from "@/lib/auth/authServer"
import type { SeedAccount, SeedMedic } from "@/lib/seedData"
import { Branch, type BranchDto } from "@/models/Branch"
import { Medic } from "@/models/Medic"
import { Specialty, type SpecialtyDto } from "@/models/Specialty"
import type { BranchRepository } from "@/repository/BranchRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { PatientRepository } from "@/repository/PatientRepository"
import type { SpecialtyRepository } from "@/repository/SpecialtyRepository"
import type { UserRepository } from "@/repository/UserRepository"

export interface CatalogSeedResult {
  branches: number
  specialties: number
  medics: number
}

export class SeedService {
  private userRepository: UserRepository
  private patientRepository: PatientRepository
  private medicRepository: MedicRepository
  private specialtyRepository: SpecialtyRepository
  private branchRepository: BranchRepository

  constructor(
    userRepository: UserRepository,
    patientRepository: PatientRepository,
    medicRepository: MedicRepository,
    specialtyRepository: SpecialtyRepository,
    branchRepository: BranchRepository
  ) {
    this.userRepository = userRepository
    this.patientRepository = patientRepository
    this.medicRepository = medicRepository
    this.specialtyRepository = specialtyRepository
    this.branchRepository = branchRepository
  }

  async seedAccounts(accounts: SeedAccount[]): Promise<string[]> {
    const results: string[] = []

    for (const account of accounts) {
      results.push(await this.ensureAccount(account))
      await this.applyRoleAndLinks(account)
    }

    return results
  }

  async seedCatalog(
    branches: Omit<BranchDto, "doctorCount">[],
    specialties: SpecialtyDto[],
    medics: SeedMedic[]
  ): Promise<CatalogSeedResult> {
    // Las sedes van primero: los médicos las referencian.
    for (const branch of branches) {
      await this.branchRepository.createIfMissing(
        new Branch(
          branch.id,
          branch.name,
          branch.address,
          branch.phone,
          branch.active
        )
      )
    }

    for (const specialty of specialties) {
      await this.specialtyRepository.createIfMissing(
        new Specialty(
          specialty.id,
          specialty.name,
          specialty.description,
          specialty.icon,
          specialty.activeDoctors
        )
      )
    }

    for (const medic of medics) {
      await this.medicRepository.createIfMissing(
        new Medic({
          id: medic.id,
          firstName: medic.firstName,
          lastName: medic.lastName,
          email: medic.email,
          phone: medic.phone,
          specialtyId: medic.specialtyId,
          specialtyName: medic.specialtyName,
          branchId: medic.branchId,
          office: medic.office,
          avatar: medic.avatar,
          license: medic.license,
          yearsExperience: medic.yearsExperience,
          workDays: medic.workDays,
          // Sin reseñas todavía: las estrellas se ganan atendiendo.
          rating: 0,
          reviewCount: 0,
        })
      )
    }

    return {
      branches: branches.length,
      specialties: specialties.length,
      medics: medics.length,
    }
  }

  private async ensureAccount(account: SeedAccount): Promise<string> {
    const existing = await this.userRepository.findByEmail(account.email)
    if (existing) return `ya existía: ${account.email}`

    try {
      await auth.api.signUpEmail({
        body: {
          email: account.email,
          password: account.password,
          name: account.name,
        },
      })
      return `creado: ${account.email}`
    } catch (error) {
      return `error al crear ${account.email}: ${(error as Error).message}`
    }
  }

  private async applyRoleAndLinks(account: SeedAccount): Promise<void> {
    const row = await this.userRepository.findByEmail(account.email)
    if (!row) return

    await this.userRepository.updateRole(row.id, account.role)

    if (account.patientId) {
      await this.patientRepository.update(account.patientId, {
        userId: row.id,
      })
    }
    if (account.medicId) {
      await this.medicRepository.update(account.medicId, { userId: row.id })
    }
  }
}
