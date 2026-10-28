import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/authServer"
import type { Role, SessionUser } from "@/models/User"

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const sessionUser = session.user as typeof session.user & { role?: string }
  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    role: (sessionUser.role as Role) ?? "patient",
    image: sessionUser.image,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin") throw new Error("Unauthorized")
  return user
}
