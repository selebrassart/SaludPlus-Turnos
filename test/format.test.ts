import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
  calculateAge,
  daysUntil,
  formatLongDate,
  formatShortDate,
  parseISODate,
  toISODate,
  todayISODate,
} from "@/lib/format/date"
import { formatDni, normalizeDni } from "@/lib/format/dni"
import { getInitials } from "@/lib/format/initials"

/** Fecha ISO desplazada N días respecto de hoy, para pruebas independientes del día en que corren. */
function isoOffsetDays(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

describe("normalizeDni", () => {
  test("deja solo los dígitos", () => {
    assert.equal(normalizeDni("35.812.443"), "35812443")
    assert.equal(normalizeDni("35 812 443"), "35812443")
    assert.equal(normalizeDni("35812443"), "35812443")
  })

  test("descarta letras y símbolos", () => {
    assert.equal(normalizeDni("DNI 35.812.443-X"), "35812443")
  })

  test("una cadena sin dígitos queda vacía", () => {
    assert.equal(normalizeDni("sin numeros"), "")
    assert.equal(normalizeDni(""), "")
  })
})

describe("formatDni", () => {
  test("agrupa de a tres desde la derecha", () => {
    assert.equal(formatDni("35812443"), "35.812.443")
    assert.equal(formatDni("7812443"), "7.812.443")
  })

  test("es idempotente sobre un valor ya formateado", () => {
    assert.equal(formatDni(formatDni("35812443")), "35.812.443")
  })

  test("un valor vacío no produce puntos sueltos", () => {
    assert.equal(formatDni(""), "")
    assert.equal(formatDni("abc"), "")
  })
})

describe("parseISODate", () => {
  test("construye la fecha en hora local, sin corrimiento de día", () => {
    const date = parseISODate("2026-03-15")
    assert.equal(date.getFullYear(), 2026)
    assert.equal(date.getMonth(), 2)
    assert.equal(date.getDate(), 15)
  })

  test("ida y vuelta con toISODate", () => {
    assert.equal(toISODate(parseISODate("2026-01-01")), "2026-01-01")
    assert.equal(toISODate(parseISODate("2026-12-31")), "2026-12-31")
  })

  test("ignora la parte horaria si viene", () => {
    assert.equal(toISODate(parseISODate("2026-03-15T18:30:00Z")), "2026-03-15")
  })
})

describe("calculateAge", () => {
  test("cumple años hoy: la edad ya está cumplida", () => {
    const nacimiento = new Date()
    nacimiento.setFullYear(nacimiento.getFullYear() - 30)
    assert.equal(calculateAge(toISODate(nacimiento)), 30)
  })

  test("cumple años mañana: todavía tiene un año menos", () => {
    const nacimiento = new Date()
    nacimiento.setFullYear(nacimiento.getFullYear() - 30)
    nacimiento.setDate(nacimiento.getDate() + 1)
    assert.equal(calculateAge(toISODate(nacimiento)), 29)
  })

  test("cumplió años ayer", () => {
    const nacimiento = new Date()
    nacimiento.setFullYear(nacimiento.getFullYear() - 30)
    nacimiento.setDate(nacimiento.getDate() - 1)
    assert.equal(calculateAge(toISODate(nacimiento)), 30)
  })

  test("recién nacido", () => {
    assert.equal(calculateAge(todayISODate()), 0)
  })

  test("nacido un 29 de febrero", () => {
    // No se afirma un valor exacto porque depende del día en que corra la
    // prueba: lo que importa es que devuelva un entero razonable y no NaN.
    const edad = calculateAge("2000-02-29")
    assert.ok(Number.isInteger(edad), "la edad debe ser un entero")
    assert.ok(edad >= 25 && edad <= 30, `edad fuera de rango: ${edad}`)
  })
})

describe("daysUntil", () => {
  test("hoy es cero", () => {
    assert.equal(daysUntil(todayISODate()), 0)
  })

  test("mañana es uno", () => {
    assert.equal(daysUntil(isoOffsetDays(1)), 1)
  })

  test("ayer es negativo", () => {
    assert.equal(daysUntil(isoOffsetDays(-1)), -1)
  })

  test("una semana adelante", () => {
    assert.equal(daysUntil(isoOffsetDays(7)), 7)
  })
})

describe("formato de fechas en español", () => {
  test("formatLongDate arma día de semana y mes", () => {
    // 2026-03-15 es domingo.
    assert.equal(formatLongDate("2026-03-15"), "Domingo 15 de marzo")
  })

  test("formatShortDate incluye el año", () => {
    assert.equal(formatShortDate("2026-03-15"), "15 mar 2026")
  })
})

describe("getInitials", () => {
  test("toma la inicial de las dos primeras palabras", () => {
    assert.equal(getInitials("Juan Pérez"), "JP")
  })

  test("un solo nombre da una inicial", () => {
    assert.equal(getInitials("Juan"), "J")
  })

  test("no se rompe con cadena vacía", () => {
    assert.doesNotThrow(() => getInitials(""))
  })
})
