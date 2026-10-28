"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"

/**
 * Botón para alternar claro/oscuro.
 *
 * Los dos íconos están siempre en el árbol y se muestra uno u otro por CSS,
 * en lugar de elegir cuál renderizar según el estado. La razón es la
 * hidratación: el servidor no sabe qué tema tiene guardado cada persona, así
 * que si el ícono dependiera del estado, el primer render del cliente diría
 * "sol" mientras la página ya está oscura, y React se quejaría del desajuste.
 * La variante `dark:` la resuelve la clase que el script del layout ya dejó
 * puesta en `<html>` antes de que React arranque.
 */
export default function ThemeToggle() {
  const { toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      // El nombre accesible no puede depender del tema por lo mismo que los
      // íconos, así que describe la acción y no el estado actual.
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema (tecla D)"
      className="rounded-full"
    >
      <Sun className="size-[18px] dark:hidden" />
      <Moon className="hidden size-[18px] dark:block" />
    </Button>
  )
}
