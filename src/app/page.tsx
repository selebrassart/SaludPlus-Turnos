import { redirect } from "next/navigation"
import AdminView from "@/components/admin/AdminView"
import DoctorView from "@/components/doctor/DoctorView"
import Navbar from "@/components/Navbar"
import PatientView from "@/components/patient/PatientView"
import { getSessionUser } from "@/lib/auth/session"
import { getAppointments } from "@/routes/AppointmentRoutes"
import { getMedics, getMyMedicProfile } from "@/routes/MedicRoutes"
import { getMyPatientProfile, getPatients } from "@/routes/PatientRoutes"
import { getProfileSummary } from "@/routes/ProfileRoutes"
import {
  getActiveBranches,
  getBranches,
} from "@/routes/BranchRoutes"
import { getMyReviewedAppointmentIds } from "@/routes/ReviewRoutes"
import { getSpecialties } from "@/routes/SpecialtyRoutes"
import { getUsers } from "@/routes/UserRoutes"

export default async function Page() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")

  const profile = await getProfileSummary()

  return (
    <div className="min-h-svh bg-background">
      <Navbar user={user} profile={profile} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="animate-in duration-500 fade-in-50 slide-in-from-bottom-2">
          {user.role === "patient" && <PatientDashboard />}
          {user.role === "doctor" && <DoctorDashboard />}
          {user.role === "admin" && <AdminDashboard />}
        </div>
      </main>
      <footer className="border-t border-border/70 py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          SaludPlus · Sistema de Gestión de Turnos Médicos · Proyecto académico
          de Desarrollo de Software
        </p>
      </footer>
    </div>
  )
}

async function PatientDashboard() {
  const [profile, appointments, specialties, medics, branches, reviewed] =
    await Promise.all([
      getMyPatientProfile(),
      getAppointments(),
      getSpecialties(),
      getMedics(),
      // Solo sedes en servicio: no tiene sentido ofrecer una dada de baja.
      getActiveBranches(),
      getMyReviewedAppointmentIds(),
    ])

  return (
    <PatientView
      patientName={profile?.firstName ?? "Paciente"}
      appointments={appointments}
      specialties={specialties}
      medics={medics}
      branches={branches}
      reviewedAppointmentIds={reviewed}
    />
  )
}

async function DoctorDashboard() {
  const [profile, appointments, patients] = await Promise.all([
    getMyMedicProfile(),
    getAppointments(),
    getPatients(),
  ])

  return (
    <DoctorView
      doctorName={
        profile ? `${profile.firstName} ${profile.lastName}` : "Profesional"
      }
      specialtyName={profile?.specialtyName ?? ""}
      appointments={appointments}
      patients={patients}
    />
  )
}

async function AdminDashboard() {
  const [users, patients, medics, specialties, branches] = await Promise.all([
    getUsers(),
    getPatients(),
    getMedics(),
    getSpecialties(),
    // El panel ve todas, incluidas las inactivas, para poder reactivarlas.
    getBranches(),
  ])

  return (
    <AdminView
      users={users}
      patients={patients}
      medics={medics}
      specialties={specialties}
      branches={branches}
    />
  )
}
