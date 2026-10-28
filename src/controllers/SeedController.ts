import "server-only"
import { branches, demoAccounts, medics, specialties } from "@/lib/seedData"
import { seedService } from "@/services/container"

export async function seedDemoAccounts(): Promise<Response> {
  const results = await seedService.seedAccounts(demoAccounts)
  return Response.json({ ok: true, results })
}

export async function seedCatalog(): Promise<Response> {
  const result = await seedService.seedCatalog(branches, specialties, medics)
  return Response.json({ ok: true, ...result })
}
