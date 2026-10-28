import "server-only"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { Notification, notificationTable } from "@/models/Notification"

/** Tope de la campanita: nadie baja más allá de esto. */
const FEED_LIMIT = 30

export class NotificationRepository {
  async findByUserId(userId: string): Promise<Notification[]> {
    const rows = await db
      .select()
      .from(notificationTable)
      .where(eq(notificationTable.userId, userId))
      .orderBy(desc(notificationTable.createdAt))
      .limit(FEED_LIMIT)
    return rows.map(Notification.fromRow)
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificationTable)
      .where(
        and(
          eq(notificationTable.userId, userId),
          isNull(notificationTable.readAt)
        )
      )
    return row?.total ?? 0
  }

  /**
   * Inserta ignorando los repetidos.
   *
   * El índice único sobre (userId, dedupeKey) convierte esto en una operación
   * segura de reintentar: el generador de recordatorios corre en cada visita y
   * solo el primer intento deja una fila.
   */
  async createIfMissing(item: Notification): Promise<boolean> {
    const inserted = await db
      .insert(notificationTable)
      .values({
        id: item.id,
        userId: item.userId,
        type: item.type,
        title: item.title,
        body: item.body,
        dedupeKey: item.dedupeKey,
      })
      .onConflictDoNothing()
      .returning({ id: notificationTable.id })

    return inserted.length > 0
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notificationTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationTable.userId, userId),
          isNull(notificationTable.readAt)
        )
      )
  }

  async markRead(userId: string, id: string): Promise<void> {
    await db
      .update(notificationTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationTable.userId, userId),
          eq(notificationTable.id, id)
        )
      )
  }
}
