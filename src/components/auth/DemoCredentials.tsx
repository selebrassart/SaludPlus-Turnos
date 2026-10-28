"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Stethoscope, User } from "lucide-react"
import { authClient } from "@/lib/auth/authClient"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const demoAccounts = [
  {
    role: "Paciente",
    email: "paciente@saludplus.com",
    password: "paciente123",
    icon: User,
  },
  {
    role: "Médico",
    email: "medico@saludplus.com",
    password: "medico123",
    icon: Stethoscope,
  },
  {
    role: "Admin",
    email: "admin@saludplus.com",
    password: "admin123",
    icon: ShieldCheck,
  },
]

export default function DemoCredentials() {
  const router = useRouter()
  const [seeding, setSeeding] = useState(true)
  const [pending, setPending] = useState<string | null>(null)

  // Creates the demo accounts the first time the sign-in page is opened.
  useEffect(() => {
    let active = true
    fetch("/api/seed")
      .catch(() => {})
      .finally(() => {
        if (active) setSeeding(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function signInAs(email: string, password: string) {
    setPending(email)
    const { error } = await authClient.signIn.email({ email, password })
    if (error) {
      setPending(null)
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-dashed bg-muted/40 p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Cuentas de prueba (un clic para ingresar)
      </p>
      <div className="flex flex-col gap-2">
        {demoAccounts.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            className="h-auto justify-start gap-3 py-2"
            disabled={seeding || pending !== null}
            onClick={() => signInAs(account.email, account.password)}
          >
            {pending === account.email ? (
              <Spinner />
            ) : (
              <account.icon className="size-4 text-primary" />
            )}
            <span className="flex flex-col items-start">
              <span className="text-sm font-medium">{account.role}</span>
              <span className="text-xs text-muted-foreground">
                {account.email}
              </span>
            </span>
          </Button>
        ))}
      </div>
      {seeding && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Preparando cuentas de prueba...
        </p>
      )}
    </div>
  )
}
