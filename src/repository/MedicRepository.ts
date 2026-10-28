import "server-only"
import { and, asc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { branchTable } from "@/models/Branch"
import { Medic, medicTable } from "@/models/Medic"
import type { Repository } from "./BaseRepository"

/**
 * El nombre de la sede NO se copia a la fila del médico: se resuelve con un
 * LEFT JOIN. `specialtyName` sí está desnormalizado y por eso hubo que propagar
 * a mano cada renombre de especialidad; no se repite ese error acá.
 */
function selectWithBranch() {
  return db
    .select({ medic: medicTable, branchName: branchTable.name })
    .from(medicTable)
    .leftJoin(branchTable, eq(medicTable.branchId, branchTable.id))
}

type JoinedRow = {
  medic: typeof medicTable.$inferSelect
  branchName: string | null
}

function toMedic(row: JoinedRow): Medic {
  return Medic.fromRow(row.medic, row.branchName ?? "")
}

export class MedicRepository implements Repository<Medic> {
  async findAll(): Promise<Medic[]> {
    const rows = await selectWithBranch().orderBy(asc(medicTable.lastName))
    return rows.map(toMedic)
  }

  async findOne(id: string): Promise<Medic | undefined> {
    const [row] = await selectWithBranch()
      .where(eq(medicTable.id, id))
      .limit(1)
    return row ? toMedic(row) : undefined
  }

  async findByUserId(userId: string): Promise<Medic | undefined> {
    const [row] = await selectWithBranch()
      .where(eq(medicTable.userId, userId))
      .limit(1)
    return row ? toMedic(row) : undefined
  }

  async findByEmail(email: string): Promise<Medic | undefined> {
    const [row] = await selectWithBranch()
      .where(sql`lower(${medicTable.email}) = lower(${email})`)
      .limit(1)
    return row ? toMedic(row) : undefined
  }

  /** Evita chocar contra la restricción única con un mensaje entendible. */
  async findOtherByEmail(
    email: string,
    excludeId: string
  ): Promise<Medic | undefined> {
    const [row] = await selectWithBranch()
      .where(
        and(
          sql`lower(${medicTable.email}) = lower(${email})`,
          ne(medicTable.id, excludeId)
        )
      )
      .limit(1)
    return row ? toMedic(row) : undefined
  }

  /**
   * `specialtyName` está desnormalizado en la fila del médico, así que renombrar
   * una especialidad hay que propagarlo o las tablas se contradicen.
   */
  async renameSpecialty(specialtyId: string, name: string): Promise<void> {
    await db
      .update(medicTable)
      .set({ specialtyName: name })
      .where(eq(medicTable.specialtyId, specialtyId))
  }

  async countBySpecialtyId(specialtyId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(medicTable)
      .where(eq(medicTable.specialtyId, specialtyId))
    return row?.total ?? 0
  }

  /** Cachea el promedio de reseñas para no recalcularlo en cada listado. */
  async setRating(id: string, average: number, total: number): Promise<void> {
    await db
      .update(medicTable)
      .set({ rating: average, reviewCount: total })
      .where(eq(medicTable.id, id))
  }

  async create(item: Medic): Promise<Medic> {
    await db.insert(medicTable).values(this.toColumns(item))
    return item
  }

  async createIfMissing(item: Medic): Promise<void> {
    await db.insert(medicTable).values(this.toColumns(item)).onConflictDoNothing()
  }

  async update(id: string, item: Partial<Medic>): Promise<Medic | undefined> {
    // `workDays` se guarda como texto separado por comas y `branchName` es
    // transitorio: ninguno de los dos se puede pasar tal cual al UPDATE.
    const { workDays, branchName: _ignored, ...rest } = item
    await db
      .update(medicTable)
      .set({ ...rest, ...(workDays ? { workDays: workDays.join(",") } : {}) })
      .where(eq(medicTable.id, id))
    return this.findOne(id)
  }

  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(medicTable).where(eq(medicTable.id, id))
    return { id }
  }

  private toColumns(item: Medic) {
    return {
      id: item.id,
      userId: item.userId ?? null,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      specialtyId: item.specialtyId,
      specialtyName: item.specialtyName,
      branchId: item.branchId,
      office: item.office,
      avatar: item.avatar,
      license: item.license,
      rating: item.rating,
      reviewCount: item.reviewCount,
      yearsExperience: item.yearsExperience,
      workDays: item.workDays.join(","),
      startTime: item.startTime,
      endTime: item.endTime,
      breakStart: item.breakStart,
      breakEnd: item.breakEnd,
      slotMinutes: item.slotMinutes,
    }
  }
}
