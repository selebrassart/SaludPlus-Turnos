"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function RowActions({
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteHint = "Eliminar",
}: {
  onEdit: () => void
  onDelete: () => void
  /** Set for rows the rules forbid removing, such as your own account. */
  deleteDisabled?: boolean
  deleteHint?: string
}) {
  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label="Editar"
            />
          }
        >
          <Pencil />
        </TooltipTrigger>
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={deleteDisabled}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={deleteHint}
            />
          }
        >
          <Trash2 />
        </TooltipTrigger>
        <TooltipContent>{deleteHint}</TooltipContent>
      </Tooltip>
    </div>
  )
}
