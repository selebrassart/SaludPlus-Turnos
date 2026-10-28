import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { NotificationService } from "@/services/NotificationService"
import { Appointment } from "@/models/Appointment"
import { Medic } from "@/models/Medic"
import { Patient } from "@/models/Patient"
import { toISODate } from "@/lib/format/date"
import {
  FakeAppointmentRepository,
  FakeMedicRepository,
  FakeNotificationRepository,
  FakePatientRepository,
} from "./fakes.ts"

function isoOffsetDays(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

let avisos: FakeNotificationRepository
let turnos: FakeAppointmentRepository
let pacientes: FakePatientRepository
let medicos: FakeMedicRepository
let servicio: NotificationService

function turno(overrides: Partial<Appointment> = {}) {
  return new Appointment({
    id: overrides.id ?? "turno-1",
    patientId: overrides.patientId ?? "pac-1",
    patientName: "Juan Pérez",
    doctorId: overrides.doctorId ?? "doc-1",
    doctorName: "Dra. María González",
    specialtyName: "Cardiología",
    branchId: "sede-1",
    branchName: "Sede Central",
    office: "101",
    date: overrides.date ?? "2026-06-10",
    time: overrides.time ?? "10:00",
    status: overrides.status ?? "scheduled",
  })
}

beforeEach(() => {
  avisos = new FakeNotificationRepository()
  turnos = new FakeAppointmentRepository()
  pacientes = new FakePatientRepository()
  medicos = new FakeMedicRepository()

  pacientes.items.push(
    new Patient("pac-1", "Juan", "Pérez", "juan@x.com", "", "", "1990-01-01", "2026-01-01", null, "user-pac")
  )
  medicos.items.push(
    new Medic({
      id: "doc-1",
      firstName: "María",
      lastName: "González",
      email: "maria@x.com",
      userId: "user-doc",
    })
  )

  servicio = new NotificationService(
    avisos as never,
    turnos as never,
    pacientes as never,
    medicos as never
  )
})

describe("emisión de avisos", () => {
  test("al reservar avisa al paciente y al profesional", async () => {
    await servicio.appointmentBooked(turno())

    assert.equal(avisos.items.length, 2)
    const destinatarios = avisos.items.map((item) => item.userId).sort()
    assert.deepEqual(destinatarios, ["user-doc", "user-pac"])
  })

  test("el aviso del paciente incluye sede y consultorio", async () => {
    await servicio.appointmentBooked(turno())
    const delPaciente = avisos.items.find((item) => item.userId === "user-pac")
    assert.match(delPaciente?.body ?? "", /Sede Central/)
    assert.match(delPaciente?.body ?? "", /consultorio 101/i)
  })

  test("reservar dos veces el mismo turno no duplica el aviso", async () => {
    await servicio.appointmentBooked(turno())
    await servicio.appointmentBooked(turno())
    assert.equal(avisos.items.length, 2, "la deduplicación debe filtrar el segundo intento")
  })

  test("una ficha sin cuenta de acceso simplemente no recibe aviso", async () => {
    medicos.items[0].userId = null

    await servicio.appointmentBooked(turno())
    assert.equal(avisos.items.length, 1)
    assert.equal(avisos.items[0].userId, "user-pac")
  })

  test("cancelar avisa a las dos partes", async () => {
    await servicio.appointmentCancelled(turno({ status: "cancelled" }))
    assert.equal(avisos.items.length, 2)
    assert.ok(avisos.items.every((item) => item.type === "appointment_cancelled"))
  })

  test("reprogramar informa el horario viejo y el nuevo", async () => {
    await servicio.appointmentRescheduled(
      turno({ date: "2026-06-15", time: "16:00" }),
      "2026-06-10",
      "10:00"
    )
    const cuerpo = avisos.items[0].body
    assert.match(cuerpo, /10:00/)
    assert.match(cuerpo, /16:00/)
  })

  test("reprogramar dos veces genera dos avisos distintos", async () => {
    await servicio.appointmentRescheduled(turno({ date: "2026-06-11" }), "2026-06-10", "10:00")
    await servicio.appointmentRescheduled(turno({ date: "2026-06-12" }), "2026-06-11", "10:00")

    const delPaciente = avisos.items.filter((item) => item.userId === "user-pac")
    assert.equal(delPaciente.length, 2, "la clave incluye la fecha nueva")
  })

  test("marcar como atendido avisa solo al paciente", async () => {
    await servicio.appointmentStatusChanged(turno({ status: "completed" }))
    assert.equal(avisos.items.length, 1)
    assert.equal(avisos.items[0].userId, "user-pac")
    assert.match(avisos.items[0].body, /calificar/i)
  })

  test("volver a agendar no genera aviso de estado", async () => {
    await servicio.appointmentStatusChanged(turno({ status: "scheduled" }))
    assert.equal(avisos.items.length, 0, "no hay mensaje definido para 'scheduled'")
  })

  test("una reseña avisa al profesional", async () => {
    await servicio.reviewReceived(turno({ status: "completed" }), 5)
    assert.equal(avisos.items.length, 1)
    assert.equal(avisos.items[0].userId, "user-doc")
    assert.match(avisos.items[0].body, /5 estrellas/)
  })

  test("una reseña de una estrella usa el singular", async () => {
    await servicio.reviewReceived(turno({ status: "completed" }), 1)
    assert.match(avisos.items[0].body, /1 estrella\b/)
  })
})

describe("recordatorios del día previo", () => {
  test("genera un aviso por cada turno de mañana", async () => {
    turnos.items.push(
      turno({ id: "t1", date: isoOffsetDays(1), time: "09:00" }),
      turno({ id: "t2", date: isoOffsetDays(1), time: "10:00" })
    )

    const creados = await servicio.generateReminders()
    assert.equal(creados, 2)
    assert.ok(avisos.items.every((item) => item.type === "appointment_reminder"))
  })

  test("ignora los turnos de hoy y de pasado mañana", async () => {
    turnos.items.push(
      turno({ id: "hoy", date: isoOffsetDays(0) }),
      turno({ id: "pasado", date: isoOffsetDays(2) })
    )
    assert.equal(await servicio.generateReminders(), 0)
  })

  test("ignora los turnos cancelados", async () => {
    turnos.items.push(
      turno({ id: "t1", date: isoOffsetDays(1), status: "cancelled" })
    )
    assert.equal(await servicio.generateReminders(), 0)
  })

  test("es idempotente: correrlo mil veces deja un solo aviso", async () => {
    turnos.items.push(turno({ id: "t1", date: isoOffsetDays(1) }))

    assert.equal(await servicio.generateReminders(), 1)
    assert.equal(await servicio.generateReminders(), 0, "el segundo intento no crea nada")
    assert.equal(await servicio.generateReminders(), 0)
    assert.equal(avisos.items.length, 1)
  })

  test("acotado a un paciente solo genera los suyos", async () => {
    pacientes.items.push(
      new Patient("pac-2", "Ana", "López", "ana@x.com", "", "", "1990-01-01", "2026-01-01", null, "user-ana")
    )
    turnos.items.push(
      turno({ id: "t1", date: isoOffsetDays(1), patientId: "pac-1" }),
      turno({ id: "t2", date: isoOffsetDays(1), patientId: "pac-2", time: "11:00" })
    )

    const creados = await servicio.generateReminders("pac-1")
    assert.equal(creados, 1)
    assert.equal(avisos.items[0].userId, "user-pac")
  })

  test("la vía por usuario y la del planificador no se pisan", async () => {
    turnos.items.push(turno({ id: "t1", date: isoOffsetDays(1) }))

    await servicio.generateReminders("pac-1")
    const porPlanificador = await servicio.generateReminders()

    assert.equal(porPlanificador, 0, "el aviso ya existía")
    assert.equal(avisos.items.length, 1)
  })
})

describe("aislamiento de fallos", () => {
  test("un fallo al registrar el aviso no tumba la operación", async () => {
    const roto = {
      async createIfMissing() {
        throw new Error("la base se cayó")
      },
    }
    const servicioRoto = new NotificationService(
      roto as never,
      turnos as never,
      pacientes as never,
      medicos as never
    )

    const original = console.error
    console.error = () => {}
    try {
      await assert.doesNotReject(() => servicioRoto.appointmentBooked(turno()))
    } finally {
      console.error = original
    }
  })

  test("un recordatorio que falla no corta la generación del resto", async () => {
    let llamadas = 0
    const intermitente = {
      async createIfMissing() {
        llamadas++
        if (llamadas === 1) throw new Error("fallo transitorio")
        return true
      },
    }
    const servicioIntermitente = new NotificationService(
      intermitente as never,
      turnos as never,
      pacientes as never,
      medicos as never
    )
    turnos.items.push(
      turno({ id: "t1", date: isoOffsetDays(1), time: "09:00" }),
      turno({ id: "t2", date: isoOffsetDays(1), time: "10:00" })
    )

    const original = console.error
    console.error = () => {}
    try {
      const creados = await servicioIntermitente.generateReminders()
      assert.equal(creados, 1, "el segundo turno debe procesarse igual")
    } finally {
      console.error = original
    }
  })
})

describe("lectura de la campanita", () => {
  test("cuenta solo los no leídos", async () => {
    await servicio.appointmentBooked(turno())
    assert.equal(await servicio.countUnread("user-pac"), 1)

    await servicio.markAllRead("user-pac")
    assert.equal(await servicio.countUnread("user-pac"), 0)
  })

  test("marcar como leído no afecta a otros usuarios", async () => {
    await servicio.appointmentBooked(turno())
    await servicio.markAllRead("user-pac")
    assert.equal(await servicio.countUnread("user-doc"), 1)
  })

  test("cada usuario ve solo sus avisos", async () => {
    await servicio.appointmentBooked(turno())
    const delPaciente = await servicio.list("user-pac")
    assert.equal(delPaciente.length, 1)
    assert.equal(delPaciente[0].userId, "user-pac")
  })
})
