"use client"

import { useState } from "react"

import { getInitials } from "@/lib/format/initials"
import type { MedicDto } from "@/models/Medic"
import RowActions from "@/components/admin/RowActions"
import DoctorReviewsDialog from "@/components/DoctorReviewsDialog"
import RatingBadge from "@/components/RatingBadge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export default function MedicsTable({
  medics,
  onEdit,
  onDelete,
}: {
  medics: MedicDto[]
  onEdit: (medic: MedicDto) => void
  onDelete: (medic: MedicDto) => void
}) {
  const [reviewsFor, setReviewsFor] = useState<MedicDto | null>(null)

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Profesional</TableHead>
            <TableHead>Especialidad</TableHead>
            <TableHead className="hidden md:table-cell">Sede</TableHead>
            <TableHead>Calificación</TableHead>
            <TableHead className="hidden lg:table-cell">Contacto</TableHead>
            <TableHead className="hidden xl:table-cell">Matrícula</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medics.map((medic) => (
            <TableRow key={medic.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={medic.avatar} alt="" />
                    <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                      {getInitials(medic.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {medic.firstName} {medic.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground lg:hidden">
                      {medic.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={medic.specialtyName ? "secondary" : "outline"}
                  className="font-normal"
                >
                  {medic.specialtyName || "Sin asignar"}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {medic.branchName ? (
                  <>
                    <p className="text-sm">{medic.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {medic.office
                        ? `Consultorio ${medic.office}`
                        : "Sin consultorio"}
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Sin asignar
                  </span>
                )}
              </TableCell>
              <TableCell>
                {/* Abre la ficha con las opiniones. El promedio de la fila
                    sale de la tabla `reviews`, no de un número cargado a
                    mano: por eso un profesional nuevo no aparece con 5.0. */}
                <button
                  type="button"
                  onClick={() => setReviewsFor(medic)}
                  className="rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Ver las reseñas de ${medic.displayName}`}
                >
                  <RatingBadge
                    rating={medic.rating}
                    reviewCount={medic.reviewCount}
                  />
                </button>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <p className="text-sm">{medic.email}</p>
                <p className="text-xs text-muted-foreground">{medic.phone}</p>
              </TableCell>
              <TableCell className="hidden font-mono text-sm text-muted-foreground xl:table-cell">
                {medic.license}
              </TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(medic)}
                  onDelete={() => onDelete(medic)}
                />
              </TableCell>
            </TableRow>
          ))}
          {!medics.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={7}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No se encontraron registros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DoctorReviewsDialog
        medic={reviewsFor}
        open={reviewsFor !== null}
        onOpenChange={(open) => {
          if (!open) setReviewsFor(null)
        }}
      />
    </Card>
  )
}
