import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
  buildAppointmentIcs,
  icsFileName,
  toIcsUtcStamp,
} from "@/lib/calendar/ics"
import type { AppointmentDto } from "@/models/Appointment"

const turno: AppointmentDto = {
  id: "turno-1",
  patientId: "pac-1",
  patientName: "Juan Pérez",
  doctorId: "doc-1",
  doctorName: "Dra. María González",
  specialtyName: "Cardiología",
  branchName: "Sede Central",
  office: "101",
  date: "2026-06-10",
  time: "10:00",
  status: "scheduled",
}

/** Deshace el plegado de líneas para poder afirmar sobre el contenido. */
function desplegar(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n")
}

describe("toIcsUtcStamp", () => {
  test("convierte hora local argentina a UTC", () => {
    assert.equal(toIcsUtcStamp("2026-06-10", "10:00"), "20260610T130000Z")
  })

  test("suma la duración", () => {
    assert.equal(toIcsUtcStamp("2026-06-10", "10:00", 30), "20260610T133000Z")
  })

  test("cruza correctamente la medianoche hacia el día siguiente", () => {
    // 22:00 en Argentina es 01:00 UTC del día siguiente.
    assert.equal(toIcsUtcStamp("2026-06-10", "22:00"), "20260611T010000Z")
  })

  test("cruza el fin de mes", () => {
    assert.equal(toIcsUtcStamp("2026-06-30", "23:00"), "20260701T020000Z")
  })

  test("cruza el fin de año", () => {
    assert.equal(toIcsUtcStamp("2026-12-31", "23:30"), "20270101T023000Z")
  })

  test("respeta el 29 de febrero de un año bisiesto", () => {
    assert.equal(toIcsUtcStamp("2028-02-29", "08:00"), "20280229T110000Z")
  })
})

describe("buildAppointmentIcs", () => {
  const ics = buildAppointmentIcs(turno, { now: new Date("2026-09-03T00:00:00Z") })
  const lineas = desplegar(ics)

  test("abre y cierra el calendario", () => {
    assert.equal(lineas[0], "BEGIN:VCALENDAR")
    assert.ok(lineas.includes("END:VCALENDAR"))
    assert.ok(lineas.includes("BEGIN:VEVENT"))
    assert.ok(lineas.includes("END:VEVENT"))
  })

  test("usa CRLF como exige el RFC", () => {
    assert.ok(ics.includes("\r\n"))
    assert.ok(!/[^\r]\n/.test(ics), "no debe haber saltos sueltos sin retorno")
  })

  test("termina con salto de línea", () => {
    assert.ok(ics.endsWith("\r\n"))
  })

  test("incluye inicio y fin con media hora de diferencia", () => {
    assert.ok(lineas.includes("DTSTART:20260610T130000Z"))
    assert.ok(lineas.includes("DTEND:20260610T133000Z"))
  })

  test("el UID permite reimportar sin duplicar", () => {
    assert.ok(lineas.includes("UID:turno-1@saludplus"))
  })

  test("incluye profesional, especialidad y lugar", () => {
    assert.ok(lineas.some((l) => l.includes("Consulta con Dra. María González")))
    assert.ok(lineas.some((l) => l.startsWith("DESCRIPTION:Cardiología")))
    assert.ok(
      lineas.some((l) => l.includes("Sede Central") && l.includes("Consultorio 101"))
    )
  })

  test("agrega un recordatorio 24 horas antes", () => {
    assert.ok(lineas.includes("BEGIN:VALARM"))
    assert.ok(lineas.includes("TRIGGER:-PT24H"))
  })

  test("un turno cancelado se marca como tal", () => {
    const cancelado = desplegar(
      buildAppointmentIcs({ ...turno, status: "cancelled" })
    )
    assert.ok(cancelado.includes("STATUS:CANCELLED"))
  })

  test("un turno agendado se marca confirmado", () => {
    assert.ok(lineas.includes("STATUS:CONFIRMED"))
  })
})

describe("escapado de caracteres especiales", () => {
  test("una coma en el motivo no parte el campo", () => {
    const lineas = desplegar(
      buildAppointmentIcs({ ...turno, reason: "Dolor de pecho, mareos" })
    )
    const descripcion = lineas.find((l) => l.startsWith("DESCRIPTION:"))
    assert.ok(descripcion?.includes("pecho\\, mareos"))
  })

  test("punto y coma y barra invertida quedan escapados", () => {
    const lineas = desplegar(
      buildAppointmentIcs({ ...turno, reason: "a;b\\c" })
    )
    const descripcion = lineas.find((l) => l.startsWith("DESCRIPTION:"))
    assert.ok(descripcion?.includes("a\\;b\\\\c"))
  })

  test("un salto de línea se convierte en la secuencia del formato", () => {
    const lineas = desplegar(
      buildAppointmentIcs({ ...turno, reason: "linea uno\nlinea dos" })
    )
    const descripcion = lineas.find((l) => l.startsWith("DESCRIPTION:"))
    assert.ok(descripcion?.includes("linea uno\\nlinea dos"))
  })

  test("sin lugar cargado no se emite LOCATION vacío", () => {
    const lineas = desplegar(
      buildAppointmentIcs({ ...turno, branchName: "", office: "" })
    )
    assert.ok(!lineas.some((l) => l.startsWith("LOCATION:")))
  })
})

describe("plegado de líneas", () => {
  test("ninguna línea supera los 75 octetos", () => {
    const encoder = new TextEncoder()
    const ics = buildAppointmentIcs({
      ...turno,
      reason: "Motivo muy largo ".repeat(20),
      doctorName: "Dra. María Fernanda González de la Torre y Echeverría",
    })

    for (const linea of ics.split("\r\n")) {
      assert.ok(
        encoder.encode(linea).length <= 75,
        `línea de ${encoder.encode(linea).length} octetos: ${linea.slice(0, 40)}…`
      )
    }
  })

  test("el contenido plegado se recupera intacto", () => {
    const motivo = "Control cardiológico de rutina con estudios previos"
    const lineas = desplegar(buildAppointmentIcs({ ...turno, reason: motivo }))
    const descripcion = lineas.find((l) => l.startsWith("DESCRIPTION:"))
    assert.ok(descripcion?.includes(motivo))
  })

  test("no corta en medio de un carácter multibyte", () => {
    const ics = buildAppointmentIcs({
      ...turno,
      reason: "á".repeat(120),
    })
    // Si un corte partiera un carácter, el resultado tendría el reemplazo U+FFFD.
    assert.ok(!ics.includes("�"))
  })
})

describe("icsFileName", () => {
  test("arma un nombre legible", () => {
    assert.equal(icsFileName(turno), "turno-2026-06-10-1000.ics")
  })
})
