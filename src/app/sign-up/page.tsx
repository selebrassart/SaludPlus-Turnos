import Link from "next/link"
import { redirect } from "next/navigation"
import AuthForm from "@/components/auth/AuthForm"
import AuthShell from "@/components/auth/AuthShell"
import { getSessionUser } from "@/lib/auth/session"

export default async function SignUpPage() {
  const user = await getSessionUser()
  if (user) redirect("/")

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Registrate para reservar y gestionar turnos médicos."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Ingresar
          </Link>
        </>
      }
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  )
}
