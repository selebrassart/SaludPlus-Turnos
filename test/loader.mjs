/**
 * Resolver de módulos para las pruebas.
 *
 * Hace dos cosas:
 *
 * 1. Traduce el alias `@/...` a `src/...`. Node no lee los `paths` de
 *    tsconfig.json, así que sin esto ningún import del proyecto resuelve.
 *
 * 2. Reemplaza por stubs los módulos que solo existen del lado del servidor
 *    (`server-only`, `next/cache`) y el constructor de tablas de Drizzle.
 *    Las pruebas son de lógica de dominio: no tocan la base, y cargar el ORM
 *    de verdad solo agregaría una dependencia que puede fallar por razones
 *    ajenas a lo que se está probando.
 */

import { existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = process.cwd()

const stubs = new Map([
  ["server-only", "test/stubs/server-only.mjs"],
  ["next/cache", "test/stubs/next-cache.mjs"],
  ["drizzle-orm/pg-core", "test/stubs/pg-core.mjs"],
  // UserService da de alta cuentas a través de Better Auth, que a su vez abre
  // una conexión a PostgreSQL al importarse.
  ["@/lib/auth/authServer", "test/stubs/auth-server.mjs"],
])

function fileUrl(relative) {
  return pathToFileURL(path.resolve(root, relative)).href
}

export async function resolve(specifier, context, nextResolve) {
  const stub = stubs.get(specifier)
  if (stub) {
    return nextResolve(fileUrl(stub), context)
  }

  if (specifier.startsWith("@/")) {
    const base = path.resolve(root, "src", specifier.slice(2))
    const candidates = [
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ]

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context)
      }
    }
  }

  return nextResolve(specifier, context)
}
