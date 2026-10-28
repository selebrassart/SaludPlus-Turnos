"use client"

import { MapPin } from "lucide-react"
import type { BranchDto } from "@/models/Branch"
import RowActions from "@/components/admin/RowActions"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function BranchesTable({
  branches,
  onEdit,
  onDelete,
}: {
  branches: BranchDto[]
  onEdit: (branch: BranchDto) => void
  onDelete: (branch: BranchDto) => void
}) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Sede</TableHead>
            <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
            <TableHead>Profesionales</TableHead>
            <TableHead className="hidden sm:table-cell">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{branch.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {branch.address}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {branch.phone || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={branch.doctorCount ? "secondary" : "outline"}
                  className="font-normal"
                >
                  {branch.doctorCount}{" "}
                  {branch.doctorCount === 1 ? "médico" : "médicos"}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant={branch.active ? "secondary" : "outline"}
                  className="font-normal"
                >
                  {branch.active ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(branch)}
                  onDelete={() => onDelete(branch)}
                  deleteDisabled={branch.doctorCount > 0}
                  deleteHint={
                    branch.doctorCount > 0
                      ? "Tiene médicos asignados: reasignalos o desactivá la sede"
                      : "Eliminar"
                  }
                />
              </TableCell>
            </TableRow>
          ))}
          {!branches.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={5}
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
