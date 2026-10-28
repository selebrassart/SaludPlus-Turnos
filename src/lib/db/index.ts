import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

/**
 * Managed providers (Neon, Supabase, RDS) require SSL, but a local PostgreSQL
 * almost never has it enabled. Appending `sslmode=require` unconditionally is
 * what makes `npm run dev` fail against localhost with
 * "The server does not support SSL connections", so the flag is only added for
 * remote hosts. `uselibpqcompat=true` keeps libpq semantics and silences the
 * deprecation warning emitted by pg.
 */
function isLocalHost(raw: string): boolean {
  try {
    const { hostname } = new URL(raw)
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "host.docker.internal"
    )
  } catch {
    // A malformed URL is reported by the Pool itself with a better message.
    return false
  }
}

function buildConnectionString(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? ""

  if (!raw) {
    throw new Error(
      [
        "Falta la variable DATABASE_URL.",
        "Copiá .env.local.example a .env.local y completá la cadena de conexión.",
        "Ejemplo local: postgresql://postgres:postgres@localhost:5432/saludplus",
      ].join(" ")
    )
  }

  if (isLocalHost(raw)) return raw
  if (/[?&]uselibpqcompat=/.test(raw)) return raw

  const separator = raw.includes("?") ? "&" : "?"
  const extra = /[?&]sslmode=/.test(raw)
    ? "uselibpqcompat=true"
    : "uselibpqcompat=true&sslmode=require"
  return `${raw}${separator}${extra}`
}

export const pool = new Pool({ connectionString: buildConnectionString() })
export const db = drizzle(pool, { schema })
