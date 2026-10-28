import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { AppointmentService } from "@/services/AppointmentService"
import { PatientService } from "@/services/PatientService"
import { Appointment } from "@/models/Appointment"
import { Medic } from "@/models/Medic"
import { Patient } from "@/models/Patient"
import type { SessionUser } from "@/models/User"
import {
  FakeAppointmentRepository,
  FakeMedicRepository,
  FakePatientRepository,
  FakeUserRepository,
  SpyNotificationService,
} from "./fakes.ts"

const paciente: SessionUser = {
  id: "user-pac",
  name: "Juan Pérez",
  email: "juan@ejemplo.com",
  role: "patient",
}
const profesional: SessionUser = {
  id: "user-doc",
  name: "María González",
  email: "maria@ejemplo.com",
  role: "doctor",
}
const administrador: SessionUser = {
  id: "user-adm",
  name: "Admin",
  email: "admin@ejemplo.com",
  role: "admin",
}

let turnos: FakeAppointmentRepository
let medicos: FakeMedicRepository
let pacientes: FakePatientRepository
let usuarios: FakeUserRepository
let avisos: SpyNotificationService
let servicio: AppointmentService

function nuevoTurno(overrides: Partial<Appointment> = {}): Appointment {
  return new Appointment({
    id: overrides.id ?? "turno-1",
    patientId: overrides.patientId ?? "pac-1",
    patientName: "Juan Pérez",
    doctorId: overrides.doctorId ?? "doc-1",
    doctorName: "Dra. María González",
    specialtyName: "Cardiología",
    branchId: overrides.branchId ?? "sede-1",
    branchName: "Sede Central",
    office: overrides.office ?? "101",
    date: overrides.date ?? "2026-06-10",
    time: overrides.time ?? "10:00",
    status: overrides.status ?? "scheduled",
  })
}

beforeEach(() => {
  turnos = new FakeAppointmentRepository()
  medicos = new FakeMedicRepository()
  pacientes = new FakePatientRepository()
  usuarios = new FakeUserRepository()
  avisos = new SpyNotificationService()

  medicos.items.push(
    new Medic({
      id: "doc-1",
      firstName: "María",
      lastName: "González",
      email: "maria@ejemplo.com",
      specialtyId: "esp-1",
      specialtyName: "Cardiología",
      branchId: "sede-1",
      branchName: "Sede Central",
      office: "101",
      userId: "user-doc",
      workDays: [1, 2, 3, 4, 5],
    }),
    // Comparte consultorio con la anterior: sirve para el choque de sala.
    new Medic({
      id: "doc-2",
      firstName: "Carlos",
      lastName: "Ramírez",
      email: "carlos@ejemplo.com",
      specialtyId: "esp-1",
      specialtyName: "Cardiología",
      branchId: "sede-1",
      branchName: "Sede Central",
      office: "101",
      workDays: [1, 2, 3, 4, 5],
    })
  )

  pacientes.items.push(
    new Patient(
      "pac-1",
      "Juan",
      "Pérez",
      "juan@ejemplo.com",
      "",
      "35812443",
      "1990-05-20",
      "2026-01-01",
      null,
      "user-pac"
    )
  )

  const servicioPacientes = new PatientService(
    pacientes as never,
    usuarios as never
  )
  servicio = new AppointmentService(
    turnos as never,
    medicos as never,
    servicioPacientes as never,
    avisos as never
  )
})

describe("AppointmentService.create", () => {
  test("reserva un turno y copia sede y consultorio del profesional", async () => {
    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })

    assert.equal(resultado.ok, true)
    assert.equal(turnos.items.length, 1)
    assert.equal(turnos.items[0].branchName, "Sede Central")
    assert.equal(turnos.items[0].office, "101")
    assert.equal(turnos.items[0].doctorName, "Dra. María González")
  })

  test("avisa a las partes al reservar", async () => {
    await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.deepEqual(avisos.metodosLlamados(), ["appointmentBooked"])
  })

  test("rechaza un profesional inexistente", async () => {
    const resultado = await servicio.create(paciente, {
      doctorId: "no-existe",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /no existe/i)
  })

  test("rechaza un horario ya tomado con el mismo profesional", async () => {
    turnos.items.push(nuevoTurno())

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /ya fue reservado/i)
  })

  test("un turno cancelado libera el horario", async () => {
    turnos.items.push(nuevoTurno({ status: "cancelled" }))

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, true)
  })

  test("rechaza si el consultorio está ocupado por otro profesional", async () => {
    // doc-2 comparte sede y consultorio con doc-1. El turno es de OTRO
    // paciente: si fuera del mismo, lo frenaría antes la guarda de agenda
    // personal y no se estaría probando el choque de sala.
    turnos.items.push(
      nuevoTurno({ id: "otro", doctorId: "doc-2", patientId: "pac-2" })
    )

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /consultorio 101/i)
  })

  test("sin consultorio asignado no hay choque de sala", async () => {
    medicos.items[0].office = ""
    medicos.items[0].branchId = null
    turnos.items.push(
      nuevoTurno({ id: "otro", doctorId: "doc-2", patientId: "pac-2" })
    )

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, true)
  })

  test("una persona no puede estar en dos consultas a la vez", async () => {
    // El caso que se vio en producción: cardiología y fonoaudiología el mismo
    // día a las 10:00, con profesionales distintos. Cada turno era válido por
    // separado y ninguna de las otras dos guardas —agenda del médico,
    // consultorio— los veía.
    turnos.items.push(
      nuevoTurno({
        id: "otro",
        doctorId: "doc-2",
        branchId: null,
        office: "",
      })
    )
    medicos.items[0].office = ""
    medicos.items[0].branchId = null

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })

    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /ya tenés un turno/i)
    // El mensaje dice con quién, para que se entienda sin ir a buscarlo.
    assert.match(resultado.error ?? "", /Dra\. María González/)
  })

  test("un turno propio cancelado no bloquea el horario", async () => {
    turnos.items.push(
      nuevoTurno({
        id: "otro",
        doctorId: "doc-2",
        branchId: null,
        office: "",
        status: "cancelled",
      })
    )
    medicos.items[0].office = ""
    medicos.items[0].branchId = null

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("otra hora del mismo día sí se puede", async () => {
    turnos.items.push(
      nuevoTurno({ id: "otro", doctorId: "doc-2", branchId: null, office: "" })
    )
    medicos.items[0].office = ""
    medicos.items[0].branchId = null

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "11:00",
    })
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("el turno de otra persona en ese horario no me bloquea", async () => {
    turnos.items.push(
      nuevoTurno({
        id: "otro",
        doctorId: "doc-2",
        patientId: "pac-2",
        branchId: null,
        office: "",
      })
    )
    medicos.items[0].office = ""
    medicos.items[0].branchId = null

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("crea la ficha del paciente si la cuenta no tenía una", async () => {
    pacientes.items = []

    const resultado = await servicio.create(paciente, {
      doctorId: "doc-1",
      date: "2026-06-10",
      time: "10:00",
    })

    assert.equal(resultado.ok, true, resultado.error)
    assert.equal(pacientes.items.length, 1)
    assert.equal(pacientes.items[0].userId, "user-pac")
  })
})

describe("AppointmentService.findAllForUser", () => {
  beforeEach(() => {
    turnos.items.push(
      nuevoTurno({ id: "t1", doctorId: "doc-1", patientId: "pac-1" }),
      nuevoTurno({ id: "t2", doctorId: "doc-2", patientId: "pac-9", time: "11:00" })
    )
  })

  test("el administrador ve todos", async () => {
    assert.equal((await servicio.findAllForUser(administrador)).length, 2)
  })

  test("el profesional ve solo los suyos", async () => {
    const propios = await servicio.findAllForUser(profesional)
    assert.equal(propios.length, 1)
    assert.equal(propios[0].doctorId, "doc-1")
  })

  test("el paciente ve solo los suyos", async () => {
    const propios = await servicio.findAllForUser(paciente)
    assert.equal(propios.length, 1)
    assert.equal(propios[0].patientId, "pac-1")
  })

  test("una cuenta sin ficha no ve turnos ajenos", async () => {
    pacientes.items = []
    assert.deepEqual(await servicio.findAllForUser(paciente), [])
  })
})

describe("AppointmentService.findOneForUser", () => {
  beforeEach(() => {
    turnos.items.push(nuevoTurno())
  })

  test("el paciente accede al suyo", async () => {
    const encontrado = await servicio.findOneForUser(paciente, "turno-1")
    assert.equal(encontrado?.id, "turno-1")
  })

  test("el paciente no accede al de otro", async () => {
    turnos.items[0].patientId = "pac-ajeno"
    assert.equal(await servicio.findOneForUser(paciente, "turno-1"), undefined)
  })

  test("el profesional accede a los suyos", async () => {
    const encontrado = await servicio.findOneForUser(profesional, "turno-1")
    assert.equal(encontrado?.id, "turno-1")
  })

  test("el profesional no accede a los de un colega", async () => {
    turnos.items[0].doctorId = "doc-2"
    assert.equal(await servicio.findOneForUser(profesional, "turno-1"), undefined)
  })

  test("el administrador accede a cualquiera", async () => {
    turnos.items[0].patientId = "pac-ajeno"
    const encontrado = await servicio.findOneForUser(administrador, "turno-1")
    assert.equal(encontrado?.id, "turno-1")
  })

  test("un id inexistente devuelve undefined, no lanza", async () => {
    assert.equal(await servicio.findOneForUser(administrador, "fantasma"), undefined)
  })

  test("una cuenta sin ficha no accede a nada", async () => {
    pacientes.items = []
    assert.equal(await servicio.findOneForUser(paciente, "turno-1"), undefined)
  })
})

describe("AppointmentService.takenSlots", () => {
  test("lista los horarios ocupados e ignora los cancelados", async () => {
    turnos.items.push(
      nuevoTurno({ id: "a", time: "10:00" }),
      nuevoTurno({ id: "b", time: "11:00" }),
      nuevoTurno({ id: "c", time: "12:00", status: "cancelled" })
    )

    const ocupados = await servicio.takenSlots("doc-1", "2026-06-10")
    assert.deepEqual(ocupados.sort(), ["10:00", "11:00"])
  })

  test("sin usuario solo mira la agenda del profesional", async () => {
    turnos.items.push(nuevoTurno({ id: "a", doctorId: "doc-2", time: "09:00" }))

    const ocupados = await servicio.takenSlots("doc-1", "2026-06-10")
    assert.deepEqual(ocupados, [])
  })

  test("suma los horarios que el paciente ya tiene con otro médico", async () => {
    // Sin esto el calendario ofrecía el horario como libre y el rechazo
    // recién aparecía al confirmar, que es la peor forma de enterarse.
    turnos.items.push(
      nuevoTurno({ id: "a", doctorId: "doc-1", time: "10:00" }),
      nuevoTurno({ id: "b", doctorId: "doc-2", time: "16:00" })
    )

    const ocupados = await servicio.takenSlots("doc-1", "2026-06-10", paciente)
    assert.deepEqual(ocupados.sort(), ["10:00", "16:00"])
  })

  test("no filtra los horarios de otras personas", async () => {
    turnos.items.push(
      nuevoTurno({
        id: "a",
        doctorId: "doc-2",
        patientId: "pac-2",
        time: "16:00",
      })
    )

    const ocupados = await servicio.takenSlots("doc-1", "2026-06-10", paciente)
    assert.deepEqual(ocupados, [])
  })

  test("no repite un horario que está ocupado por los dos motivos", async () => {
    turnos.items.push(nuevoTurno({ id: "a", doctorId: "doc-1", time: "10:00" }))

    const ocupados = await servicio.takenSlots("doc-1", "2026-06-10", paciente)
    assert.deepEqual(ocupados, ["10:00"])
  })
})

describe("AppointmentService.reschedule", () => {
  beforeEach(() => {
    turnos.items.push(nuevoTurno())
  })

  test("mueve el turno conservando su identidad", async () => {
    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-11",
      "15:00"
    )

    assert.equal(resultado.ok, true, resultado.error)
    assert.equal(turnos.items.length, 1, "no debe crear un turno nuevo")
    assert.equal(turnos.items[0].id, "turno-1")
    assert.equal(turnos.items[0].date, "2026-06-11")
    assert.equal(turnos.items[0].time, "15:00")
    assert.equal(turnos.items[0].status, "scheduled")
  })

  test("avisa del cambio con los datos anteriores", async () => {
    await servicio.reschedule(paciente, "turno-1", "2026-06-11", "15:00")
    assert.deepEqual(avisos.metodosLlamados(), ["appointmentRescheduled"])
    assert.deepEqual(avisos.calls[0].args.slice(1), ["2026-06-10", "10:00"])
  })

  test("un paciente no puede mover el turno de otro", async () => {
    turnos.items[0].patientId = "pac-ajeno"

    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-11",
      "15:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /tus propios turnos/i)
  })

  test("el administrador sí puede mover cualquier turno", async () => {
    turnos.items[0].patientId = "pac-ajeno"

    const resultado = await servicio.reschedule(
      administrador,
      "turno-1",
      "2026-06-11",
      "15:00"
    )
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("no se puede mover un turno ya atendido o cancelado", async () => {
    for (const estado of ["completed", "cancelled", "absent"] as const) {
      turnos.items[0].status = estado
      const resultado = await servicio.reschedule(
        administrador,
        "turno-1",
        "2026-06-11",
        "15:00"
      )
      assert.equal(resultado.ok, false, `debería rechazar estado ${estado}`)
      assert.match(resultado.error ?? "", /agendados/i)
    }
  })

  test("rechaza mover al mismo horario", async () => {
    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-10",
      "10:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /distinta/i)
  })

  test("permite cambiar solo la fecha conservando la hora", async () => {
    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-12",
      "10:00"
    )
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("rechaza si el nuevo horario está tomado", async () => {
    turnos.items.push(nuevoTurno({ id: "otro", time: "15:00" }))

    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-10",
      "15:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /ya fue reservado/i)
  })

  test("el propio turno no cuenta como su conflicto", async () => {
    // Solo cambia la fecha: si la exclusión por id fallara, findClash se
    // encontraría a sí mismo y rechazaría el movimiento.
    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-11",
      "10:00"
    )
    assert.equal(resultado.ok, true, resultado.error)
  })

  test("rechaza si el consultorio queda ocupado", async () => {
    turnos.items.push(
      nuevoTurno({
        id: "otro",
        doctorId: "doc-2",
        patientId: "pac-2",
        time: "15:00",
      })
    )

    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-10",
      "15:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /consultorio/i)
  })

  test("no se puede reprogramar encima de otro turno propio", async () => {
    turnos.items.push(
      nuevoTurno({
        id: "otro",
        doctorId: "doc-2",
        branchId: null,
        office: "",
        time: "16:00",
      })
    )

    const resultado = await servicio.reschedule(
      paciente,
      "turno-1",
      "2026-06-10",
      "16:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /ya tenés un turno/i)
  })

  test("un turno inexistente da error, no excepción", async () => {
    const resultado = await servicio.reschedule(
      paciente,
      "fantasma",
      "2026-06-11",
      "15:00"
    )
    assert.equal(resultado.ok, false)
    assert.match(resultado.error ?? "", /no existe/i)
  })
})

describe("AppointmentService.cancel", () => {
  beforeEach(() => {
    turnos.items.push(nuevoTurno())
  })

  test("el paciente cancela su propio turno", async () => {
    await servicio.cancel(paciente, "turno-1")
    assert.equal(turnos.items[0].status, "cancelled")
    assert.deepEqual(avisos.metodosLlamados(), ["appointmentCancelled"])
  })

  test("el paciente no puede cancelar un turno ajeno", async () => {
    turnos.items[0].patientId = "pac-ajeno"

    await servicio.cancel(paciente, "turno-1")
    assert.equal(
      turnos.items[0].status,
      "scheduled",
      "el turno ajeno no debe cambiar de estado"
    )
    assert.deepEqual(
      avisos.metodosLlamados(),
      [],
      "no debe avisar de una cancelación que no ocurrió"
    )
  })

  test("el administrador cancela cualquier turno", async () => {
    turnos.items[0].patientId = "pac-ajeno"

    await servicio.cancel(administrador, "turno-1")
    assert.equal(turnos.items[0].status, "cancelled")
  })
})

describe("AppointmentService.setStatus", () => {
  beforeEach(() => {
    turnos.items.push(nuevoTurno())
  })

  test("el profesional marca el turno como atendido", async () => {
    await servicio.setStatus(profesional, "turno-1", "completed")
    assert.equal(turnos.items[0].status, "completed")
    assert.deepEqual(avisos.metodosLlamados(), ["appointmentStatusChanged"])
  })

  test("el paciente no puede cambiar el estado", async () => {
    await assert.rejects(
      () => servicio.setStatus(paciente, "turno-1", "completed"),
      /Unauthorized/
    )
    assert.equal(turnos.items[0].status, "scheduled")
  })
})
