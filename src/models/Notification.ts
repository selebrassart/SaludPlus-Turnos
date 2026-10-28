import { notifications } from "@/lib/db/schema"

export type NotificationRow = typeof notifications.$inferSelect

export { notifications as notificationTable }

export type NotificationType =
  | "appointment_booked"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "appointment_reminder"
  | "appointment_status"
  | "review_received"

export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  /** ISO con fecha y hora: la campanita muestra "hace 2 h". */
  createdAt: string
}

export class Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  /**
   * Identifica el hecho que originó el aviso. El índice único sobre
   * (userId, dedupeKey) es lo que hace que el generador de recordatorios
   * pueda correr mil veces sin duplicar nada.
   */
  dedupeKey: string | null
  readAt: Date | null
  createdAt: Date

  constructor(
    id: string,
    userId: string,
    type: NotificationType,
    title: string,
    body: string = "",
    dedupeKey: string | null = null,
    readAt: Date | null = null,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this.userId = userId
    this.type = type
    this.title = title
    this.body = body
    this.dedupeKey = dedupeKey
    this.readAt = readAt
    this.createdAt = createdAt
  }

  static fromRow(row: NotificationRow): Notification {
    return new Notification(
      row.id,
      row.userId,
      row.type as NotificationType,
      row.title,
      row.body,
      row.dedupeKey,
      row.readAt,
      row.createdAt
    )
  }
}

export function toNotificationDto(item: Notification): NotificationDto {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    read: item.readAt !== null,
    createdAt: item.createdAt.toISOString(),
  }
}
