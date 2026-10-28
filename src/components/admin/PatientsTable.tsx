"use client"

import { calculateAge, formatShortDate } from "@/lib/format/date"
import { formatDni } from "@/lib/format/dni"
import { getInitials } from "@/lib/format/initials"
import type { PatientDto } from "@/models/Patient"
import RowActions from "@/components/admin/RowActions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PatientsTable({
  patients,
  onEdit,
  onDelete,
}: {
  patients: PatientDto[]
  onEdit: (patient: PatientDto) => void
  onDelete: (patient: PatientDto) => void
}) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Paciente</TableHead>
            <TableHead className="hidden md:table-cell">DNI</TableHead>
            <TableHead className="hidden lg:table-cell">Contacto</TableHead>
            <TableHead className="hidden sm:table-cell">Edad</TableHead>
            <TableHead className="hidden xl:table-cell">Alta</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                      {getInitials(`${patient.firstName} ${patient.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {patient.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">
                {formatDni(patient.dni)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <p className="text-sm">{patient.email}</p>
                <p className="text-xs text-muted-foreground">{patient.phone}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {calculateAge(patient.birthDate)} años
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                {formatShortDate(patient.createdAt)}
              </TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(patient)}
                  onDelete={() => onDelete(patient)}
                />
              </TableCell>
            </TableRow>
          ))}
          {!patients.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No se encontraron registros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
