import "server-only"
import { desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { Review, reviewTable, type RatingSummary } from "@/models/Review"

export class ReviewRepository {
  async findByDoctorId(doctorId: string): Promise<Review[]> {
    const rows = await db
      .select()
      .from(reviewTable)
      .where(eq(reviewTable.doctorId, doctorId))
      .orderBy(desc(reviewTable.createdAt))
    return rows.map(Review.fromRow)
  }

  async findByAppointmentId(
    appointmentId: string
  ): Promise<Review | undefined> {
    const [row] = await db
      .select()
      .from(reviewTable)
      .where(eq(reviewTable.appointmentId, appointmentId))
      .limit(1)
    return row ? Review.fromRow(row) : undefined
  }

  /** Ids de los turnos del paciente que ya tienen reseña. */
  async findAppointmentIdsByPatient(patientId: string): Promise<string[]> {
    const rows = await db
      .select({ appointmentId: reviewTable.appointmentId })
      .from(reviewTable)
      .where(eq(reviewTable.patientId, patientId))
    return rows.map((row) => row.appointmentId)
  }

  /**
   * Promedio y cantidad de un profesional. Es la única fuente de verdad de las
   * estrellas: `doctors.rating` es una copia cacheada de este cálculo.
   */
  async summaryForDoctor(doctorId: string): Promise<RatingSummary> {
    const [row] = await db
      .select({
        average: sql<number>`COALESCE(avg(${reviewTable.score}), 0)::float8`,
        total: sql<number>`count(*)::int`,
      })
      .from(reviewTable)
      .where(eq(reviewTable.doctorId, doctorId))

    return { average: row?.average ?? 0, total: row?.total ?? 0 }
  }

  async create(item: Review): Promise<Review> {
    await db.insert(reviewTable).values({
      id: item.id,
      appointmentId: item.appointmentId,
      doctorId: item.doctorId,
      patientId: item.patientId,
      score: item.score,
      comment: item.comment,
    })
    return item
  }
}
