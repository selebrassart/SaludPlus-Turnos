import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildGoogleCalendarUrl } from "@/lib/calendar/googleCalendar"
import { toIcsUtcStamp } from "@/lib/calendar/ics"
import type { AppointmentDto } from "@/models/Appointment"

function turno(overrides: Partial<AppointmentDto> = {}): AppointmentDto {
  return {
    id: "t-1",
    patientId: "pac-1",
    patientName: "Juan Pérez",
    doctorId: "doc-1",
    doctorName: "Dra. María González",
    specialtyName: "Cardiología",
    branchId: "sede-1",
    branchName: "Sede Fisherton",
    office: "412",
    date: "2026-09-07",
    time: "08:00",
    status: "scheduled",
    reason: null,
    notes: null,
    ...overrides,
  } as AppointmentDto
}

/** Los parámetros ya decodificados, que es como los lee Google. */
function params(url: string): URLSearchParams {
  return new URL(url).searchParams
}

describe("buildGoogleCalendarUrl", () => {
  it("apunta al formulario de evento nuevo de Google Calendar", () => {
    const url = new URL(buildGoogleCalendarUrl(turno()))
    assert.equal(url.origin, "https://calendar.google.com")
    assert.equal(url.pathname, "/calendar/render")
    assert.equal(url.searchParams.get("action"), "TEMPLATE")
  })

  it("usa la misma conversión de zona horaria que el archivo .ics", () => {
    // Si las dos difirieran, el mismo turno caería en horas distintas según
    // por dónde se lo agende, y nadie lo notaría hasta llegar tarde.
    const t = turno()
    const esperado = `${toIcsUtcStamp(t.date, t.time)}/${toIcsUtcStamp(
      t.date,
      t.time,
      30
    )}`
    assert.equal(params(buildGoogleCalendarUrl(t)).get("dates"), esperado)
  })

  it("respeta la duración de la consulta", () => {
    const t = turno()
    const dates = params(
      buildGoogleCalendarUrl(t, { durationMinutes: 45 })
    ).get("dates")
    assert.equal(dates?.split("/")[1], toIcsUtcStamp(t.date, t.time, 45))
  })

  it("el título dice de qué es el turno sin abrirlo", () => {
    const texto = params(buildGoogleCalendarUrl(turno())).get("text") ?? ""
    assert.match(texto, /Cardiología/)
    assert.match(texto, /Dra\. María González/)
  })

  it("el lugar junta sede y consultorio", () => {
    const lugar = params(buildGoogleCalendarUrl(turno())).get("location")
    assert.equal(lugar, "Sede Fisherton · Consultorio 412")
  })

  it("un turno sin sede no manda un lugar vacío", () => {
    // Los turnos anteriores a que existieran las sedes no la tienen.
    const url = buildGoogleCalendarUrl(
      turno({ branchName: "", office: "" })
    )
    assert.equal(params(url).has("location"), false)
  })

  it("avisa que el evento no se sincroniza solo", () => {
    // Es la diferencia honesta frente a una integración con la API: si el
    // turno se cancela acá, Google no se entera.
    const detalle = params(buildGoogleCalendarUrl(turno())).get("details") ?? ""
    assert.match(detalle, /no se actualiza sol/i)
  })

  it("incluye el motivo cuando lo hay, y no lo inventa cuando no", () => {
    const con = params(
      buildGoogleCalendarUrl(turno({ reason: "Control anual" }))
    ).get("details")
    assert.match(con ?? "", /Motivo: Control anual/)

    const sin = params(buildGoogleCalendarUrl(turno())).get("details")
    assert.equal(/Motivo:/.test(sin ?? ""), false)
  })

  it("escapa los caracteres que romperían la URL", () => {
    // Un nombre con & o # partiría la cadena de consulta si se concatenara
    // a mano en vez de usar URLSearchParams.
    const url = buildGoogleCalendarUrl(
      turno({ doctorName: "Dr. A & B #1", specialtyName: "Clínica" })
    )
    assert.doesNotThrow(() => new URL(url))
    assert.match(params(url).get("text") ?? "", /Dr\. A & B #1/)
  })
})
