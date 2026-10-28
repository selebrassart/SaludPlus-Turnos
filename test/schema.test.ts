import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

// @ts-expect-error módulo .mjs sin tipos: es un script de la base, no del app
import { splitStatements } from "../db/splitStatements.mjs"

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")

describe("splitStatements", () => {
  it("corta por punto y coma", () => {
    const partes = splitStatements("SELECT 1; SELECT 2;")
    assert.equal(partes.length, 2)
  })

  it("no corta dentro de un bloque DO $$", () => {
    // Es el caso que importa: los bloques de migración tienen varios `;`
    // adentro y partirlos genera SQL inválido.
    const sql = `DO $$
BEGIN
  ALTER TABLE "a" ADD COLUMN "b" text;
  ALTER TABLE "a" ADD COLUMN "c" text;
END
$$;
SELECT 1;`
    const partes = splitStatements(sql)
    assert.equal(partes.length, 2)
    assert.ok(partes[0].includes("END"))
    assert.equal(partes[1], "SELECT 1")
  })

  it("no corta dentro de un literal de texto", () => {
    const partes = splitStatements(`SELECT 'a;b'; SELECT 2;`)
    assert.equal(partes.length, 2)
    assert.ok(partes[0].includes("'a;b'"))
  })

  it("entiende la comilla escapada dentro de un literal", () => {
    const partes = splitStatements(`SELECT 'no''va;aca'; SELECT 2;`)
    assert.equal(partes.length, 2)
  })

  it("no corta dentro de un comentario", () => {
    const partes = splitStatements(`-- esto; no corta\nSELECT 1;`)
    assert.equal(partes.length, 1)
  })

  it("descarta los tramos que son solo comentarios", () => {
    const partes = splitStatements(`-- nada más que un comentario\n`)
    assert.deepEqual(partes, [])
  })

  it("acepta la última sentencia sin punto y coma final", () => {
    assert.equal(splitStatements("SELECT 1").length, 1)
  })

  it("parte el esquema real en sentencias ejecutables", () => {
    const partes = splitStatements(schema)
    assert.ok(partes.length > 30, `solo salieron ${partes.length}`)

    // Ninguna puede quedar con un $$ sin cerrar: sería un bloque partido.
    for (const parte of partes) {
      const dolares = (parte.match(/\$\$/g) ?? []).length
      assert.equal(
        dolares % 2,
        0,
        `quedó un bloque $$ sin cerrar en:\n${parte.slice(0, 120)}`
      )
    }
  })
})

describe("schema.sql · orden de las sentencias", () => {
  const partes: string[] = splitStatements(schema)

  /** Índice de la primera sentencia que cumple el predicado. */
  function primera(predicado: (s: string) => boolean): number {
    return partes.findIndex(predicado)
  }

  /**
   * Toda columna agregada por la migración tiene que existir antes de que
   * cualquier índice o restricción la nombre.
   *
   * Es exactamente el bug que dejó la base a medias: `appointments_room_unique`
   * se creaba sobre "branchId" antes del ALTER que agrega esa columna, la
   * sentencia fallaba y el script entero se abortaba —dentro de una única
   * transacción implícita— sin llegar nunca a la migración.
   */
  it("ningún índice usa una columna antes de que la migración la agregue", () => {
    const agregadas = [...schema.matchAll(
      /ALTER TABLE "(\w+)" ADD COLUMN IF NOT EXISTS "(\w+)"/g
    )].map((m) => ({ tabla: m[1], columna: m[2] }))

    assert.ok(agregadas.length > 5, "no se encontraron ALTER de migración")

    for (const { tabla, columna } of agregadas) {
      const alter = primera(
        (s) =>
          s.includes(`ALTER TABLE "${tabla}"`) &&
          s.includes(`ADD COLUMN IF NOT EXISTS "${columna}"`)
      )

      partes.forEach((parte, indice) => {
        if (indice >= alter) return
        const esIndice = /CREATE (UNIQUE )?INDEX/.test(parte)
        const esRestriccion = /ADD CONSTRAINT/.test(parte)
        if (!esIndice && !esRestriccion) return
        if (!parte.includes(`"${tabla}"`)) return

        assert.ok(
          !parte.includes(`"${columna}"`),
          `una sentencia usa ${tabla}."${columna}" antes del ALTER que la agrega:\n${parte.slice(0, 140)}`
        )
      })
    }
  })

  it("los ALTER solo tocan tablas ya creadas", () => {
    // Un ALTER sobre una tabla que se crea más abajo falla con «no existe la
    // relación» en toda base nueva.
    for (const [indice, parte] of partes.entries()) {
      const match = parte.match(/^ALTER TABLE "(\w+)"/)
      if (!match) continue
      const tabla = match[1]

      const creacion = primera((s) =>
        s.includes(`CREATE TABLE IF NOT EXISTS "${tabla}"`)
      )

      assert.notEqual(creacion, -1, `nunca se crea la tabla "${tabla}"`)
      assert.ok(
        creacion < indice,
        `se hace ALTER sobre "${tabla}" antes de crearla`
      )
    }
  })

  /** El esquema sin comentarios: los comentarios hablan *sobre* el SQL y
   *  nombran las mismas sentencias, así que confundirían a estas búsquedas. */
  const sinComentarios = schema
    .split("\n")
    .filter((linea) => !linea.trim().startsWith("--"))
    .join("\n")

  it("todas las tablas se crean con IF NOT EXISTS", () => {
    // El script se corre sobre bases que ya existen: un CREATE TABLE pelado
    // fallaría siempre a partir de la segunda vez.
    const pelados = [
      ...sinComentarios.matchAll(/CREATE TABLE (?!IF NOT EXISTS)/g),
    ]
    assert.deepEqual(pelados.map((m) => m[0]), [])
  })

  it("todos los índices se crean con IF NOT EXISTS", () => {
    const pelados = [
      ...sinComentarios.matchAll(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/g),
    ]
    assert.deepEqual(pelados.map((m) => m[0]), [])
  })

  it("las columnas se agregan con ADD COLUMN IF NOT EXISTS", () => {
    const pelados = [
      ...sinComentarios.matchAll(/ADD COLUMN (?!IF NOT EXISTS)/g),
    ]
    assert.deepEqual(pelados.map((m) => m[0]), [])
  })
})
