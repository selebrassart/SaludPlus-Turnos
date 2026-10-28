/**
 * Next.js exige que los handlers vivan bajo app/api, así que este archivo solo
 * reexporta el que está en la capa de rutas.
 */
export { GET, POST } from "@/routes/CronRoutes"

export const dynamic = "force-dynamic"
