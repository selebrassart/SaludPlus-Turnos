import "server-only"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser } from "@/lib/auth/session"
import { toPatientDto, type PatientDto } from "@/models/Patient"
import { patientService } from "@/services/container"
import { sanitizePatientInput } from "@/validations/PatientValidation"

export async function findAll(): Promise<PatientDto[]> {
  await requireUser()
  const patients = await patientService.findAll()
  return patients.map(toPatientDto)
}

export async function findOne(id: string): Promise<PatientDto | undefined> {
  await requireUser()
  const patient = await patientService.findOne(id)
  return patient ? toPatientDto(patient) : undefined
}

export async function findMine(): Promise<PatientDto | undefined> {
  const user = await requireUser()

  // Una cuenta con rol "patient" siempre debe tener su ficha: si el alta quedó
  // a medias, se completa acá en vez de mostrar el tablero vacío.
  if (user.role === "patient") {
    const patient = await patientService.findOrCreateForUser(
      user.id,
      user.name,
      user.email
    )
    return toPatientDto(patient)
  }

  const patient = await patientService.findByUserId(user.id)
  return patient ? toPatientDto(patient) : undefined
}

export async function create(input: unknown): Promise<PatientDto> {
  await requireAdmin()
  const patient = await patientService.create(sanitizePatientInput(input))
  revalidatePath("/")
  return toPatientDto(patient)
}

export async function update(
  id: string,
  input: unknown
): Promise<PatientDto | undefined> {
  await requireAdmin()
  const patient = await patientService.update(id, sanitizePatientInput(input))
  revalidatePath("/")
  return patient ? toPatientDto(patient) : undefined
}

export async function remove(id: string): Promise<{ id: string } | undefined> {
  await requireAdmin()
  const result = await patientService.remove(id)
  revalidatePath("/")
  return result
}
