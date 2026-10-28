import "server-only"
import { auth } from "@/lib/auth/authServer"
import type { Role, UserInput, UserRow } from "@/models/User"
import type { UserRepository } from "@/repository/UserRepository"
import type { MedicService } from "./MedicService"
import type { PatientService } from "./PatientService"

export class UserService {
  private repository: UserRepository
  private medicService: MedicService
  private patientService: PatientService

  constructor(
    repository: UserRepository,
    medicService: MedicService,
    patientService: PatientService
  ) {
    this.repository = repository
    this.medicService = medicService
    this.patientService = patientService
  }

  findAll(): Promise<UserRow[]> {
    return this.repository.findAll()
  }

  /**
   * Better Auth owns password hashing, so the account is created through its
   * sign-up API and only then promoted to the requested role.
   */
  async create(input: UserInput, password: string): Promise<UserRow> {
    const existing = await this.repository.findByEmail(input.email)
    if (existing) {
      throw new Error("Ya existe un usuario con ese email")
    }

    await auth.api.signUpEmail({
      body: { email: input.email, password, name: input.name },
    })

    const created = await this.repository.findByEmail(input.email)
    if (!created) {
      throw new Error("No se pudo crear la cuenta")
    }

    await this.applyRole(created.id, created.name, created.email, input.role)

    return (await this.repository.findById(created.id)) ?? created
  }

  async update(
    id: string,
    input: UserInput,
    currentUserId: string
  ): Promise<UserRow | undefined> {
    const target = await this.repository.findById(id)
    if (!target) throw new Error("El usuario no existe")

    const duplicate = await this.repository.findOtherByEmail(input.email, id)
    if (duplicate) {
      throw new Error("Ya existe otro usuario con ese email")
    }

    await this.assertAdminSeatSurvives(target, input.role, currentUserId)

    // El rol anterior se copia ANTES del UPDATE. Compararlo después solo
    // funciona mientras el repositorio devuelva instancias nuevas, y de eso
    // depende que al pasar a médico o paciente se le cree la ficha.
    const previousRole = target.role

    const updated = await this.repository.updateProfile(id, input)
    if (input.role !== previousRole) {
      await this.applyRole(id, input.name, input.email, input.role)
    }
    return updated
  }

  async remove(
    id: string,
    currentUserId: string
  ): Promise<{ id: string } | undefined> {
    if (id === currentUserId) {
      throw new Error("No podés eliminar tu propia cuenta")
    }

    const target = await this.repository.findById(id)
    if (!target) throw new Error("El usuario no existe")

    if (target.role === "admin") {
      const admins = await this.repository.countByRole("admin")
      if (admins <= 1) {
        throw new Error(
          "No se puede eliminar al último administrador del sistema"
        )
      }
    }

    return this.repository.delete(id)
  }

  /**
   * Blocks the change that would leave the system with no administrator and
   * nobody able to reach the admin panel again.
   */
  private async assertAdminSeatSurvives(
    target: UserRow,
    nextRole: Role,
    currentUserId: string
  ): Promise<void> {
    if (target.role !== "admin" || nextRole === "admin") return

    const admins = await this.repository.countByRole("admin")
    if (admins <= 1) {
      throw new Error("Debe quedar al menos un administrador en el sistema")
    }
    if (target.id === currentUserId) {
      throw new Error("No podés quitarte a vos mismo el rol de administrador")
    }
  }

  /** Keeps the role column and the matching domain record in sync. */
  private async applyRole(
    userId: string,
    name: string,
    email: string,
    role: Role
  ): Promise<void> {
    await this.repository.updateRole(userId, role)

    if (role === "patient") {
      await this.patientService.ensureForUser(userId, name, email)
    } else if (role === "doctor") {
      await this.medicService.ensureForUser(userId, name, email)
    }
  }
}
