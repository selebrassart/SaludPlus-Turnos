"use client"

import * as React from "react"
import {
  DARK_MEDIA_QUERY,
  THEMES,
  applyTheme,
  nextTheme,
  resolveTheme,
  startThemeTransition,
  themeCookie,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme"

/**
 * Proveedor de tema propio, en reemplazo de `next-themes`.
 *
 * No renderiza ninguna etiqueta: solo estado. La preferencia llega ya
 * resuelta desde el layout, que la leyó de la cookie del lado del servidor,
 * así que este componente no tiene que adivinar nada en el primer render ni
 * hay diferencia entre lo que pintó el servidor y lo que hidrata el cliente.
 *
 * Ver `src/lib/theme.ts` para por qué cookie y no `localStorage`.
 */

interface ThemeContextValue {
  /** Lo que la persona eligió, incluido "system". */
  theme: Theme
  /** Lo que efectivamente se está viendo: nunca "system". */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  /** Alterna entre claro y oscuro partiendo de lo que se ve ahora. */
  toggleTheme: () => void
  themes: readonly Theme[]
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme necesita estar dentro de <ThemeProvider>")
  }

  return context
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export default function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  /** Lo que decía la cookie cuando el servidor generó esta página. */
  initialTheme: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme)

  // Arranca en `false` en el servidor y en el primer render del cliente, que
  // es lo que evita el desajuste de hidratación. Solo importa para el valor
  // de `resolvedTheme` cuando el tema es "system"; el color de la página en
  // ese caso lo decide el CSS, no este estado.
  const [systemDark, setSystemDark] = React.useState(false)

  React.useEffect(() => {
    const query = window.matchMedia(DARK_MEDIA_QUERY)
    const sync = () => setSystemDark(query.matches)

    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  const resolvedTheme = resolveTheme(theme, systemDark)

  // Apaga la transición del cambio anterior si todavía está corriendo.
  const cancelTransition = React.useRef<(() => void) | null>(null)

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)

    const root = document.documentElement

    cancelTransition.current?.()
    // La transición se enciende ANTES de tocar los colores: si se hiciera
    // después, el navegador ya habría pintado el estado final.
    cancelTransition.current = startThemeTransition(root)

    // La clase se aplica acá y no en un efecto para que el cambio arranque en
    // el mismo cuadro en que se suelta el botón.
    applyTheme(root, next)
    document.cookie = themeCookie(next)
  }, [])

  // Si el componente se desmonta a mitad de la transición, el temporizador no
  // puede quedar tocando el DOM.
  React.useEffect(() => () => cancelTransition.current?.(), [])

  const toggleTheme = React.useCallback(() => {
    setTheme(nextTheme(resolvedTheme))
  }, [setTheme, resolvedTheme])

  // Atajo de teclado: "D" alterna el tema, salvo mientras se escribe.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== "d") return
      if (isTypingTarget(event.target)) return

      toggleTheme()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleTheme])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, themes: THEMES }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
