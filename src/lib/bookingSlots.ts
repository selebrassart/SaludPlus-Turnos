/**
 * Generación de horarios de atención.
 *
 * Antes esto era una constante: catorce horarios idénticos para todos los
 * profesionales. Un traumatólogo con consultas de 40 minutos y un clínico con
 * consultas de 15 no pueden compartir la misma grilla, así que cada agenda se
 * calcula a partir de la jornada del profesional.
 */

export interface Schedule {
  /** Inicio de la jornada, "HH:MM". */
  startTime: string
  /** Fin de la jornada. El último turno empieza antes de esta hora. */
  endTime: string
  /** Inicio del corte del mediodía, o vacío si no hay. */
  breakStart: string
  breakEnd: string
  /** Duración de cada consulta, en minutos. */
  slotMinutes: number
}

export const DEFAULT_SCHEDULE: Schedule = {
  startTime: "08:00",
  endTime: "18:00",
  breakStart: "12:00",
  breakEnd: "15:00",
  slotMinutes: 30,
}

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

/** "10:30" → 630. Devuelve null si el formato no es válido. */
export function toMinutes(time: string): number | null {
  const match = timePattern.exec(time.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** 630 → "10:30" */
export function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

/**
 * Devuelve los horarios en los que se puede reservar con este profesional.
 *
 * Un turno entra solo si termina dentro de la jornada y no se superpone con el
 * corte: ofrecer un horario que empieza cinco minutos antes del cierre es peor
 * que no ofrecerlo.
 */
export function generateTimeSlots(schedule: Partial<Schedule> = {}): string[] {
  const {
    startTime,
    endTime,
    breakStart,
    breakEnd,
    slotMinutes,
  } = { ...DEFAULT_SCHEDULE, ...schedule }

  const inicio = toMinutes(startTime)
  const fin = toMinutes(endTime)
  const duracion = Math.trunc(slotMinutes)

  // Una jornada mal cargada no debe colgar el bucle ni ofrecer horarios raros:
  // se prefiere una lista vacía, que la interfaz muestra como "sin horarios".
  if (inicio === null || fin === null) return []
  if (duracion <= 0 || duracion > 12 * 60) return []
  if (fin <= inicio) return []

  const corteInicio = breakStart ? toMinutes(breakStart) : null
  const corteFin = breakEnd ? toMinutes(breakEnd) : null
  const hayCorte =
    corteInicio !== null && corteFin !== null && corteFin > corteInicio

  const horarios: string[] = []
  for (let minuto = inicio; minuto + duracion <= fin; minuto += duracion) {
    const seSuperponeConElCorte =
      hayCorte && minuto < (corteFin as number) && minuto + duracion > (corteInicio as number)

    if (!seSuperponeConElCorte) horarios.push(toTimeString(minuto))
  }

  return horarios
}
