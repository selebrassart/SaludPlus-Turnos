/**
 * El DNI se guarda como dígitos puros y se muestra con puntos.
 *
 * Los datos de carga inicial venían con formato ("35.812.443") y los usuarios
 * escriben de las dos formas, así que se normaliza al entrar y se formatea al
 * salir. Guardar el formato haría fallar cualquier búsqueda o comparación.
 */

export const DNI_MIN_DIGITS = 7
export const DNI_MAX_DIGITS = 8

/** Deja solo los dígitos: "35.812.443" y "35 812 443" dan "35812443". */
export function normalizeDni(value: string): string {
  return value.replace(/\D/g, "")
}

/** "35812443" → "35.812.443". Devuelve el valor tal cual si no es un DNI válido. */
export function formatDni(value: string): string {
  const digits = normalizeDni(value)
  if (!digits) return ""
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
