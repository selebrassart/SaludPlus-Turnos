"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Stethoscope, User } from "lucide-react"
import { authClient } from "@/lib/auth/authClient"
import { cn } from "@/lib/utils"
import type { Role } from "@/models/User"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Mode = "sign-in" | "sign-up"

/**
 * Aplica el rol elegido al crear la cuenta.
 *
 * Antes el resultado de este pedido se descartaba. Si fallaba —típicamente
 * porque la cookie de sesión todavía no estaba escrita cuando salió el
 * fetch—, la cuenta quedaba con el rol "patient" por defecto de la columna
 * pero sin su ficha asociada, y el problema recién aparecía al intentar
 * reservar un turno. Se reintenta una vez para cubrir esa carrera y, si
 * igual falla, se avisa en lugar de seguir como si nada.
 */
async function assignRole(role: Role): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400))
    }

    try {
      const response = await fetch("/api/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (response.ok) return
    } catch {
      // Se reintenta abajo.
    }
  }

  throw new Error(
    "La cuenta se creó, pero no se pudo asignar el tipo de cuenta. " +
      "Iniciá sesión y pedile a un administrador que lo configure."
  )
}

function RoleOption({
  value,
  icon: Icon,
  label,
  active,
}: {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <ToggleGroupItem
      value={value}
      className={cn(
        "flex h-auto flex-col gap-1.5 rounded-lg border py-3 data-[pressed]:border-primary data-[pressed]:bg-accent",
        active && "border-primary bg-accent"
      )}
    >
      <Icon className="size-5" />
      <span className="text-xs font-medium">{label}</span>
    </ToggleGroupItem>
  )
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("patient")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({ email, password, name })
        if (result.error) {
          throw new Error(result.error.message ?? "No se pudo crear la cuenta")
        }
        await assignRole(role)
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) {
          throw new Error(result.error.message ?? "Credenciales inválidas")
        }
      }
      router.push("/")
      router.refresh()
    } catch (submitError) {
      setError((submitError as Error).message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {mode === "sign-up" && (
          <Field>
            <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            minLength={8}
            required
          />
          {mode === "sign-up" && (
            <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
          )}
        </Field>

        {mode === "sign-up" && (
          <Field>
            <FieldLabel>Tipo de cuenta</FieldLabel>
            <ToggleGroup
              value={[role]}
              onValueChange={(values) => {
                const next = values.find((value) => value !== role) ?? values[0]
                if (next) setRole(next as Role)
              }}
              className="grid grid-cols-3 gap-2"
            >
              <RoleOption
                value="patient"
                icon={User}
                label="Paciente"
                active={role === "patient"}
              />
              <RoleOption
                value="doctor"
                icon={Stethoscope}
                label="Médico"
                active={role === "doctor"}
              />
              <RoleOption
                value="admin"
                icon={ShieldCheck}
                label="Admin"
                active={role === "admin"}
              />
            </ToggleGroup>
          </Field>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Spinner data-icon="inline-start" />}
          {mode === "sign-in" ? "Ingresar" : "Crear cuenta"}
        </Button>
      </FieldGroup>
    </form>
  )
}
