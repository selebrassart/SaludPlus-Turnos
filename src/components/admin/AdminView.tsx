"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  HeartPulse,
  MapPin,
  Plus,
  Search,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { normalizeDni } from "@/lib/format/dni"
import type { ActionResult } from "@/lib/actionResult"
import type { BranchDto } from "@/models/Branch"
import type { MedicDto } from "@/models/Medic"
import type { PatientDto } from "@/models/Patient"
import type { SpecialtyDto } from "@/models/Specialty"
import type { UserDto } from "@/models/User"
import { deleteBranch, saveBranch } from "@/routes/BranchRoutes"
import { deleteMedic, saveMedic } from "@/routes/MedicRoutes"
import { deletePatient, savePatient } from "@/routes/PatientRoutes"
import { deleteSpecialty, saveSpecialty } from "@/routes/SpecialtyRoutes"
import { deleteUser, saveUser } from "@/routes/UserRoutes"
import ConfirmDialog from "@/components/ConfirmDialog"
import BranchesTable from "@/components/admin/BranchesTable"
import MedicsTable from "@/components/admin/MedicsTable"
import PatientsTable from "@/components/admin/PatientsTable"
import RecordFormDialog, {
  newRecordLabels,
  type AdminRecord,
  type EditableEntity,
  type RecordFormValues,
} from "@/components/admin/RecordFormDialog"
import SpecialtiesGrid from "@/components/admin/SpecialtiesGrid"
import UsersTable from "@/components/admin/UsersTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DeleteTarget {
  id: string
  name: string
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  if (!query.trim()) return true
  const needle = query.toLowerCase()
  return fields.some((field) => field?.toLowerCase().includes(needle))
}

export default function AdminView({
  users: initialUsers,
  patients: initialPatients,
  medics: initialMedics,
  specialties: initialSpecialties,
  branches: initialBranches,
}: {
  users: UserDto[]
  patients: PatientDto[]
  medics: MedicDto[]
  specialties: SpecialtyDto[]
  branches: BranchDto[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<EditableEntity>("users")
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRecord | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null)
  const [pending, startTransition] = useTransition()

  const totalRecords =
    initialUsers.length +
    initialPatients.length +
    initialMedics.length +
    initialSpecialties.length +
    initialBranches.length

  const filteredUsers = useMemo(
    () =>
      initialUsers.filter((user) => matches(query, user.name, user.email)),
    [initialUsers, query]
  )
  const filteredPatients = useMemo(() => {
    // El DNI puede estar guardado con puntos o sin ellos, y la persona puede
    // escribirlo de cualquiera de las dos formas: se comparan solo los dígitos.
    const dniQuery = normalizeDni(query)

    return initialPatients.filter(
      (patient) =>
        matches(
          query,
          patient.firstName,
          patient.lastName,
          patient.email,
          patient.dni
        ) ||
        (dniQuery.length > 0 && normalizeDni(patient.dni).includes(dniQuery))
    )
  }, [initialPatients, query])
  const filteredMedics = useMemo(
    () =>
      initialMedics.filter((medic) =>
        matches(
          query,
          medic.firstName,
          medic.lastName,
          medic.email,
          medic.specialtyName
        )
      ),
    [initialMedics, query]
  )
  const filteredSpecialties = useMemo(
    () =>
      initialSpecialties.filter((specialty) =>
        matches(query, specialty.name, specialty.description)
      ),
    [initialSpecialties, query]
  )

  const filteredBranches = useMemo(
    () =>
      initialBranches.filter((branch) =>
        matches(query, branch.name, branch.address, branch.phone)
      ),
    [initialBranches, query]
  )

  function handleTabChange(value: string) {
    setTab(value as EditableEntity)
    setQuery("")
  }

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(record: AdminRecord) {
    setEditing(record)
    setFormError(null)
    setDialogOpen(true)
  }

  /**
   * Mutations return the failure as a value instead of throwing, so the message
   * written in the validation layer is the one the admin actually reads.
   */
  function runSave(operation: () => Promise<ActionResult<unknown>>) {
    setFormError(null)
    startTransition(async () => {
      const result = await operation()
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      toast.success(editing ? "Registro actualizado" : "Registro creado")
      setDialogOpen(false)
      setEditing(null)
      router.refresh()
    })
  }

  function handleSubmit(values: RecordFormValues) {
    const id = editing?.id

    if (tab === "patients") {
      const record = editing as PatientDto | null
      runSave(() =>
        savePatient({
          id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          dni: values.dni,
          birthDate: values.birthDate,
          bloodType: record?.bloodType,
        })
      )
      return
    }

    if (tab === "doctors") {
      const record = editing as MedicDto | null
      runSave(() =>
        saveMedic({
          id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          specialtyId: values.specialtyId,
          branchId: values.branchId,
          office: values.office,
          license: values.license,
          avatar: record?.avatar,
          // `rating` no se manda: es el promedio de las reseñas, no un dato
          // que el administrador pueda escribir.
          yearsExperience: values.yearsExperience,
          workDays: values.workDays,
          startTime: values.startTime,
          endTime: values.endTime,
          breakStart: values.breakStart,
          breakEnd: values.breakEnd,
          slotMinutes: values.slotMinutes,
        })
      )
      return
    }

    if (tab === "branches") {
      runSave(() =>
        saveBranch({
          id,
          name: values.name,
          address: values.address,
          phone: values.phone,
          active: values.active,
        })
      )
      return
    }

    if (tab === "specialties") {
      runSave(() =>
        saveSpecialty({
          id,
          name: values.name,
          description: values.description,
          icon: values.icon,
        })
      )
      return
    }

    runSave(() =>
      saveUser(
        {
          id,
          name: values.name,
          email: values.email,
          role: values.role,
        },
        values.password
      )
    )
  }

  function confirmDelete() {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)

    startTransition(async () => {
      const remove =
        tab === "patients"
          ? deletePatient
          : tab === "doctors"
            ? deleteMedic
            : tab === "specialties"
              ? deleteSpecialty
              : tab === "branches"
                ? deleteBranch
                : deleteUser

      const result = await remove(target.id)
      if (!result.ok) {
        // The row is still there, so nothing is removed from the UI either.
        toast.error(result.error)
        return
      }
      toast.success(`${target.name} eliminado`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Panel de administración
        </h1>
        <p className="text-muted-foreground">
          Gestioná las tablas maestras del sistema · {totalRecords} registros.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="users">
              <Users data-icon="inline-start" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="patients">
              <UserRound data-icon="inline-start" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="doctors">
              <Stethoscope data-icon="inline-start" />
              Médicos
            </TabsTrigger>
            <TabsTrigger value="specialties">
              <HeartPulse data-icon="inline-start" />
              Especialidades
            </TabsTrigger>
            <TabsTrigger value="branches">
              <MapPin data-icon="inline-start" />
              Sedes
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                className="pl-9"
                aria-label="Buscar registros"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{newRecordLabels[tab]}</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        <TabsContent value="users">
          <UsersTable
            users={filteredUsers}
            onEdit={openEdit}
            onDelete={(user) => setToDelete({ id: user.id, name: user.name })}
          />
        </TabsContent>

        <TabsContent value="patients">
          <PatientsTable
            patients={filteredPatients}
            onEdit={openEdit}
            onDelete={(patient) =>
              setToDelete({
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
              })
            }
          />
        </TabsContent>

        <TabsContent value="doctors">
          <MedicsTable
            medics={filteredMedics}
            onEdit={openEdit}
            onDelete={(medic) =>
              setToDelete({
                id: medic.id,
                name: `${medic.firstName} ${medic.lastName}`,
              })
            }
          />
        </TabsContent>

        <TabsContent value="specialties">
          <SpecialtiesGrid
            specialties={filteredSpecialties}
            onEdit={openEdit}
            onDelete={(specialty) =>
              setToDelete({ id: specialty.id, name: specialty.name })
            }
          />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTable
            branches={filteredBranches}
            onEdit={openEdit}
            onDelete={(branch) =>
              setToDelete({ id: branch.id, name: branch.name })
            }
          />
        </TabsContent>
      </Tabs>

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditing(null)
            setFormError(null)
          }
        }}
        entity={tab}
        record={editing}
        specialties={initialSpecialties}
        branches={initialBranches}
        submitting={pending}
        error={formError}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="¿Eliminar registro?"
        description={
          <>
            Estás por eliminar a{" "}
            <span className="font-medium text-foreground">
              {toDelete?.name}
            </span>
            . Esta acción no se puede deshacer.
          </>
        }
        cancelLabel="Cancelar"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
