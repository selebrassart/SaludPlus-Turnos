import type React from "react"
import Link from "next/link"
import { HeartPulse } from "lucide-react"

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15">
            <HeartPulse className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            SaludPlus
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-pretty">
            Tu salud, organizada en un solo lugar
          </h2>
          <p className="mt-4 leading-relaxed text-primary-foreground/80">
            Reservá turnos con los mejores profesionales, gestioná tu agenda
            médica y llevá el control de tu historia clínica de forma simple y
            segura.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-foreground" />
              Reserva de turnos en pocos pasos
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-foreground" />
              Agenda diaria para profesionales
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-foreground" />
              Panel de administración completo
            </li>
          </ul>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary-foreground/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary-foreground/10 blur-3xl"
        />

        <p className="relative z-10 text-xs text-primary-foreground/70">
          &copy; {new Date().getFullYear()} SaludPlus. Todos los derechos
          reservados.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Link href="/sign-in" className="flex items-center gap-2 lg:hidden">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <HeartPulse className="size-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                SaludPlus
              </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <div className="text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
      </section>
    </main>
  )
}
