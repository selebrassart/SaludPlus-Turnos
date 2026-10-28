import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { BranchService } from "@/services/BranchService"
import { MedicService } from "@/services/MedicService"
import { PatientService } from "@/services/PatientService"
import { ReviewService } from "@/services/ReviewService"
import { SpecialtyService } from "@/services/SpecialtyService"
import { UserService } from "@/services/UserService"
import { Appointment } from "@/models/Appointment"
import { Branch } from "@/models/Branch"
import { Medic } from "@/models/Medic"
import { Patient } from "@/models/Patient"
import { Specialty } from "@/models/Specialty"
import type { SessionUser } from "@/models/User"
import {
  FakeAppointmentRepository,
  FakeBranchRepository,
  FakeMedicRepository,
  FakePatientRepository,
  FakeReviewRepository,
  FakeSpecialtyRepository,
  FakeUserRepository,
  SpyNotificationService,
} from "./fakes.ts"

async function esperaError(operacion: () => Promise<unknown>, parte: RegExp) {
  await assert.rejects(operacion, (error: Error) => {
    assert.match(error.message, parte, `mensaje inesperado: "${error.message}"`)
    return true
  })
}

// ---------------------------------------------------------------------------

describe("SpecialtyService", () => {
  let especialidades: FakeSpecialtyRepository
  let medicos: FakeMedicRepository
  let servicio: SpecialtyService

  beforeEach(() => {
    especialidades = new FakeSpecialtyRepository()
    medicos = new FakeMedicRepository()
    especialidades.items.push(
      new Specialty("esp-1", "Cardiología", "Corazón", "HeartPulse", 0)
    )
    servicio = new SpecialtyService(especialidades as never, medicos as never)
  })

  test("crea una especialidad nueva", async () => {
    const creada = await servicio.create({
      name: "Pediatría",
      description: "Niños",
      icon: "Baby",
    })
    assert.equal(creada.name, "Pediatría")
    assert.equal(creada.activeDoctors, 0, "arranca sin médicos asignados")
  })

  test("rechaza un nombre repetido sin importar mayúsculas", async () => {
    await esperaError(
      () => servicio.create({ name: "cardiología", description: "x", icon: "Baby" }),
      /Ya existe una especialidad/
    )
  })

  test("renombrar propaga el nombre a los médicos de esa especialidad", async () => {
    medicos.items.push(
      new Medic({
        id: "doc-1",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        specialtyId: "esp-1",
        specialtyName: "Cardiología",
      })
    )

    await servicio.update("esp-1", {
      name: "Cardiología clínica",
      description: "Corazón",
      icon: "HeartPulse",
    })

    assert.equal(medicos.items[0].specialtyName, "Cardiología clínica")
  })

  test("editar sin cambiar el nombre no dispara la propagación", async () => {
    await servicio.update("esp-1", {
      name: "Cardiología",
      description: "Otra descripción",
      icon: "HeartPulse",
    })
    assert.equal(medicos.renamedSpecialties.length, 0)
  })

  test("no se puede borrar una especialidad con médicos asignados", async () => {
    medicos.items.push(
      new Medic({
        id: "doc-1",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        specialtyId: "esp-1",
      })
    )

    await esperaError(() => servicio.remove("esp-1"), /1 médico asignado/)
    assert.equal(especialidades.items.length, 1, "no debe borrarse")
  })

  test("se puede borrar una especialidad sin médicos", async () => {
    await servicio.remove("esp-1")
    assert.equal(especialidades.items.length, 0)
  })

  test("el mensaje usa plural cuando corresponde", async () => {
    for (const id of ["doc-1", "doc-2"]) {
      medicos.items.push(
        new Medic({
          id,
          firstName: "A",
          lastName: id,
          email: `${id}@b.com`,
          specialtyId: "esp-1",
        })
      )
    }
    await esperaError(() => servicio.remove("esp-1"), /2 médicos asignados/)
  })
})

// ---------------------------------------------------------------------------

describe("BranchService", () => {
  let sedes: FakeBranchRepository
  let servicio: BranchService

  beforeEach(() => {
    sedes = new FakeBranchRepository()
    sedes.items.push(new Branch("sede-1", "Sede Central", "Corrientes 1234"))
    servicio = new BranchService(sedes as never)
  })

  test("crea una sede activa por defecto", async () => {
    const creada = await servicio.create({
      name: "Sede Norte",
      address: "Cabildo 2500",
      phone: "",
      active: true,
    })
    assert.equal(creada.active, true)
  })

  test("rechaza un nombre repetido", async () => {
    await esperaError(
      () =>
        servicio.create({
          name: "SEDE CENTRAL",
          address: "x",
          phone: "",
          active: true,
        }),
      /Ya existe una sede/
    )
  })

  test("no se puede borrar una sede con médicos", async () => {
    sedes.doctorsByBranch.set("sede-1", 3)
    await esperaError(() => servicio.remove("sede-1"), /3 médicos asignados/)
    assert.equal(sedes.items.length, 1)
  })

  test("el error sugiere desactivar en vez de borrar", async () => {
    sedes.doctorsByBranch.set("sede-1", 1)
    await esperaError(() => servicio.remove("sede-1"), /desactivá/i)
  })

  test("solo las sedes activas se ofrecen al reservar", async () => {
    sedes.items.push(new Branch("sede-2", "Sede Vieja", "x", "", false))
    const activas = await servicio.findActive()
    assert.deepEqual(
      activas.map((sede) => sede.id),
      ["sede-1"]
    )
  })
})

// ---------------------------------------------------------------------------

describe("MedicService", () => {
  let medicos: FakeMedicRepository
  let especialidades: FakeSpecialtyRepository
  let sedes: FakeBranchRepository
  let usuarios: FakeUserRepository
  let servicio: MedicService

  const entradaBase = {
    firstName: "María",
    lastName: "González",
    email: "maria@ejemplo.com",
    phone: "",
    specialtyId: "esp-1",
    specialtyName: "",
    branchId: "sede-1",
    office: "101",
    avatar: "",
    license: "",
    yearsExperience: 5,
    workDays: [1, 2, 3],
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotMinutes: 30,
  }

  beforeEach(() => {
    medicos = new FakeMedicRepository()
    especialidades = new FakeSpecialtyRepository()
    sedes = new FakeBranchRepository()
    usuarios = new FakeUserRepository()

    especialidades.items.push(
      new Specialty("esp-1", "Cardiología", "x", "HeartPulse", 0),
      new Specialty("esp-2", "Pediatría", "y", "Baby", 0)
    )
    sedes.items.push(new Branch("sede-1", "Sede Central", "x"))

    servicio = new MedicService(
      medicos as never,
      especialidades as never,
      sedes as never,
      usuarios as never
    )
  })

  test("el nombre de la especialidad lo pone el servicio, no el formulario", async () => {
    const creado = await servicio.create({
      ...entradaBase,
      specialtyName: "Basura Que Se Ignora",
    })
    assert.equal(creado.specialtyName, "Cardiología")
  })

  test("un médico nuevo arranca sin estrellas", async () => {
    const creado = await servicio.create(entradaBase)
    assert.equal(creado.rating, 0)
    assert.equal(creado.reviewCount, 0)
  })

  test("actualiza el contador de la especialidad al crear", async () => {
    await servicio.create(entradaBase)
    assert.equal(especialidades.items[0].activeDoctors, 1)
  })

  test("rechaza una especialidad inexistente", async () => {
    await esperaError(
      () => servicio.create({ ...entradaBase, specialtyId: "fantasma" }),
      /especialidad seleccionada no existe/
    )
  })

  test("rechaza una sede inexistente", async () => {
    await esperaError(
      () => servicio.create({ ...entradaBase, branchId: "fantasma" }),
      /sede seleccionada no existe/
    )
  })

  test("permite un médico sin sede", async () => {
    const creado = await servicio.create({ ...entradaBase, branchId: "", office: "" })
    assert.equal(creado.branchId, null)
  })

  test("rechaza email repetido al crear", async () => {
    await servicio.create(entradaBase)
    await esperaError(
      () => servicio.create({ ...entradaBase, email: "MARIA@ejemplo.com" }),
      /Ya existe un médico/
    )
  })

  test("reasignar de especialidad mueve los dos contadores", async () => {
    const creado = await servicio.create(entradaBase)
    assert.equal(especialidades.items[0].activeDoctors, 1)

    await servicio.update(creado.id, { ...entradaBase, specialtyId: "esp-2" })

    assert.equal(especialidades.items[0].activeDoctors, 0, "baja la anterior")
    assert.equal(especialidades.items[1].activeDoctors, 1, "sube la nueva")
  })

  test("al editar, el email puede quedar igual sin dar duplicado", async () => {
    const creado = await servicio.create(entradaBase)
    const actualizado = await servicio.update(creado.id, entradaBase)
    assert.equal(actualizado?.email, "maria@ejemplo.com")
  })

  test("borrar el médico elimina también su cuenta de acceso", async () => {
    usuarios.items.push({
      id: "user-1",
      name: "María",
      email: "maria@ejemplo.com",
      role: "doctor",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    })
    const creado = await servicio.create(entradaBase)
    creado.userId = "user-1"

    await servicio.remove(creado.id)

    assert.equal(medicos.items.length, 0)
    assert.equal(usuarios.items.length, 0, "la cuenta no debe quedar huérfana")
    assert.equal(especialidades.items[0].activeDoctors, 0)
  })

  test("ensureForUser adopta una ficha cargada con el mismo email", async () => {
    const creado = await servicio.create(entradaBase)
    await servicio.ensureForUser("user-9", "María González", "maria@ejemplo.com")

    assert.equal(medicos.items.length, 1, "no debe duplicar la ficha")
    assert.equal(medicos.items[0].id, creado.id)
    assert.equal(medicos.items[0].userId, "user-9")
  })

  test("ensureForUser crea la ficha si no existe", async () => {
    await servicio.ensureForUser("user-9", "Nuevo Profesional", "nuevo@ejemplo.com")
    assert.equal(medicos.items.length, 1)
    assert.equal(medicos.items[0].firstName, "Nuevo")
    assert.equal(medicos.items[0].lastName, "Profesional")
  })

  test("ensureForUser es idempotente", async () => {
    await servicio.ensureForUser("user-9", "Nuevo Profesional", "nuevo@ejemplo.com")
    await servicio.ensureForUser("user-9", "Nuevo Profesional", "nuevo@ejemplo.com")
    assert.equal(medicos.items.length, 1)
  })
})

// ---------------------------------------------------------------------------

describe("PatientService", () => {
  let pacientes: FakePatientRepository
  let usuarios: FakeUserRepository
  let servicio: PatientService

  const entradaBase = {
    firstName: "Juan",
    lastName: "Pérez",
    email: "juan@ejemplo.com",
    phone: "",
    dni: "35812443",
    birthDate: "1990-05-20",
  }

  beforeEach(() => {
    pacientes = new FakePatientRepository()
    usuarios = new FakeUserRepository()
    servicio = new PatientService(pacientes as never, usuarios as never)
  })

  test("rechaza email repetido", async () => {
    await servicio.create(entradaBase)
    await esperaError(
      () => servicio.create({ ...entradaBase, email: "JUAN@ejemplo.com" }),
      /Ya existe un paciente/
    )
  })

  test("borrar el paciente elimina su cuenta de acceso", async () => {
    usuarios.items.push({
      id: "user-1",
      name: "Juan",
      email: "juan@ejemplo.com",
      role: "patient",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    })
    const creado = await servicio.create(entradaBase)
    creado.userId = "user-1"

    await servicio.remove(creado.id)
    assert.equal(usuarios.items.length, 0)
  })

  test("findOrCreateForUser crea la ficha faltante", async () => {
    const ficha = await servicio.findOrCreateForUser(
      "user-7",
      "Ana María López",
      "ana@ejemplo.com"
    )
    assert.equal(ficha.userId, "user-7")
    assert.equal(ficha.firstName, "Ana")
    assert.equal(ficha.lastName, "María López")
  })

  test("findOrCreateForUser devuelve la existente sin duplicar", async () => {
    const primera = await servicio.findOrCreateForUser("user-7", "Ana", "ana@x.com")
    const segunda = await servicio.findOrCreateForUser("user-7", "Ana", "ana@x.com")
    assert.equal(primera.id, segunda.id)
    assert.equal(pacientes.items.length, 1)
  })

  test("findOrCreateForUser adopta una ficha cargada por el admin", async () => {
    const cargada = await servicio.create(entradaBase)
    const ficha = await servicio.findOrCreateForUser(
      "user-7",
      "Juan Pérez",
      "juan@ejemplo.com"
    )
    assert.equal(ficha.id, cargada.id)
    assert.equal(pacientes.items.length, 1)
  })
})

// ---------------------------------------------------------------------------

describe("ReviewService", () => {
  let resenias: FakeReviewRepository
  let turnos: FakeAppointmentRepository
  let medicos: FakeMedicRepository
  let pacientes: FakePatientRepository
  let usuarios: FakeUserRepository
  let avisos: SpyNotificationService
  let servicio: ReviewService

  const paciente: SessionUser = {
    id: "user-pac",
    name: "Juan",
    email: "juan@x.com",
    role: "patient",
  }

  function turno(overrides: Partial<Appointment> = {}) {
    return new Appointment({
      id: overrides.id ?? "turno-1",
      patientId: overrides.patientId ?? "pac-1",
      patientName: "Juan Pérez",
      doctorId: "doc-1",
      doctorName: "Dra. María González",
      specialtyName: "Cardiología",
      date: "2026-06-10",
      time: "10:00",
      status: overrides.status ?? "completed",
    })
  }

  beforeEach(() => {
    resenias = new FakeReviewRepository()
    turnos = new FakeAppointmentRepository()
    medicos = new FakeMedicRepository()
    pacientes = new FakePatientRepository()
    usuarios = new FakeUserRepository()
    avisos = new SpyNotificationService()

    medicos.items.push(
      new Medic({ id: "doc-1", firstName: "María", lastName: "G", email: "m@x.com" })
    )
    pacientes.items.push(
      new Patient("pac-1", "Juan", "Pérez", "juan@x.com", "", "", "1990-01-01", "2026-01-01", null, "user-pac")
    )

    servicio = new ReviewService(
      resenias as never,
      turnos as never,
      medicos as never,
      new PatientService(pacientes as never, usuarios as never) as never,
      avisos as never
    )
  })

  test("lista las reseñas de la más nueva a la más vieja", async () => {
    turnos.items.push(turno({ id: "t1" }), turno({ id: "t2" }))
    await servicio.create(paciente, { appointmentId: "t1", score: 5 })
    // La segunda entra después: al listarlas tiene que aparecer primero.
    resenias.items[0].createdAt = new Date("2026-01-01")
    await servicio.create(paciente, { appointmentId: "t2", score: 3 })
    resenias.items[1].createdAt = new Date("2026-06-01")

    const listado = await servicio.listForDoctor("doc-1")
    assert.deepEqual(
      listado.map((r) => r.score),
      [3, 5]
    )
  })

  test("no mezcla las reseñas de otro profesional", async () => {
    medicos.items.push(
      new Medic({ id: "doc-2", firstName: "Ana", lastName: "L", email: "a@x.com" })
    )
    turnos.items.push(turno({ id: "t1" }))
    await servicio.create(paciente, { appointmentId: "t1", score: 5 })

    assert.equal((await servicio.listForDoctor("doc-2")).length, 0)
  })

  test("un profesional sin reseñas devuelve lista vacía, no error", async () => {
    assert.deepEqual(await servicio.listForDoctor("doc-1"), [])
    assert.deepEqual(await servicio.summaryForDoctor("doc-1"), {
      average: 0,
      total: 0,
    })
  })

  test("el resumen sale de la tabla, no de la copia en doctors", async () => {
    turnos.items.push(turno({ id: "t1" }), turno({ id: "t2" }))
    await servicio.create(paciente, { appointmentId: "t1", score: 5 })
    await servicio.create(paciente, { appointmentId: "t2", score: 2 })

    // Se ensucia a propósito la copia cacheada: el resumen no debe usarla.
    medicos.items[0].rating = 4.9
    medicos.items[0].reviewCount = 99

    assert.deepEqual(await servicio.summaryForDoctor("doc-1"), {
      average: 3.5,
      total: 2,
    })
  })

  test("califica un turno atendido", async () => {
    turnos.items.push(turno())
    const resenia = await servicio.create(paciente, {
      appointmentId: "turno-1",
      score: 5,
      comment: "Excelente",
    })
    assert.equal(resenia.score, 5)
    assert.equal(resenias.items.length, 1)
  })

  test("recalcula el promedio del profesional", async () => {
    turnos.items.push(turno({ id: "t1" }), turno({ id: "t2" }))
    await servicio.create(paciente, { appointmentId: "t1", score: 5 })
    await servicio.create(paciente, { appointmentId: "t2", score: 3 })

    assert.equal(medicos.items[0].rating, 4)
    assert.equal(medicos.items[0].reviewCount, 2)
  })

  test("avisa al profesional", async () => {
    turnos.items.push(turno())
    await servicio.create(paciente, { appointmentId: "turno-1", score: 4 })
    assert.deepEqual(avisos.metodosLlamados(), ["reviewReceived"])
  })

  test("no se puede calificar un turno que no fue atendido", async () => {
    for (const estado of ["scheduled", "cancelled", "absent"] as const) {
      turnos.items = [turno({ status: estado })]
      await esperaError(
        () => servicio.create(paciente, { appointmentId: "turno-1", score: 5 }),
        /ya fueron atendidos/
      )
    }
  })

  test("no se puede calificar el turno de otra persona", async () => {
    turnos.items.push(turno({ patientId: "pac-ajeno" }))
    await esperaError(
      () => servicio.create(paciente, { appointmentId: "turno-1", score: 5 }),
      /tus propios turnos/
    )
  })

  test("no se puede calificar dos veces el mismo turno", async () => {
    turnos.items.push(turno())
    await servicio.create(paciente, { appointmentId: "turno-1", score: 5 })
    await esperaError(
      () => servicio.create(paciente, { appointmentId: "turno-1", score: 1 }),
      /ya fue calificado/
    )
    assert.equal(resenias.items.length, 1)
  })

  test("un turno inexistente no se puede calificar", async () => {
    await esperaError(
      () => servicio.create(paciente, { appointmentId: "fantasma", score: 5 }),
      /no existe/
    )
  })

  test("lista los turnos ya calificados de la persona", async () => {
    turnos.items.push(turno({ id: "t1" }), turno({ id: "t2" }))
    await servicio.create(paciente, { appointmentId: "t1", score: 5 })

    const calificados = await servicio.reviewedAppointmentIds(paciente)
    assert.deepEqual(calificados, ["t1"])
  })
})

// ---------------------------------------------------------------------------

describe("UserService", () => {
  let usuarios: FakeUserRepository
  let medicos: FakeMedicRepository
  let pacientes: FakePatientRepository
  let servicio: UserService

  function usuario(id: string, role: string, email = `${id}@x.com`) {
    return {
      id,
      name: `Usuario ${id}`,
      email,
      role,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    }
  }

  beforeEach(() => {
    usuarios = new FakeUserRepository()
    medicos = new FakeMedicRepository()
    pacientes = new FakePatientRepository()

    const servicioMedicos = new MedicService(
      medicos as never,
      new FakeSpecialtyRepository() as never,
      new FakeBranchRepository() as never,
      usuarios as never
    )
    const servicioPacientes = new PatientService(
      pacientes as never,
      usuarios as never
    )
    servicio = new UserService(
      usuarios as never,
      servicioMedicos as never,
      servicioPacientes as never
    )
  })

  test("no se puede eliminar la propia cuenta", async () => {
    usuarios.items.push(usuario("admin-1", "admin"), usuario("admin-2", "admin"))
    await esperaError(
      () => servicio.remove("admin-1", "admin-1"),
      /tu propia cuenta/
    )
  })

  test("no se puede eliminar al último administrador", async () => {
    usuarios.items.push(usuario("admin-1", "admin"), usuario("pac-1", "patient"))
    await esperaError(
      () => servicio.remove("admin-1", "pac-1"),
      /último administrador/
    )
    assert.equal(usuarios.items.length, 2)
  })

  test("con dos administradores se puede eliminar uno", async () => {
    usuarios.items.push(usuario("admin-1", "admin"), usuario("admin-2", "admin"))
    await servicio.remove("admin-2", "admin-1")
    assert.equal(usuarios.items.length, 1)
  })

  test("no se puede degradar al último administrador", async () => {
    usuarios.items.push(usuario("admin-1", "admin"), usuario("pac-1", "patient"))
    await esperaError(
      () =>
        servicio.update(
          "admin-1",
          { name: "X", email: "admin-1@x.com", role: "patient" },
          "pac-1"
        ),
      /al menos un administrador/
    )
  })

  test("un administrador no puede quitarse a sí mismo el rol", async () => {
    usuarios.items.push(usuario("admin-1", "admin"), usuario("admin-2", "admin"))
    await esperaError(
      () =>
        servicio.update(
          "admin-1",
          { name: "X", email: "admin-1@x.com", role: "patient" },
          "admin-1"
        ),
      /a vos mismo/
    )
  })

  test("rechaza un email ya usado por otra cuenta", async () => {
    usuarios.items.push(usuario("a", "patient", "a@x.com"), usuario("b", "patient", "b@x.com"))
    await esperaError(
      () => servicio.update("a", { name: "X", email: "b@x.com", role: "patient" }, "adm"),
      /otro usuario con ese email/
    )
  })

  test("cambiar el rol a médico crea su ficha", async () => {
    usuarios.items.push(usuario("u1", "patient", "u1@x.com"))
    await servicio.update(
      "u1",
      { name: "Ana López", email: "u1@x.com", role: "doctor" },
      "adm"
    )
    assert.equal(medicos.items.length, 1)
    assert.equal(medicos.items[0].userId, "u1")
  })

  test("cambiar el rol a paciente crea su ficha", async () => {
    usuarios.items.push(usuario("u1", "doctor", "u1@x.com"))
    await servicio.update(
      "u1",
      { name: "Ana López", email: "u1@x.com", role: "patient" },
      "adm"
    )
    assert.equal(pacientes.items.length, 1)
  })

  test("editar sin cambiar el rol no crea fichas nuevas", async () => {
    usuarios.items.push(usuario("u1", "patient", "u1@x.com"))
    await servicio.update(
      "u1",
      { name: "Nuevo Nombre", email: "u1@x.com", role: "patient" },
      "adm"
    )
    assert.equal(pacientes.items.length, 0)
    assert.equal(usuarios.items[0].name, "Nuevo Nombre")
  })

  test("editar un usuario inexistente falla", async () => {
    await esperaError(
      () => servicio.update("fantasma", { name: "X", email: "x@x.com", role: "patient" }, "adm"),
      /no existe/
    )
  })
})
