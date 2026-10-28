import "server-only"
import { getSessionUser } from "@/lib/auth/session"
import { buildAppointmentIcs, icsFileName } from "@/lib/calendar/ics"
import { toAppointmentDto } from "@/models/Appointment"
import { appointmentService, medicService } from "@/services/container"

/**
 * Devuelve el turno como archivo .ics para agendarlo en el calendario personal.
 *
 * Un turno médico revela con quién y por qué se atiende una persona, así que el
 * acceso se resuelve con la misma regla de alcance que el resto: se responde
 * 404 tanto si el turno no existe como si es de otra persona, para no confirmar
 * la existencia de un identificador ajeno.
 */
export async function downloadAppointment(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const user = await getSessionUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await context.params
  const appointment = await appointmentService.findOneForUser(user, id)
  if (!appointment) {
    return new Response("No encontrado", { status: 404 })
  }

  const dto = toAppointmentDto(appointment)

  // La duración sale de la jornada del profesional: un turno de 45 minutos no
  // puede aparecer en el calendario como uno de 30.
  const medic = await medicService.findOne(appointment.doctorId)

  return new Response(
    buildAppointmentIcs(dto, { durationMinutes: medic?.slotMinutes }),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${icsFileName(dto)}"`,
      // Un turno puede reprogramarse: no debe quedar cacheado.
        "Cache-Control": "no-store",
      },
    }
  )
}
