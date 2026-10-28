/**
 * Lógica del tema claro/oscuro, sin React y sin dependencias.
 *
 * La preferencia se guarda en una **cookie**, no en `localStorage`.
 *
 * El motivo es concreto. Con `localStorage` solo el navegador sabe qué tema
 * eligió la persona, así que el HTML que manda el servidor sale siempre en
 * claro y hay que corregirlo con un `<script>` antes del primer pintado para
 * que no haya destello. Ese script es justamente lo que React 19 no acepta
 * dentro del árbol de componentes —avisa que un `<script>` renderizado del
 * lado del cliente nunca se ejecuta— y el aviso salta igual desde un
 * componente de servidor, porque el layout también se rerenderiza en el
 * cliente al navegar.
 *
 * Con una cookie, el servidor lee la preferencia antes de generar el HTML y
 * escribe la clase directamente en `<html>`. No hay script, no hay aviso, no
 * hay destello, y el modo "seguir al sistema" lo resuelve el CSS con
 * `prefers-color-scheme` sin que intervenga JavaScript en ningún momento.
 */

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_COOKIE = "theme"

/** Un año. La preferencia visual no tiene por qué caducar antes. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const THEMES: readonly Theme[] = ["light", "dark", "system"]

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)"

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

/**
 * Interpreta el valor de la cookie. Cualquier cosa que no sea un tema válido
 * —una cookie editada a mano, un valor de una versión anterior, `undefined`—
 * cae en el respaldo en lugar de romper la página.
 */
export function normalizeTheme(
  stored: string | null | undefined,
  fallback: Theme = "system"
): Theme {
  return isTheme(stored) ? stored : fallback
}

/**
 * Clase que va en `<html>`.
 *
 * "system" no lleva ninguna: la ausencia de clase es lo que habilita la rama
 * `prefers-color-scheme` del variante `dark` en `globals.css`. Y "light" sí
 * lleva clase, aunque parezca redundante, porque es lo que bloquea esa rama
 * cuando alguien eligió claro teniendo el sistema en oscuro.
 */
export function themeClassName(theme: Theme): "" | "light" | "dark" {
  return theme === "system" ? "" : theme
}

/** Traduce la preferencia a lo que realmente se ve. Solo lo necesita el
 *  cliente, para componentes como sonner que piden un tema concreto. */
export function resolveTheme(
  theme: Theme,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light"
  return theme
}

/** El orden del botón que alterna: nunca vuelve a "system" solo. */
export function nextTheme(resolved: ResolvedTheme): Theme {
  return resolved === "dark" ? "light" : "dark"
}

/**
 * Aplica el tema al documento, para que el cambio se vea al instante sin
 * esperar a que el servidor devuelva la próxima navegación.
 *
 * Es la única función que toca el DOM.
 */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

/** Duración de la transición al cambiar de tema. Tiene que coincidir con la
 *  de `.theme-transition` en globals.css; `test/theme-css.test.ts` lo verifica. */
export const THEME_TRANSITION_MS = 320

/**
 * Enciende la transición de colores mientras dura el cambio de tema.
 *
 * La clase se pone antes de cambiar las variables y se saca cuando la
 * animación terminó. Se hace así, y no con una transición permanente sobre
 * `*`, porque eso obligaría al navegador a recalcular estilos en cada hover
 * de cada elemento de la página.
 *
 * Devuelve la función que la apaga, para poder cancelarla si alguien vuelve a
 * cambiar el tema antes de que termine: si no, el temporizador viejo apagaría
 * la transición nueva a mitad de camino.
 */
export function startThemeTransition(
  root: HTMLElement,
  schedule: (fn: () => void, ms: number) => unknown = setTimeout
): () => void {
  root.classList.add("theme-transition")

  // Fuerza al navegador a resolver los estilos AHORA, con la transición ya
  // declarada y los colores todavía viejos. Sin esto, poner la clase de
  // transición y la del tema en el mismo bloque síncrono deja las dos en el
  // mismo recálculo: el navegador no ve un valor "de partida" y salta al
  // color nuevo sin animar. Se comprobó en Chromium: sin el reflow el cambio
  // era instantáneo unas veces y animado otras.
  void root.offsetHeight

  const timer = schedule(() => {
    root.classList.remove("theme-transition")
  }, THEME_TRANSITION_MS)

  return () => {
    clearTimeout(timer as ReturnType<typeof setTimeout>)
    root.classList.remove("theme-transition")
  }
}

/**
 * Cookie serializada. `SameSite=Lax` alcanza —no es un dato sensible y no se
 * usa para nada entre sitios— y no lleva `HttpOnly` a propósito: la escribe
 * el cliente cuando se toca el botón.
 */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
}
