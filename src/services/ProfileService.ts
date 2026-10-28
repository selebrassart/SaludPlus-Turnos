import "server-only"
import { todayISODate } from "@/lib/format/date"
import type { ProfileSummary } from "@/models/Profile"
import type { SessionUser } from "@/models/User"
import type { AppointmentRepository } from "@/repository/AppointmentRepository"
import type { MedicRepository } from "@/repository/MedicRepository"
import type { PatientRepository } from "@/repository/PatientRepository"
import type { SpecialtyRepository } from "@/repository/SpecialtyRepository"

export class ProfileService {
  private patientRepository: PatientRepository
  private medicRepository: MedicRepository
  private specialtyRepository: SpecialtyRepository
  private appointmentRepository: AppointmentRepository

  constructor(
    patientRepository: PatientRepository,
    medicRepository: MedicRepository,
    specialtyRepository: SpecialtyRepository,
    appointmentRepository: AppointmentRepository
  ) {
    this.patientRepository = patientRepository
    this.medicRepository = medicRepository
    this.specialtyRepository = specialtyRepository
    this.appointmentRepository = appointmentRepository
  }

  async getSummary(user: SessionUser): Promise<ProfileSummary> {
    const base = {
      role: user.role,
      name: user.name,
      email: user.email,
      image: user.image,
    }

    if (user.role === "patient") return this.getPatientSummary(user, base)
    if (user.role === "doctor") return this.getDoctorSummary(user, base)
    return this.getAdminSummary(base)
  }

  private async getPatientSummary(
    user: SessionUser,
    base: Pick<ProfileSummary, "role" | "name" | "email" | "image">
  ): Promise<ProfileSummary> {
    const patient = await this.patientRepository.findByUserId(user.id)
    const appointments = patient
      ? await this.appointmentRepository.findByPatientId(patient.id)
      : []
    const today = todayISODate()

    return {
      ...base,
      patient: {
        dni: patient?.dni ?? "—",
        phone: patient?.phone ?? "—",
        birthDate: patient?.birthDate ?? "—",
        bloodType: patient?.bloodType,
        memberSince: patient?.createdAt ?? "—",
        total: appointments.length,
        upcoming: appointments.filter(
          (appointment) =>
            appointment.status === "scheduled" && appointment.date >= today
        ).length,
        completed: appointments.filter(
          (appointment) => appointment.status === "completed"
        ).length,
      },
    }
  }

  private async getDoctorSummary(
    user: SessionUser,
    base: Pick<ProfileSummary, "role" | "name" | "email" | "image">
  ): Promise<ProfileSummary> {
    const medic = await this.medicRepository.findByUserId(user.id)
    const todayAppointments = medic
      ? await this.appointmentRepository.findByDoctorAndDate(
          medic.id,
          todayISODate()
        )
      : []

    return {
      ...base,
      doctor: {
        specialtyName: medic?.specialtyName ?? "—",
        license: medic?.license ?? "—",
        rating: medic?.rating ?? 0,
        reviewCount: medic?.reviewCount ?? 0,
        branchName: medic?.branchName || "Sin asignar",
        office: medic?.office || "—",
        yearsExperience: medic?.yearsExperience ?? 0,
        phone: medic?.phone ?? "—",
        workDays: medic?.workDays ?? [],
        todayTotal: todayAppointments.length,
        todayCompleted: todayAppointments.filter(
          (appointment) => appointment.status === "completed"
        ).length,
        todayPending: todayAppointments.filter(
          (appointment) => appointment.status === "scheduled"
        ).length,
      },
    }
  }

  private async getAdminSummary(
    base: Pick<ProfileSummary, "role" | "name" | "email" | "image">
  ): Promise<ProfileSummary> {
    const [patients, medics, specialties, appointments] = await Promise.all([
      this.patientRepository.findAll(),
      this.medicRepository.findAll(),
      this.specialtyRepository.findAll(),
      this.appointmentRepository.findAll(),
    ])

    return {
      ...base,
      admin: {
        totalPatients: patients.length,
        totalDoctors: medics.length,
        totalSpecialties: specialties.length,
        totalAppointments: appointments.length,
        scheduled: appointments.filter(
          (appointment) => appointment.status === "scheduled"
        ).length,
      },
    }
  }
}
