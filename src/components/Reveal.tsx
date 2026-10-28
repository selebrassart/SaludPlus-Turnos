import type React from "react"
import { cn } from "@/lib/utils"

/**
 * Entrada suave para bloques de contenido.
 *
 * El retraso va como estilo en línea y no como clase de Tailwind porque el
 * escalonado depende del índice del elemento: una clase por cada valor posible
 * no se puede generar en tiempo de compilación.
 *
 * `animationFillMode: both` es lo que evita el parpadeo: sin eso, el elemento
 * se dibuja visible, espera el retraso y recién ahí salta al estado inicial de
 * la animación.
 *
 * Quien tenga activado "reducir movimiento" en su sistema no ve nada de esto:
 * la regla global en globals.css anula las animaciones.
 */
export default function Reveal({
  delay = 0,
  className,
  children,
}: {
  /** Milisegundos de espera antes de aparecer. */
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  )
}

/** Retraso escalonado con tope, para que una lista larga no tarde una eternidad. */
export function staggerDelay(index: number, step = 60, max = 400): number {
  return Math.min(index * step, max)
}
