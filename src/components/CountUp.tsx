"use client"

import { useEffect, useRef, useState } from "react"

/** Curva de desaceleración: arranca rápido y frena al llegar. */
function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

function prefiereMenosMovimiento(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Anima un número desde cero hasta su valor.
 *
 * Se salta la animación por completo si el sistema pide reducir movimiento, y
 * también para el cero: contar "de 0 a 0" solo produce un parpadeo.
 */
export default function CountUp({
  value,
  durationMs = 700,
}: {
  value: number
  durationMs?: number
}) {
  const [shown, setShown] = useState(value)
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (value === 0 || prefiereMenosMovimiento()) {
      setShown(value)
      return
    }

    const start = performance.now()
    setShown(0)

    function step(now: number) {
      const progress = Math.min((now - start) / durationMs, 1)
      setShown(Math.round(easeOutCubic(progress) * value))
      if (progress < 1) {
        frame.current = requestAnimationFrame(step)
      }
    }

    frame.current = requestAnimationFrame(step)

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [value, durationMs])

  // `tabular-nums` fija el ancho de los dígitos: sin eso el número tiembla
  // mientras cambia de 8 a 11.
  return <span className="tabular-nums">{shown}</span>
}
