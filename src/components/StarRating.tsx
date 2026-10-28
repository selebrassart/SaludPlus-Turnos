import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAX_SCORE } from "@/models/Review"

/**
 * Cinco estrellas con las primeras N rellenas.
 *
 * A diferencia de `RatingBadge`, que muestra el número ("4.3"), esto muestra
 * la forma: sirve para una reseña individual, donde el puntaje es un entero y
 * un "4.0" quedaría raro.
 *
 * El componente entero lleva `aria-label` y las estrellas van marcadas como
 * decorativas: un lector de pantalla que anunciara "estrella, estrella,
 * estrella..." cinco veces sería inútil.
 */
export default function StarRating({
  score,
  className,
  size = "size-4",
}: {
  score: number
  className?: string
  size?: string
}) {
  return (
    <span
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${score} de ${MAX_SCORE} estrellas`}
    >
      {Array.from({ length: MAX_SCORE }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            size,
            index < score
              ? "fill-warning text-warning"
              : "text-muted-foreground/35"
          )}
        />
      ))}
    </span>
  )
}
