import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  THEMES,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  applyTheme,
  isTheme,
  nextTheme,
  normalizeTheme,
  resolveTheme,
  startThemeTransition,
  THEME_TRANSITION_MS,
  themeClassName,
  themeCookie,
} from "@/lib/theme"

describe("isTheme", () => {
  it("acepta los tres temas válidos", () => {
    assert.equal(isTheme("light"), true)
    assert.equal(isTheme("dark"), true)
    assert.equal(isTheme("system"), true)
  })

  it("rechaza cualquier otra cosa", () => {
    for (const value of [
      "",
      "Light",
      "DARK",
      "auto",
      null,
      undefined,
      0,
      1,
      {},
      [],
      "light ",
    ]) {
      assert.equal(isTheme(value), false, `debería rechazar ${String(value)}`)
    }
  })
})

describe("normalizeTheme", () => {
  it("devuelve el valor de la cookie cuando es válido", () => {
    assert.equal(normalizeTheme("dark"), "dark")
    assert.equal(normalizeTheme("light"), "light")
    assert.equal(normalizeTheme("system"), "system")
  })

  it("cae en el respaldo cuando no hay cookie", () => {
    assert.equal(normalizeTheme(null), "system")
    assert.equal(normalizeTheme(undefined), "system")
  })

  it("cae en el respaldo ante una cookie corrupta", () => {
    // La cookie la puede editar cualquiera desde el navegador: un valor
    // inventado no puede dejar la página sin tema.
    assert.equal(normalizeTheme("borrachera"), "system")
    assert.equal(normalizeTheme("{}"), "system")
    assert.equal(normalizeTheme("<script>"), "system")
  })

  it("respeta el respaldo que se le pase", () => {
    assert.equal(normalizeTheme(null, "light"), "light")
    assert.equal(normalizeTheme("basura", "dark"), "dark")
  })
})

describe("themeClassName", () => {
  it("system no escribe ninguna clase", () => {
    // Es lo que habilita la rama `prefers-color-scheme` del CSS.
    assert.equal(themeClassName("system"), "")
  })

  it("light escribe clase aunque parezca redundante", () => {
    // Sin ella, quien elige claro con el sistema en oscuro vería oscuro.
    assert.equal(themeClassName("light"), "light")
  })

  it("dark escribe su clase", () => {
    assert.equal(themeClassName("dark"), "dark")
  })

  it("solo puede devolver clases que el CSS conoce", () => {
    for (const theme of THEMES) {
      assert.ok(["", "light", "dark"].includes(themeClassName(theme)))
    }
  })
})

describe("resolveTheme", () => {
  it("una preferencia explícita ignora al sistema", () => {
    assert.equal(resolveTheme("light", true), "light")
    assert.equal(resolveTheme("light", false), "light")
    assert.equal(resolveTheme("dark", true), "dark")
    assert.equal(resolveTheme("dark", false), "dark")
  })

  it('"system" sigue al sistema', () => {
    assert.equal(resolveTheme("system", true), "dark")
    assert.equal(resolveTheme("system", false), "light")
  })

  it("nunca devuelve system", () => {
    for (const theme of THEMES) {
      for (const dark of [true, false]) {
        const resolved = resolveTheme(theme, dark)
        assert.ok(
          resolved === "light" || resolved === "dark",
          `${theme}/${dark} devolvió ${resolved}`
        )
      }
    }
  })
})

describe("nextTheme", () => {
  it("alterna entre claro y oscuro", () => {
    assert.equal(nextTheme("dark"), "light")
    assert.equal(nextTheme("light"), "dark")
  })

  it("no vuelve solo a system", () => {
    // Quien tocó el botón eligió a mano: volver a "system" por su cuenta
    // sería descartar esa decisión.
    assert.notEqual(nextTheme("dark"), "system")
    assert.notEqual(nextTheme("light"), "system")
  })
})

describe("applyTheme", () => {
  /** Doble mínimo del elemento raíz: solo lo que la función toca. */
  function fakeRoot() {
    const classes = new Set<string>()
    return {
      classList: {
        toggle(name: string, force: boolean) {
          if (force) classes.add(name)
          else classes.delete(name)
        },
        has: (name: string) => classes.has(name),
      },
      get clases() {
        return [...classes].sort()
      },
    }
  }

  it("dark deja solo la clase dark", () => {
    const root = fakeRoot()
    applyTheme(root as unknown as HTMLElement, "dark")
    assert.deepEqual(root.clases, ["dark"])
  })

  it("light deja solo la clase light", () => {
    const root = fakeRoot()
    applyTheme(root as unknown as HTMLElement, "light")
    assert.deepEqual(root.clases, ["light"])
  })

  it("system no deja ninguna clase", () => {
    const root = fakeRoot()
    applyTheme(root as unknown as HTMLElement, "system")
    assert.deepEqual(root.clases, [])
  })

  it("nunca deja las dos clases a la vez", () => {
    // Si quedaran las dos, `.light` bloquearía la media query y `.dark`
    // pintaría oscuro igual: un estado contradictorio y difícil de ver.
    const root = fakeRoot()
    for (const theme of ["dark", "light", "system", "dark", "light"] as const) {
      applyTheme(root as unknown as HTMLElement, theme)
      assert.ok(
        !(root.classList.has("dark") && root.classList.has("light")),
        `quedaron las dos clases tras aplicar ${theme}`
      )
    }
  })

  it("coincide con lo que escribe el servidor", () => {
    // El cliente aplica la clase al instante y el servidor la escribe en el
    // HTML de la próxima navegación. Si no coincidieran, el tema cambiaría
    // solo al recargar la página.
    for (const theme of THEMES) {
      const root = fakeRoot()
      applyTheme(root as unknown as HTMLElement, theme)
      const esperada = themeClassName(theme)
      assert.deepEqual(root.clases, esperada ? [esperada] : [])
    }
  })
})

describe("themeCookie", () => {
  it("usa el nombre que lee el servidor", () => {
    assert.ok(themeCookie("dark").startsWith(`${THEME_COOKIE}=dark;`))
  })

  it("vale para toda la aplicación y no solo para la ruta actual", () => {
    // Sin `path=/`, el tema elegido en /sign-in no se vería en el panel.
    assert.ok(themeCookie("dark").includes("path=/"))
  })

  it("sobrevive a cerrar el navegador", () => {
    assert.ok(themeCookie("dark").includes(`max-age=${THEME_COOKIE_MAX_AGE}`))
    assert.ok(THEME_COOKIE_MAX_AGE >= 60 * 60 * 24 * 30)
  })

  it("no se manda en pedidos de otros sitios", () => {
    assert.ok(themeCookie("dark").toLowerCase().includes("samesite=lax"))
  })

  it("el valor que escribe siempre lo vuelve a aceptar el servidor", () => {
    for (const theme of THEMES) {
      const valor = themeCookie(theme).split(";")[0].split("=")[1]
      assert.equal(normalizeTheme(valor), theme)
    }
  })
})

describe("startThemeTransition", () => {
  function fakeRoot() {
    const classes = new Set<string>()
    return {
      classList: {
        add: (n: string) => classes.add(n),
        remove: (n: string) => classes.delete(n),
        has: (n: string) => classes.has(n),
      },
    }
  }

  /** Temporizador manual: la prueba decide cuándo "pasa" el tiempo. */
  function fakeTimer() {
    const pendientes = new Map<number, () => void>()
    let siguiente = 1
    return {
      schedule(fn: () => void) {
        const id = siguiente++
        pendientes.set(id, fn)
        return id
      },
      correr() {
        for (const fn of [...pendientes.values()]) fn()
        pendientes.clear()
      },
      get cantidad() {
        return pendientes.size
      },
    }
  }

  it("enciende la transición al instante", () => {
    const root = fakeRoot()
    const timer = fakeTimer()
    startThemeTransition(root as unknown as HTMLElement, timer.schedule)
    assert.equal(root.classList.has("theme-transition"), true)
  })

  it("la apaga cuando termina la animación", () => {
    const root = fakeRoot()
    const timer = fakeTimer()
    startThemeTransition(root as unknown as HTMLElement, timer.schedule)
    timer.correr()
    assert.equal(root.classList.has("theme-transition"), false)
  })

  it("la función devuelta la apaga antes de tiempo", () => {
    // Es lo que evita que el cambio anterior corte al siguiente por la mitad.
    const root = fakeRoot()
    const timer = fakeTimer()
    const cancelar = startThemeTransition(
      root as unknown as HTMLElement,
      timer.schedule
    )
    cancelar()
    assert.equal(root.classList.has("theme-transition"), false)
  })

  it("dura lo suficiente para verse pero no para molestar", () => {
    assert.ok(THEME_TRANSITION_MS >= 150 && THEME_TRANSITION_MS <= 600)
  })
})
