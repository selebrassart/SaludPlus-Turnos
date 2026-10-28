import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Muestra estrellas solo cuando hay reseñas que las respalden.
 *
 * Antes el promedio era un número cargado a mano y todo profesional nuevo
 * aparecía con 5.0 sin haber atendido a nadie, justo en la pantalla donde el
 * paciente elige con quién atenderse. Sin reseñas no se inventa una nota.
 */
export default function RatingBadge({
  rating,
  reviewCount,
  className,
  showCount = true,
}: {
  rating: number
  reviewCount: number
  className?: string
  showCount?: boolean
}) {
  if (reviewCount === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        Sin calificaciones
      </span>
    )
  }

  return (
    <span className={cn("flex items-center gap-1", className)}>
      <span className="flex items-center gap-0.5 font-medium text-warning">
        <Star className="size-3.5 fill-current" />
        {rating.toFixed(1)}
      </span>
      {showCount && (
        <span className="text-muted-foreground">
          ({reviewCount} {reviewCount === 1 ? "reseña" : "reseñas"})
        </span>
      )}
    </span>
  )
}
