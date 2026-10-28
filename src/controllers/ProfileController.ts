import "server-only"
import { requireUser } from "@/lib/auth/session"
import type { ProfileSummary } from "@/models/Profile"
import { profileService } from "@/services/container"

export async function getSummary(): Promise<ProfileSummary> {
  const user = await requireUser()
  return profileService.getSummary(user)
}
