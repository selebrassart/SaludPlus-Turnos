import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/authServer"
import type { Role } from "@/models/User"
import { authService } from "@/services/container"
import { sanitizeRole } from "@/validations/AuthValidation"

export async function setRole(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    role?: unknown
  } | null

  let role: Role
  try {
    role = sanitizeRole(body?.role)
  } catch (error) {
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 400 }
    )
  }

  const result = await authService.assignRole(session.user.id, role)
  return Response.json(result, { status: result.ok ? 200 : 404 })
}
