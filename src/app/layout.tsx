import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"

import "./globals.css"
import ThemeProvider from "@/components/ThemeProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { THEME_COOKIE, normalizeTheme, themeClassName } from "@/lib/theme"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "SaludPlus · Gestión de Turnos Médicos",
  description:
    "Portal integral para reservar y gestionar turnos médicos: pacientes, profesionales y administración en un solo lugar.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // El tema se decide acá, en el servidor, antes de generar el HTML: así la
  // página sale directamente con el color correcto y no hace falta ningún
  // script que la corrija antes del primer pintado. Cuando el valor es
  // "system" no se escribe ninguna clase y el color lo resuelve el
  // `prefers-color-scheme` del variante `dark` en globals.css.
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <html
      lang="es"
      className={cn(
        "bg-background antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        themeClassName(theme)
      )}
    >
      <body>
        <ThemeProvider initialTheme={theme}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
