import "server-only"
import { requireUser } from "@/lib/auth/session"
import {
  toNotificationDto,
  type NotificationDto,
} from "@/models/Notification"
import { notificationService, patientService } from "@/services/container"

export interface NotificationFeed {
  items: NotificationDto[]
  unread: number
}

/**
 * Devuelve la campanita y, de paso, genera los recordatorios pendientes de esta
 * persona. Sin un planificador corriendo, esta es la vía que garantiza que el
 * aviso del día previo exista para quien abre la aplicación; el endpoint
 * `/api/cron/reminders` cubre a quienes no entran.
 */
export async function feed(): Promise<NotificationFeed> {
  const user = await requireUser()

  if (user.role === "patient") {
    const patient = await patientService.findByUserId(user.id)
    if (patient) {
      await notificationService.generateReminders(patient.id)
    }
  }

  const [items, unread] = await Promise.all([
    notificationService.list(user.id),
    notificationService.countUnread(user.id),
  ])

  return { items: items.map(toNotificationDto), unread }
}

export async function markAllRead(): Promise<void> {
  const user = await requireUser()
  await notificationService.markAllRead(user.id)
}

export async function markRead(id: string): Promise<void> {
  const user = await requireUser()
  // Acotado al usuario en la consulta: nadie puede marcar avisos ajenos.
  await notificationService.markRead(user.id, id)
}
