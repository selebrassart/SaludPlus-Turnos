"use server"

import * as notificationController from "@/controllers/NotificationController"
import type { NotificationFeed } from "@/controllers/NotificationController"

export async function getNotificationFeed(): Promise<NotificationFeed> {
  return notificationController.feed()
}

export async function markAllNotificationsRead(): Promise<void> {
  return notificationController.markAllRead()
}

export async function markNotificationRead(id: string): Promise<void> {
  return notificationController.markRead(id)
}
