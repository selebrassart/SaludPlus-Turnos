"use client"

import Link from "next/link"
import { useState } from "react"
import { Activity, ChevronDown, LogOut, User } from "lucide-react"
import { authClient } from "@/lib/auth/authClient"
import { getInitials } from "@/lib/format/initials"
import type { ProfileSummary } from "@/models/Profile"
import type { Role, SessionUser } from "@/models/User"
import NotificationBell from "@/components/NotificationBell"
import ProfileSheet from "@/components/ProfileSheet"
import ThemeToggle from "@/components/ThemeToggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const roleLabels: Record<Role, string> = {
  patient: "Paciente",
  doctor: "Profesional",
  admin: "Administración",
}

export default function Navbar({
  user,
  profile,
}: {
  user: SessionUser
  profile: ProfileSummary
}) {
  const [signingOut, setSigningOut] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut()
    } catch {
      // A network failure must not trap the user in a signed-in shell.
    }
    // Hard navigation so the server reads the cleared cookie.
    window.location.href = "/sign-in"
  }

  function openProfile() {
    // Let the dropdown close first to avoid a focus fight with the sheet.
    setTimeout(() => setProfileOpen(true), 0)
  }

  const label = roleLabels[user.role]

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* El logo vuelve al inicio, que es lo que espera cualquiera que lo
            vea arriba a la izquierda. Es un <Link> y no un onClick para que
            funcione el clic del medio, "abrir en pestaña nueva" y los
            lectores de pantalla, que lo anuncian como enlace. */}
        <Link
          href="/"
          aria-label="SaludPlus · ir al inicio"
          className="group flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Activity className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">SaludPlus</p>
            <p className="text-[11px] text-muted-foreground">
              Gestión de Turnos
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-auto gap-2 rounded-full py-1 pr-2 pl-1 sm:pr-3"
                />
              }
            >
              <>
                <Avatar className="size-8">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
                <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
              </>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col gap-1 px-2 py-1.5 text-sm font-medium">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
                <Badge variant="secondary" className="w-fit font-normal">
                  {label}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={openProfile}>
                  <User />
                  Mi perfil
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={signOut}
                disabled={signingOut}
              >
                <LogOut />
                {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
      />
    </header>
  )
}
