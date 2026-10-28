import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { THEME_TRANSITION_MS } from "@/lib/theme"

/**
 * El tema oscuro está declarado dos veces en `globals.css`: una bajo la clase
 * `.dark` —la elección explícita— y otra bajo `prefers-color-scheme` para
 * quien no eligió nada. CSS no permite aplicar un mismo bloque de variables
 * desde dos contextos sin repetirlo.
 *
 * La repetición es aceptable solo si algo la vigila. Estas pruebas comparan
 * las dos copias: si alguien retoca un color en una sola, fallan y dicen
 * exactamente cuál quedó distinta.
 */

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8"
)

/** Extrae las variables `--x: valor` de un bloque, ignorando el sangrado. */
function declaraciones(bloque: string): Map<string, string> {
  const mapa = new Map<string, string>()

  for (const linea of bloque.split("\n")) {
    const match = linea.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/)
    if (match) mapa.set(match[1], match[2].trim())
  }

  return mapa
}

function bloqueDeClaseDark(): string {
  const match = css.match(/^\.dark \{\n([\s\S]*?)^\}/m)
  assert.ok(match, "no se encontró el bloque `.dark` en globals.css")
  return match[1]
}

function bloqueDeMediaQuery(): string {
  const match = css.match(
    /@media \(prefers-color-scheme: dark\) \{\s*\n\s*:root:not\(\.light\) \{\n([\s\S]*?)^\s*\}\s*\n\s*\}/m
  )
  assert.ok(
    match,
    "no se encontró el bloque `@media (prefers-color-scheme: dark)` con `:root:not(.light)`"
  )
  return match[1]
}

describe("globals.css · tema oscuro", () => {
  it("existen las dos declaraciones", () => {
    assert.ok(declaraciones(bloqueDeClaseDark()).size > 20)
    assert.ok(declaraciones(bloqueDeMediaQuery()).size > 20)
  })

  it("declaran exactamente las mismas variables", () => {
    const porClase = [...declaraciones(bloqueDeClaseDark()).keys()].sort()
    const porSistema = [...declaraciones(bloqueDeMediaQuery()).keys()].sort()

    assert.deepEqual(
      porSistema,
      porClase,
      "las dos copias del tema oscuro ya no declaran las mismas variables"
    )
  })

  it("les dan exactamente los mismos valores", () => {
    const porClase = declaraciones(bloqueDeClaseDark())
    const porSistema = declaraciones(bloqueDeMediaQuery())

    for (const [nombre, valor] of porClase) {
      assert.equal(
        porSistema.get(nombre),
        valor,
        `${nombre} difiere entre la clase .dark y la media query`
      )
    }
  })

  it("el variante `dark` contempla la clase y la preferencia del sistema", () => {
    // Si alguien lo simplifica a solo la clase, el modo "seguir al sistema"
    // deja de funcionar sin que falle ninguna otra prueba.
    const variante = css.match(/@custom-variant dark \{[\s\S]*?\n\}/)
    assert.ok(variante, "no se encontró `@custom-variant dark`")
    assert.ok(
      variante[0].includes(".dark"),
      "el variante `dark` ya no mira la clase .dark"
    )
    assert.ok(
      variante[0].includes("prefers-color-scheme: dark"),
      "el variante `dark` ya no mira la preferencia del sistema"
    )
    assert.ok(
      variante[0].includes(".light"),
      "el variante `dark` ya no deja que .light bloquee la preferencia del sistema"
    )
  })

  it("la duración de la transición coincide con la del código", () => {
    // Si se cambia una sola, el proveedor saca la clase antes o después de
    // que termine la animación y el cambio se ve cortado.
    const bloque = css.match(/html\.theme-transition[\s\S]*?\n  \}/)
    assert.ok(bloque, "no se encontró la regla `.theme-transition`")
    assert.ok(
      bloque[0].includes(`${THEME_TRANSITION_MS}ms`),
      `el CSS no usa ${THEME_TRANSITION_MS}ms`
    )
  })

  it("cada token de color está registrado con @property", () => {
    // Una variable CSS sin registrar es texto para el navegador y no se
    // interpola: el token cambiaría de golpe y esa parte de la pantalla
    // llegaría antes que el resto.
    const registrados = new Set(
      [...css.matchAll(/@property (--[\w-]+) \{/g)].map((m) => m[1])
    )

    const bloque = css.match(/\n:root \{\n((?:\s+--[\w-]+:[^\n]+\n)+)\}/)
    assert.ok(bloque, "no se encontró el bloque `:root` de tokens")

    const colores = [...bloque[1].matchAll(/(--[\w-]+):\s*(oklch|#|rgb|hsl)/g)]
    assert.ok(colores.length > 20, `solo se hallaron ${colores.length} tokens`)

    const faltan = colores
      .map((m) => m[1])
      .filter((nombre) => !registrados.has(nombre))

    assert.deepEqual(faltan, [], "tokens de color sin @property")
  })

  it("la transición anima los tokens y no cada elemento", () => {
    // Transicionar `background-color` en `*` son cientos de animaciones
    // independientes y se nota que unas partes llegan antes que otras.
    const bloque = css.match(/html\.theme-transition \{[\s\S]*?\n  \}/)
    assert.ok(bloque)
    assert.ok(
      bloque[0].includes("transition-property: --"),
      "la transición ya no se aplica sobre los tokens"
    )
    assert.equal(
      /html\.theme-transition \*/.test(css),
      false,
      "volvió la transición por elemento, que es la que se desincronizaba"
    )
  })

  it("todo token registrado se transiciona, y al revés", () => {
    const bloque = css.match(/html\.theme-transition \{[\s\S]*?\n  \}/)
    assert.ok(bloque)

    const enTransicion = new Set(
      (bloque[0].match(/--[\w-]+/g) ?? []).filter((n) => n !== "--theme")
    )
    const registrados = [
      ...css.matchAll(/@property (--[\w-]+) \{/g),
    ].map((m) => m[1])

    for (const nombre of registrados) {
      assert.ok(
        enTransicion.has(nombre),
        `${nombre} está registrado pero no se transiciona: cambiaría de golpe`
      )
    }
  })

  it("la transición respeta a quien pidió menos movimiento", () => {
    // La regla lleva `!important` y está DESPUÉS del bloque de
    // prefers-reduced-motion, así que sin su propia media query le
    // devolvería el movimiento a quien lo desactivó.
    const indice = css.indexOf("html.theme-transition")
    assert.notEqual(indice, -1)

    const antes = css.slice(0, indice)
    const aperturaMedia = antes.lastIndexOf(
      "@media (prefers-reduced-motion: no-preference)"
    )
    assert.notEqual(
      aperturaMedia,
      -1,
      "`.theme-transition` no está dentro de @media (prefers-reduced-motion: no-preference)"
    )

    // Y que esa media query siga abierta al llegar a la regla.
    const tramo = css.slice(aperturaMedia, indice)
    const abre = (tramo.match(/\{/g) ?? []).length
    const cierra = (tramo.match(/\}/g) ?? []).length
    assert.ok(abre > cierra, "la media query se cerró antes de la regla")
  })

  it("no queda ningún <script> en el layout", () => {
    // La razón de ser de todo este diseño: React 19 avisa por consola ante
    // un `<script>` dentro del árbol de componentes, incluso desde un
    // componente de servidor.
    const layout = readFileSync(
      new URL("../src/app/layout.tsx", import.meta.url),
      "utf8"
    )
    assert.equal(
      /<script/.test(layout),
      false,
      "volvió a aparecer un <script> en layout.tsx"
    )
  })
})
