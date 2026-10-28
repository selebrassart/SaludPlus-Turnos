import type { Role } from "./User"

export interface PatientProfileSummary {
  dni: string
  phone: string
  birthDate: string
  bloodType?: string | null
  memberSince: string
  total: number
  upcoming: number
  completed: number
}

export interface DoctorProfileSummary {
  specialtyName: string
  license: string
  /** Promedio de reseñas; solo tiene sentido si reviewCount > 0. */
  rating: number
  reviewCount: number
  branchName: string
  office: string
  yearsExperience: number
  phone: string
  workDays: number[]
  todayTotal: number
  todayCompleted: number
  todayPending: number
}

export interface AdminProfileSummary {
  totalPatients: number
  totalDoctors: number
  totalSpecialties: number
  totalAppointments: number
  scheduled: number
}

export interface ProfileSummary {
  role: Role
  name: string
  email: string
  image?: string | null
  patient?: PatientProfileSummary
  doctor?: DoctorProfileSummary
  admin?: AdminProfileSummary
}
