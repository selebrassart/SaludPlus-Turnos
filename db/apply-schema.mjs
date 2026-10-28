/**
 * Aplica db/schema.sql sin depender de psql.
 *
 * El cliente de línea de comandos de PostgreSQL no queda en el PATH de Windows
 * salvo que se tilde esa opción durante la instalación, así que este script usa
 * el driver `pg` que ya está en node_modules.
 *
 * Uso:  npm run db:setup
 *
 * Crea la base si no existe y después ejecuta el esquema completo.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

import { splitStatements } from "./splitStatements.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, "..")

/**
 * Node no lee .env.local por su cuenta (eso lo hace Next.js), y `--env-file`
 * solo existe desde Node 20.6, así que el parseo va a mano.
 */
function loadEnvLocal() {
  let raw
  try {
    raw = readFileSync(join(projectRoot, ".env.local"), "utf8")
  } catch {
    return {}
  }

  const values = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const separator = trimmed.indexOf("=")
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    // Comillas opcionales alrededor del valor.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

function fail(message, hint) {
  console.error(`\n  ✖ ${message}`)
  if (hint) console.error(`    ${hint}`)
  console.error("")
  process.exit(1)
}

const env = { ...loadEnvLocal(), ...process.env }
const connectionString = env.DATABASE_URL?.trim()

if (!connectionString) {
  fail(
    "Falta DATABASE_URL.",
    "Creá el archivo .env.local en la raíz del proyecto (el contenido está en SETUP.md)."
  )
}

let target
try {
  target = new URL(connectionString)
} catch {
  fail(
    "DATABASE_URL no es una URL válida.",
    "Formato esperado: postgresql://usuario:password@host:puerto/basededatos"
  )
}

const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""))
if (!databaseName) {
  fail(
    "DATABASE_URL no indica el nombre de la base.",
    "Debe terminar en /nombre_de_la_base, por ejemplo .../saludplus"
  )
}

const isLocal = ["localhost", "127.0.0.1", "::1"].includes(target.hostname)
const ssl = isLocal ? undefined : { rejectUnauthorized: false }

/** Se conecta a la base de mantenimiento para poder crear la del proyecto. */
function maintenanceUrl() {
  const url = new URL(connectionString)
  url.pathname = "/postgres"
  return url.toString()
}

async function ensureDatabase() {
  const client = new pg.Client({ connectionString: maintenanceUrl(), ssl })

  try {
    await client.connect()
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      fail(
        `No hay ningún PostgreSQL escuchando en ${target.hostname}:${target.port || 5432}.`,
        "Verificá que el servicio esté corriendo:  Get-Service *postgres*"
      )
    }
    if (error.code === "28P01") {
      fail(
        "Usuario o contraseña incorrectos.",
        "Revisá las credenciales en DATABASE_URL dentro de .env.local."
      )
    }
    fail(`No se pudo conectar: ${error.message}`)
  }

  try {
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    )

    if (rows.length) {
      console.log(`  · La base "${databaseName}" ya existe.`)
    } else {
      // El nombre no puede ir como parámetro: se escapan las comillas a mano.
      await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`)
      console.log(`  ✔ Base "${databaseName}" creada.`)
    }
  } finally {
    await client.end()
  }
}

/** Primera línea útil, para nombrar la sentencia en los mensajes. */
function describe(statement) {
  const line = statement
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("--"))
  return (line ?? statement).slice(0, 72)
}

/** Columnas que la aplicación necesita sí o sí para poder consultar. */
const REQUIRED_COLUMNS = [
  ["appointments", "branchId"],
  ["appointments", "branchName"],
  ["appointments", "office"],
  ["doctors", "branchId"],
  ["doctors", "office"],
  ["doctors", "reviewCount"],
  ["doctors", "startTime"],
  ["doctors", "endTime"],
  ["doctors", "breakStart"],
  ["doctors", "breakEnd"],
  ["doctors", "slotMinutes"],
  ["patients", "birthDate"],
  ["notifications", "dedupeKey"],
]

/**
 * Comprueba contra el catálogo que las columnas nuevas hayan quedado.
 *
 * Existe porque el síntoma de una migración a medias no aparece acá sino más
 * tarde, como un 500 en la página con un «no existe la columna branchId». Es
 * mejor enterarse en el mismo comando que la creó.
 */
async function verify(client) {
  const { rows } = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'`
  )

  const existing = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`))
  return REQUIRED_COLUMNS.filter(
    ([table, column]) => !existing.has(`${table}.${column}`)
  ).map(([table, column]) => `${table}.${column}`)
}

async function applySchema() {
  const sql = readFileSync(join(here, "schema.sql"), "utf8")
  const statements = splitStatements(sql)
  const client = new pg.Client({ connectionString, ssl })

  await client.connect()

  // Los NOTICE del script avisan sobre datos que impiden aplicar una
  // restricción (emails repetidos, turnos huérfanos): hay que mostrarlos.
  client.on("notice", (notice) => {
    console.log(`  ! ${notice.message}`)
  })

  const failures = []

  try {
    // Una sentencia por llamada: cada una es su propia transacción, así que
    // un fallo aislado no descarta lo que ya se aplicó.
    for (const statement of statements) {
      try {
        await client.query(statement)
      } catch (error) {
        failures.push({ statement, error })
      }
    }

    const applied = statements.length - failures.length
    console.log(`  ✔ ${applied} de ${statements.length} sentencias aplicadas.`)

    for (const { statement, error } of failures) {
      console.error(`\n  ✖ Falló:  ${describe(statement)}`)
      console.error(`    ${error.message}`)
      if (error.detail) console.error(`    ${error.detail}`)
      if (error.hint) console.error(`    ${error.hint}`)
    }

    const missing = await verify(client)

    if (missing.length) {
      console.error("\n  ✖ Faltan columnas que la aplicación necesita:")
      for (const column of missing) console.error(`      ${column}`)
      console.error(
        "\n    La página va a fallar con «no existe la columna ...».\n" +
          "    Revisá los errores de arriba: casi siempre son datos cargados\n" +
          "    que impiden aplicar una restricción.\n"
      )
      process.exit(1)
    }

    console.log("  ✔ Verificado: están todas las columnas que se necesitan.")

    if (failures.length) {
      console.error(
        "\n  Hubo sentencias que fallaron, pero las columnas necesarias\n" +
          "  están. Suele ser un índice único que no se puede crear porque\n" +
          "  hay datos repetidos; la aplicación arranca igual.\n"
      )
    }
  } finally {
    await client.end()
  }
}

console.log(`\n  Aplicando esquema en ${target.hostname}/${databaseName}\n`)
await ensureDatabase()
await applySchema()
console.log("\n  Listo. Ahora podés correr:  npm run dev\n")
