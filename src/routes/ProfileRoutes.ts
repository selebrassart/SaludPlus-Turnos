"use server"

import * as profileController from "@/controllers/ProfileController"
import type { ProfileSummary } from "@/models/Profile"

export async function getProfileSummary(): Promise<ProfileSummary> {
  return profileController.getSummary()
}
