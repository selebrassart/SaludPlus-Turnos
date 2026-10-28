import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_SCHEDULE,
  generateTimeSlots,
  toMinutes,
  toTimeString,
} from "@/lib/bookingSlots"

describe("conversión de horas", () => {
  test("toMinutes convierte correctamente", () => {
    assert.equal(toMinutes("00:00"), 0)
    assert.equal(toMinutes("08:00"), 480)
    assert.equal(toMinutes("10:30"), 630)
    assert.equal(toMinutes("23:59"), 1439)
  })

  test("toMinutes rechaza formatos inválidos", () => {
    for (const invalido of ["24:00", "10:60", "8:00", "abc", "", "10:5"]) {
      assert.equal(toMinutes(invalido), null, `debería rechazar "${invalido}"`)
    }
  })

  test("toMinutes tolera espacios alrededor", () => {
    assert.equal(toMinutes("  10:30  "), 630)
  })

  test("toTimeString rellena con ceros", () => {
    assert.equal(toTimeString(0), "00:00")
    assert.equal(toTimeString(480), "08:00")
    assert.equal(toTimeString(630), "10:30")
  })

  test("ida y vuelta", () => {
    for (const hora of ["00:00", "07:45", "13:15", "23:59"]) {
      assert.equal(toTimeString(toMinutes(hora) as number), hora)
    }
  })
})

describe("generateTimeSlots", () => {
  test("la jornada por defecto reproduce la grilla original", () => {
    assert.deepEqual(generateTimeSlots(), [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "15:00", "15:30", "16:00", "16:30",
      "17:00", "17:30",
    ])
  })

  test("respeta la duración de la consulta", () => {
    const horarios = generateTimeSlots({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 20,
    })
    assert.deepEqual(horarios, ["09:00", "09:20", "09:40"])
  })

  test("consultas de 45 minutos", () => {
    const horarios = generateTimeSlots({
      startTime: "08:00",
      endTime: "11:00",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 45,
    })
    assert.deepEqual(horarios, ["08:00", "08:45", "09:30", "10:15"])
  })

  test("no ofrece un turno que terminaría después del cierre", () => {
    const horarios = generateTimeSlots({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 45,
    })
    // 09:45 + 45 = 10:30, pasado el cierre.
    assert.deepEqual(horarios, ["09:00"])
  })

  test("excluye los turnos que se superponen con el corte", () => {
    const horarios = generateTimeSlots({
      startTime: "11:00",
      endTime: "14:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      slotMinutes: 30,
    })
    assert.deepEqual(horarios, ["11:00", "11:30", "13:00", "13:30"])
  })

  test("un turno que pisa apenas el inicio del corte queda afuera", () => {
    const horarios = generateTimeSlots({
      startTime: "11:00",
      endTime: "14:00",
      breakStart: "11:45",
      breakEnd: "13:00",
      slotMinutes: 30,
    })
    // 11:30 terminaría 12:00, invadiendo el corte que empieza 11:45.
    assert.ok(!horarios.includes("11:30"))
    assert.deepEqual(horarios, ["11:00", "13:00", "13:30"])
  })

  test("sin corte cargado genera la jornada continua", () => {
    const horarios = generateTimeSlots({
      startTime: "08:00",
      endTime: "10:00",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 60,
    })
    assert.deepEqual(horarios, ["08:00", "09:00"])
  })

  test("un corte con fin anterior al inicio se ignora", () => {
    const horarios = generateTimeSlots({
      startTime: "08:00",
      endTime: "10:00",
      breakStart: "13:00",
      breakEnd: "12:00",
      slotMinutes: 60,
    })
    assert.deepEqual(horarios, ["08:00", "09:00"])
  })
})

describe("jornadas mal cargadas", () => {
  test("cierre anterior a la apertura da lista vacía", () => {
    assert.deepEqual(
      generateTimeSlots({ startTime: "18:00", endTime: "08:00" }),
      []
    )
  })

  test("apertura y cierre iguales dan lista vacía", () => {
    assert.deepEqual(
      generateTimeSlots({ startTime: "09:00", endTime: "09:00" }),
      []
    )
  })

  test("duración cero o negativa da lista vacía, no un bucle infinito", () => {
    assert.deepEqual(generateTimeSlots({ slotMinutes: 0 }), [])
    assert.deepEqual(generateTimeSlots({ slotMinutes: -30 }), [])
  })

  test("una duración desmedida da lista vacía", () => {
    assert.deepEqual(generateTimeSlots({ slotMinutes: 60 * 24 }), [])
  })

  test("horas con formato inválido dan lista vacía", () => {
    assert.deepEqual(generateTimeSlots({ startTime: "8am" }), [])
    assert.deepEqual(generateTimeSlots({ endTime: "25:00" }), [])
  })

  test("una duración fraccionaria se trunca a minutos enteros", () => {
    const horarios = generateTimeSlots({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: "",
      breakEnd: "",
      slotMinutes: 30.9,
    })
    assert.deepEqual(horarios, ["09:00", "09:30"])
  })
})

describe("propiedades generales", () => {
  test("los horarios salen ordenados y sin repetir", () => {
    const horarios = generateTimeSlots(DEFAULT_SCHEDULE)
    const ordenados = [...horarios].sort()
    assert.deepEqual(horarios, ordenados)
    assert.equal(new Set(horarios).size, horarios.length)
  })

  test("todos tienen formato HH:MM válido", () => {
    for (const hora of generateTimeSlots({ slotMinutes: 15 })) {
      assert.notEqual(toMinutes(hora), null, `formato inválido: ${hora}`)
    }
  })

  test("una jornada más larga nunca da menos horarios", () => {
    const corta = generateTimeSlots({ startTime: "09:00", endTime: "12:00", breakStart: "", breakEnd: "" })
    const larga = generateTimeSlots({ startTime: "09:00", endTime: "18:00", breakStart: "", breakEnd: "" })
    assert.ok(larga.length >= corta.length)
  })
})
