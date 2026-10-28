import Link from "next/link"
import { redirect } from "next/navigation"
import AuthForm from "@/components/auth/AuthForm"
import AuthShell from "@/components/auth/AuthShell"
import DemoCredentials from "@/components/auth/DemoCredentials"
import { getSessionUser } from "@/lib/auth/session"

export default async function SignInPage() {
  const user = await getSessionUser()
  if (user) redirect("/")

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresá a tu cuenta para gestionar tus turnos."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary hover:underline"
          >
            Crear cuenta
          </Link>
        </>
      }
    >
      <AuthForm mode="sign-in" />
      <DemoCredentials />
    </AuthShell>
  )
}
