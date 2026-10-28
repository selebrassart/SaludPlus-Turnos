"use client"

import { Pencil, Trash2 } from "lucide-react"
import { resolveSpecialtyIcon } from "@/lib/specialtyIcons"
import type { SpecialtyDto } from "@/models/Specialty"
import Reveal, { staggerDelay } from "@/components/Reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function SpecialtiesGrid({
  specialties,
  onEdit,
  onDelete,
}: {
  specialties: SpecialtyDto[]
  onEdit: (specialty: SpecialtyDto) => void
  onDelete: (specialty: SpecialtyDto) => void
}) {
  if (!specialties.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No se encontraron especialidades.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {specialties.map((specialty, index) => {
        const Icon = resolveSpecialtyIcon(specialty.icon)
        return (
          <Reveal key={specialty.id} delay={staggerDelay(index, 50)} className="h-full">
            <Card className="lift-on-hover h-full hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {specialty.activeDoctors}{" "}
                    {specialty.activeDoctors === 1 ? "médico" : "médicos"}
                  </Badge>
                </div>
                <CardTitle className="mt-2">{specialty.name}</CardTitle>
                <CardDescription>{specialty.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(specialty)}
                >
                  <Pencil data-icon="inline-start" />
                  Editar
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Eliminar ${specialty.name}`}
                        onClick={() => onDelete(specialty)}
                      />
                    }
                  >
                    <Trash2 />
                  </TooltipTrigger>
                  <TooltipContent>Eliminar especialidad</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </Reveal>
        )
      })}
    </div>
  )
}
