import { betterAuth } from "better-auth"
import { createHash } from "crypto"
import { pool } from "@/lib/db"

/**
 * BETTER_AUTH_SECRET is preferred, but the preview environment does not always
 * persist it between syncs. Deriving a deterministic fallback from DATABASE_URL
 * keeps sessions valid across server reloads.
 */
function resolveAuthSecret(): string {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET
  const seed = process.env.DATABASE_URL ?? "saludplus-dev-seed"
  return createHash("sha256").update(`saludplus:${seed}`).digest("base64")
}

/**
 * Without an explicit baseURL Better Auth has to guess the origin from each
 * request, which breaks callback URLs in local development. The fallback chain
 * ends on localhost so `npm run dev` works with no extra configuration.
 */
function resolveBaseURL(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.V0_RUNTIME_URL) return process.env.V0_RUNTIME_URL
  if (process.env.NODE_ENV === "development") return "http://localhost:3000"
  return undefined
}

/**
 * The v0 preview renders the app inside a cross-site iframe, where the session
 * cookie only survives with SameSite=None; Secure. Those same attributes make
 * browsers drop the cookie over plain http://localhost, so the override is
 * scoped to the preview rather than to NODE_ENV.
 */
const isCrossSitePreview = Boolean(process.env.V0_RUNTIME_URL)

export const auth = betterAuth({
  database: pool,
  secret: resolveAuthSecret(),
  baseURL: resolveBaseURL(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "patient",
        input: false,
      },
    },
  },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(isCrossSitePreview
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
