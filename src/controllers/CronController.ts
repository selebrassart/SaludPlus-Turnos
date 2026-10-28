import "server-only"
import { notificationService } from "@/services/container"

/**
 * Genera los recordatorios de los turnos de mañana para TODOS los pacientes.
 *
 * La aplicación no tiene un planificador propio: este endpoint es el punto de
 * entrada para uno externo. Opciones para engancharlo:
 *
 *   - Vercel Cron (vercel.json):
 *       { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 12 * * *" }] }
 *   - Windows, Programador de tareas, una vez por día:
 *       curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/reminders
 *
 * Es seguro llamarlo muchas veces: cada aviso lleva un `dedupeKey` y el índice
 * único descarta los repetidos.
 */
export async function generateReminders(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim()

  if (secret) {
    const header = request.headers.get("authorization") ?? ""
    if (header !== `Bearer ${secret}`) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
  } else if (process.env.NODE_ENV === "production") {
    // Sin secreto configurado, cualquiera podría dispararlo: en producción se
    // prefiere no exponerlo antes que dejarlo abierto.
    return Response.json(
      {
        ok: false,
        error:
          "Falta CRON_SECRET. Definilo en el entorno para habilitar este endpoint.",
      },
      { status: 503 }
    )
  }

  const created = await notificationService.generateReminders()

  return Response.json({ ok: true, created })
}
