"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  ClipboardCheck,
  Star,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  NotificationDto,
  NotificationType,
} from "@/models/Notification"
import {
  getNotificationFeed,
  markAllNotificationsRead,
} from "@/routes/NotificationRoutes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

const typeIcons: Record<NotificationType, LucideIcon> = {
  appointment_booked: CalendarCheck,
  appointment_cancelled: CalendarX,
  appointment_rescheduled: CalendarDays,
  appointment_reminder: CalendarClock,
  appointment_status: ClipboardCheck,
  review_received: Star,
}

/** "hace 5 min", "hace 3 h", "hace 2 d". */
function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(elapsed / 60000)

  if (minutes < 1) return "recién"
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`

  return new Date(iso).toLocaleDateString("es-AR")
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationDto[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  // Se carga al montar para poder mostrar el contador sin que nadie abra nada.
  useEffect(() => {
    let active = true

    getNotificationFeed()
      .then((feed) => {
        if (!active) return
        setItems(feed.items)
        setUnread(feed.unread)
      })
      .catch(() => {
        // Un fallo acá no puede romper la barra de navegación entera.
      })
      .finally(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next || unread === 0) return

    // Abrir la campanita cuenta como leerlas: el punto se apaga enseguida y el
    // servidor se entera después.
    setUnread(0)
    setItems((previous) => previous.map((item) => ({ ...item, read: true })))
    startTransition(async () => {
      try {
        await markAllNotificationsRead()
      } catch {
        // El estado real se recupera en la próxima carga.
      }
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unread > 0
                ? `Notificaciones: ${unread} sin leer`
                : "Notificaciones"
            }
          />
        }
      >
        <Bell />
        {/* El punto sale solo si hay algo sin leer: antes estaba fijo. */}
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border/70 px-3 py-2.5">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!loaded && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          )}

          {loaded && !items.length && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          )}

          {items.map((item) => {
            const Icon = typeIcons[item.type] ?? Bell
            return (
              <div
                key={item.id}
                className={cn(
                  "flex gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0",
                  !item.read && "bg-accent/40"
                )}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-medium">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
