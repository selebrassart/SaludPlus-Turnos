"use client"

import { getInitials } from "@/lib/format/initials"
import type { Role, UserDto } from "@/models/User"
import RowActions from "@/components/admin/RowActions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

const roleLabels: Record<Role, string> = {
  patient: "Paciente",
  doctor: "Médico",
  admin: "Administrador",
}

const roleVariants: Record<Role, "secondary" | "default" | "outline"> = {
  patient: "secondary",
  doctor: "outline",
  admin: "default",
}

export default function UsersTable({
  users,
  onEdit,
  onDelete,
}: {
  users: UserDto[]
  onEdit: (user: UserDto) => void
  onDelete: (user: UserDto) => void
}) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Usuario</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="hidden lg:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Alta</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user.name}
                      {user.isCurrent && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (vos)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground lg:hidden">
                      {user.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={roleVariants[user.role]} className="font-normal">
                  {roleLabels[user.role]}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {user.email}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {user.createdAt}
              </TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(user)}
                  onDelete={() => onDelete(user)}
                  deleteDisabled={user.isCurrent}
                  deleteHint={
                    user.isCurrent
                      ? "No podés eliminar tu propia cuenta"
                      : "Eliminar"
                  }
                />
              </TableCell>
            </TableRow>
          ))}
          {!users.length && (
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
