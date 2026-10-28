import "server-only"
import type { Role } from "@/models/User"
import type { UserRepository } from "@/repository/UserRepository"
import type { MedicService } from "./MedicService"
import type { PatientService } from "./PatientService"

export interface AssignRoleResult {
  ok: boolean
  error?: string
}

export class AuthService {
  private userRepository: UserRepository
  private medicService: MedicService
  private patientService: PatientService

  constructor(
    userRepository: UserRepository,
    medicService: MedicService,
    patientService: PatientService
  ) {
    this.userRepository = userRepository
    this.medicService = medicService
    this.patientService = patientService
  }

  /**
   * Persists the role chosen at sign-up and creates the matching domain record
   * so the account shows up in the admin listings.
   */
  async assignRole(userId: string, role: Role): Promise<AssignRoleResult> {
    const row = await this.userRepository.findById(userId)
    if (!row) return { ok: false, error: "Usuario no encontrado" }

    await this.userRepository.updateRole(userId, role)

    if (role === "patient") {
      await this.patientService.ensureForUser(userId, row.name, row.email)
    } else if (role === "doctor") {
      await this.medicService.ensureForUser(userId, row.name, row.email)
    }

    return { ok: true }
  }
}
