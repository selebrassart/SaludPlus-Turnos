import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { toISODate } from "@/lib/format/date"
import { sanitizePatientInput } from "@/validations/PatientValidation"
import { sanitizeMedicInput } from "@/validations/MedicValidation"
import { sanitizeSpecialtyInput } from "@/validations/SpecialtyValidation"
import { sanitizeUserInput, sanitizePassword } from "@/validations/UserValidation"
import { sanitizeReviewInput } from "@/validations/ReviewValidation"
import {
  sanitizeAppointmentInput,
  sanitizeAppointmentStatus,
  sanitizeReschedule,
} from "@/validations/AppointmentValidation"
import { sanitizeBranchInput } from "@/validations/BranchValidation"
import { sanitizeRole } from "@/validations/AuthValidation"

/** Atajo: espera que la validación falle con un mensaje que contenga `parte`. */
function rechaza(operacion: () => unknown, parte: string) {
  assert.throws(operacion, (error: Error) => {
    assert.match(
      error.message.toLowerCase(),
      new RegExp(parte.toLowerCase()),
      `mensaje inesperado: "${error.message}"`
    )
    return true
  })
}

function isoOffsetDays(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

const pacienteValido = {
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@ejemplo.com",
  phone: "+54 11 1234-5678",
  dni: "35812443",
  birthDate: "1990-05-20",
}

describe("sanitizePatientInput", () => {
  test("acepta un paciente completo y recorta espacios", () => {
    const salida = sanitizePatientInput({
      ...pacienteValido,
      firstName: "  Juan  ",
      lastName: " Pérez ",
    })
    assert.equal(salida.firstName, "Juan")
    assert.equal(salida.lastName, "Pérez")
    assert.equal(salida.dni, "35812443")
  })

  test("normaliza el DNI con puntos", () => {
    assert.equal(sanitizePatientInput({ ...pacienteValido, dni: "35.812.443" }).dni, "35812443")
  })

  test("acepta 7 y 8 dígitos", () => {
    assert.equal(sanitizePatientInput({ ...pacienteValido, dni: "1234567" }).dni, "1234567")
    assert.equal(sanitizePatientInput({ ...pacienteValido, dni: "12345678" }).dni, "12345678")
  })

  test("rechaza 6 y 9 dígitos", () => {
    rechaza(() => sanitizePatientInput({ ...pacienteValido, dni: "123456" }), "dígitos")
    rechaza(() => sanitizePatientInput({ ...pacienteValido, dni: "123456789" }), "dígitos")
  })

  test("rechaza campos obligatorios vacíos", () => {
    rechaza(() => sanitizePatientInput({ ...pacienteValido, firstName: "" }), "nombre")
    rechaza(() => sanitizePatientInput({ ...pacienteValido, lastName: "   " }), "apellido")
    rechaza(() => sanitizePatientInput({ ...pacienteValido, dni: "" }), "dni")
  })

  test("rechaza emails inválidos", () => {
    for (const email of ["", "sinarroba", "a@b", "a@b.", "@dominio.com", "a b@c.com"]) {
      rechaza(() => sanitizePatientInput({ ...pacienteValido, email }), "email")
    }
  })

  test("rechaza una fecha de nacimiento futura", () => {
    rechaza(
      () => sanitizePatientInput({ ...pacienteValido, birthDate: isoOffsetDays(1) }),
      "futura"
    )
  })

  test("acepta que haya nacido hoy", () => {
    const salida = sanitizePatientInput({ ...pacienteValido, birthDate: isoOffsetDays(0) })
    assert.equal(salida.birthDate, isoOffsetDays(0))
  })

  test("rechaza una fecha que no existe en el calendario", () => {
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "2025-02-30" }), "real")
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "2025-13-01" }), "real")
  })

  test("acepta el 29 de febrero de un año bisiesto y rechaza el de uno común", () => {
    assert.equal(
      sanitizePatientInput({ ...pacienteValido, birthDate: "2000-02-29" }).birthDate,
      "2000-02-29"
    )
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "2001-02-29" }), "real")
  })

  test("rechaza un formato de fecha que no es ISO", () => {
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "20/05/1990" }), "formato")
  })

  test("rechaza una edad imposible", () => {
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "1800-01-01" }), "120")
  })

  test("no acepta un año de dos dígitos reinterpretado como 1900", () => {
    // new Date(50, 0, 1) da 1950: la validación tiene que detectar el desvío.
    rechaza(() => sanitizePatientInput({ ...pacienteValido, birthDate: "0050-01-01" }), "")
  })

  test("no explota con entradas basura", () => {
    for (const basura of [null, undefined, 42, "texto", []]) {
      assert.throws(() => sanitizePatientInput(basura))
    }
  })
})

const medicoValido = {
  firstName: "María",
  lastName: "González",
  email: "maria@ejemplo.com",
  specialtyId: "esp-1",
  branchId: "sede-1",
  office: "101",
}

describe("sanitizeMedicInput", () => {
  test("acepta un médico completo", () => {
    const salida = sanitizeMedicInput(medicoValido)
    assert.equal(salida.firstName, "María")
    assert.equal(salida.branchId, "sede-1")
    assert.equal(salida.office, "101")
  })

  test("el nombre de la especialidad lo resuelve el servicio, no la validación", () => {
    assert.equal(sanitizeMedicInput(medicoValido).specialtyName, "")
  })

  test("rechaza un consultorio sin sede", () => {
    rechaza(
      () => sanitizeMedicInput({ ...medicoValido, branchId: "", office: "101" }),
      "sede"
    )
  })

  test("permite un médico sin sede ni consultorio", () => {
    const salida = sanitizeMedicInput({ ...medicoValido, branchId: "", office: "" })
    assert.equal(salida.branchId, "")
    assert.equal(salida.office, "")
  })

  test("acepta etiquetas de consultorio razonables", () => {
    for (const office of ["101", "3B", "PB-2", "A 12", "1/2"]) {
      assert.equal(sanitizeMedicInput({ ...medicoValido, office }).office, office)
    }
  })

  test("rechaza consultorios con símbolos raros o demasiado largos", () => {
    rechaza(() => sanitizeMedicInput({ ...medicoValido, office: "101<script>" }), "consultorio")
    rechaza(() => sanitizeMedicInput({ ...medicoValido, office: "0123456789ABCD" }), "consultorio")
  })

  test("un consultorio de solo espacios cuenta como vacío", () => {
    assert.equal(sanitizeMedicInput({ ...medicoValido, office: "   " }).office, "")
  })

  test("workDays: filtra valores fuera de 0..6", () => {
    assert.deepEqual(sanitizeMedicInput({ ...medicoValido, workDays: [1, 3, 9, -2] }).workDays, [1, 3])
  })

  test("workDays: vuelve al lunes-viernes si queda vacío o no es lista", () => {
    assert.deepEqual(sanitizeMedicInput({ ...medicoValido, workDays: [] }).workDays, [1, 2, 3, 4, 5])
    assert.deepEqual(sanitizeMedicInput({ ...medicoValido, workDays: "lunes" }).workDays, [1, 2, 3, 4, 5])
  })

  test("workDays: acepta domingo y sábado", () => {
    assert.deepEqual(sanitizeMedicInput({ ...medicoValido, workDays: [0, 6] }).workDays, [0, 6])
  })

  test("la jornada por defecto se completa sola", () => {
    const salida = sanitizeMedicInput(medicoValido)
    assert.equal(salida.startTime, "08:00")
    assert.equal(salida.endTime, "18:00")
    assert.equal(salida.slotMinutes, 30)
  })

  test("acepta una jornada propia", () => {
    const salida = sanitizeMedicInput({
      ...medicoValido,
      startTime: "07:30",
      endTime: "13:30",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 15,
    })
    assert.equal(salida.startTime, "07:30")
    assert.equal(salida.slotMinutes, 15)
  })

  test("rechaza un cierre anterior a la apertura", () => {
    rechaza(
      () => sanitizeMedicInput({ ...medicoValido, startTime: "18:00", endTime: "08:00" }),
      "posterior"
    )
  })

  test("rechaza duraciones fuera de rango", () => {
    rechaza(() => sanitizeMedicInput({ ...medicoValido, slotMinutes: 2 }), "5 y 240")
    rechaza(() => sanitizeMedicInput({ ...medicoValido, slotMinutes: 500 }), "5 y 240")
  })

  test("rechaza un descanso invertido", () => {
    rechaza(
      () =>
        sanitizeMedicInput({
          ...medicoValido,
          breakStart: "15:00",
          breakEnd: "12:00",
        }),
      "posterior a su inicio"
    )
  })

  test("rechaza una jornada donde no entra ningún turno", () => {
    rechaza(
      () =>
        sanitizeMedicInput({
          ...medicoValido,
          startTime: "09:00",
          endTime: "09:20",
          breakStart: "",
          breakEnd: "",
          slotMinutes: 30,
        }),
      "no entra ningún turno"
    )
  })

  test("una hora con formato inválido cae al valor por defecto", () => {
    const salida = sanitizeMedicInput({ ...medicoValido, startTime: "8am" })
    assert.equal(salida.startTime, "08:00")
  })

  test("rechaza email inválido y nombres vacíos", () => {
    rechaza(() => sanitizeMedicInput({ ...medicoValido, email: "roto" }), "email")
    rechaza(() => sanitizeMedicInput({ ...medicoValido, firstName: "" }), "nombre")
  })
})

describe("sanitizeSpecialtyInput", () => {
  test("acepta una especialidad completa", () => {
    const salida = sanitizeSpecialtyInput({
      name: "Cardiología",
      description: "Atención del corazón.",
      icon: "HeartPulse",
    })
    assert.equal(salida.icon, "HeartPulse")
  })

  test("un ícono desconocido cae al valor por defecto", () => {
    const salida = sanitizeSpecialtyInput({
      name: "X",
      description: "Y",
      icon: "IconoInventado",
    })
    assert.equal(salida.icon, "Stethoscope")
  })

  test("exige nombre y descripción", () => {
    rechaza(() => sanitizeSpecialtyInput({ name: "", description: "Y" }), "nombre")
    rechaza(() => sanitizeSpecialtyInput({ name: "X", description: "  " }), "descripción")
  })
})

describe("sanitizeUserInput y sanitizePassword", () => {
  const usuarioValido = { name: "Ana", email: "Ana@Ejemplo.COM", role: "admin" }

  test("normaliza el email a minúsculas", () => {
    assert.equal(sanitizeUserInput(usuarioValido).email, "ana@ejemplo.com")
  })

  test("acepta los tres roles válidos", () => {
    for (const role of ["patient", "doctor", "admin"]) {
      assert.equal(sanitizeUserInput({ ...usuarioValido, role }).role, role)
    }
  })

  test("rechaza un rol inventado", () => {
    rechaza(() => sanitizeUserInput({ ...usuarioValido, role: "superadmin" }), "rol")
    rechaza(() => sanitizeUserInput({ ...usuarioValido, role: undefined }), "rol")
  })

  test("la contraseña exige 8 caracteres", () => {
    rechaza(() => sanitizePassword("1234567"), "contraseña")
    assert.equal(sanitizePassword("12345678"), "12345678")
  })

  test("una contraseña ausente se rechaza", () => {
    rechaza(() => sanitizePassword(undefined), "contraseña")
  })
})

describe("sanitizeReviewInput", () => {
  test("acepta una calificación válida", () => {
    const salida = sanitizeReviewInput({ appointmentId: "t-1", score: 4, comment: " Muy bien " })
    assert.equal(salida.score, 4)
    assert.equal(salida.comment, "Muy bien")
  })

  test("acepta los extremos 1 y 5", () => {
    assert.equal(sanitizeReviewInput({ appointmentId: "t", score: 1 }).score, 1)
    assert.equal(sanitizeReviewInput({ appointmentId: "t", score: 5 }).score, 5)
  })

  test("rechaza fuera de rango y no enteros", () => {
    for (const score of [0, 6, -1, 3.5, NaN, "cinco"]) {
      rechaza(() => sanitizeReviewInput({ appointmentId: "t", score }), "calificación")
    }
  })

  test("un comentario vacío queda indefinido, no cadena vacía", () => {
    assert.equal(sanitizeReviewInput({ appointmentId: "t", score: 3, comment: "   " }).comment, undefined)
  })

  test("rechaza un comentario desmedido", () => {
    rechaza(
      () => sanitizeReviewInput({ appointmentId: "t", score: 3, comment: "x".repeat(501) }),
      "500"
    )
  })

  test("exige el turno", () => {
    rechaza(() => sanitizeReviewInput({ score: 3 }), "turno")
  })
})

describe("validaciones de turno", () => {
  test("acepta una reserva bien formada", () => {
    const salida = sanitizeAppointmentInput({
      doctorId: "d-1",
      date: "2026-03-15",
      time: "10:30",
      reason: " Control ",
    })
    assert.equal(salida.reason, "Control")
  })

  test("rechaza fecha y hora mal formadas", () => {
    rechaza(() => sanitizeAppointmentInput({ doctorId: "d", date: "15/03/2026", time: "10:30" }), "fecha")
    rechaza(() => sanitizeAppointmentInput({ doctorId: "d", date: "2026-03-15", time: "10.30" }), "hora")
    rechaza(() => sanitizeAppointmentInput({ doctorId: "d", date: "2026-03-15", time: "9:30" }), "hora")
  })

  test("exige elegir profesional", () => {
    rechaza(() => sanitizeAppointmentInput({ date: "2026-03-15", time: "10:30" }), "profesional")
  })

  test("un motivo vacío queda indefinido", () => {
    const salida = sanitizeAppointmentInput({ doctorId: "d", date: "2026-03-15", time: "10:30", reason: "  " })
    assert.equal(salida.reason, undefined)
  })

  test("acepta los cuatro estados y rechaza el resto", () => {
    for (const estado of ["scheduled", "completed", "cancelled", "absent"]) {
      assert.equal(sanitizeAppointmentStatus(estado), estado)
    }
    rechaza(() => sanitizeAppointmentStatus("pendiente"), "estado")
    rechaza(() => sanitizeAppointmentStatus(null), "estado")
  })

  test("sanitizeReschedule valida los dos campos", () => {
    assert.deepEqual(sanitizeReschedule("2026-03-15", "10:30"), {
      date: "2026-03-15",
      time: "10:30",
    })
    rechaza(() => sanitizeReschedule("mañana", "10:30"), "fecha")
    rechaza(() => sanitizeReschedule("2026-03-15", ""), "hora")
  })
})

describe("sanitizeBranchInput", () => {
  test("acepta una sede completa", () => {
    const salida = sanitizeBranchInput({
      name: " Sede Central ",
      address: " Av. Corrientes 1234 ",
      phone: "+54 11 4000-1000",
      active: true,
    })
    assert.equal(salida.name, "Sede Central")
    assert.equal(salida.address, "Av. Corrientes 1234")
  })

  test("una sede se crea activa si no se indica", () => {
    assert.equal(sanitizeBranchInput({ name: "X", address: "Y" }).active, true)
  })

  test("exige nombre y dirección", () => {
    rechaza(() => sanitizeBranchInput({ name: "", address: "Y" }), "nombre")
    rechaza(() => sanitizeBranchInput({ name: "X", address: "" }), "dirección")
  })
})

describe("sanitizeRole", () => {
  test("acepta los roles conocidos", () => {
    assert.equal(sanitizeRole("doctor"), "doctor")
  })

  test("rechaza cualquier otra cosa", () => {
    rechaza(() => sanitizeRole("root"), "rol")
    rechaza(() => sanitizeRole(123), "rol")
  })
})
