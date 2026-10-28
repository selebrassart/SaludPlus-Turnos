import "server-only"
import { and, asc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { Branch, branchTable } from "@/models/Branch"
import { medicTable } from "@/models/Medic"
import type { Repository } from "./BaseRepository"

/** Subconsulta reutilizada: cuántos profesionales atienden en cada sede. */
const doctorCount = sql<number>`(
  SELECT count(*)::int FROM ${medicTable}
  WHERE ${medicTable.branchId} = ${branchTable.id}
)`

export class BranchRepository implements Repository<Branch> {
  async findAll(): Promise<Branch[]> {
    const rows = await db
      .select({ branch: branchTable, doctors: doctorCount })
      .from(branchTable)
      .orderBy(asc(branchTable.name))
    return rows.map((row) => Branch.fromRow(row.branch, row.doctors))
  }

  /** Solo las sedes que se pueden ofrecer al reservar un turno. */
  async findActive(): Promise<Branch[]> {
    const rows = await db
      .select({ branch: branchTable, doctors: doctorCount })
      .from(branchTable)
      .where(eq(branchTable.active, true))
      .orderBy(asc(branchTable.name))
    return rows.map((row) => Branch.fromRow(row.branch, row.doctors))
  }

  async findOne(id: string): Promise<Branch | undefined> {
    const [row] = await db
      .select({ branch: branchTable, doctors: doctorCount })
      .from(branchTable)
      .where(eq(branchTable.id, id))
      .limit(1)
    return row ? Branch.fromRow(row.branch, row.doctors) : undefined
  }

  async findByName(name: string): Promise<Branch | undefined> {
    const [row] = await db
      .select()
      .from(branchTable)
      .where(sql`lower(${branchTable.name}) = lower(${name})`)
      .limit(1)
    return row ? Branch.fromRow(row) : undefined
  }

  /** Evita chocar contra la restricción única con un mensaje entendible. */
  async findOtherByName(
    name: string,
    excludeId: string
  ): Promise<Branch | undefined> {
    const [row] = await db
      .select()
      .from(branchTable)
      .where(
        and(
          sql`lower(${branchTable.name}) = lower(${name})`,
          ne(branchTable.id, excludeId)
        )
      )
      .limit(1)
    return row ? Branch.fromRow(row) : undefined
  }

  async countDoctors(id: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(medicTable)
      .where(eq(medicTable.branchId, id))
    return row?.total ?? 0
  }

  async create(item: Branch): Promise<Branch> {
    await db.insert(branchTable).values({
      id: item.id,
      name: item.name,
      address: item.address,
      phone: item.phone,
      active: item.active,
    })
    return item
  }

  async createIfMissing(item: Branch): Promise<void> {
    await db
      .insert(branchTable)
      .values({
        id: item.id,
        name: item.name,
        address: item.address,
        phone: item.phone,
        active: item.active,
      })
      .onConflictDoNothing()
  }

  async update(id: string, item: Partial<Branch>): Promise<Branch | undefined> {
    // `doctorCount` es transitorio: no existe como columna.
    const { doctorCount: _ignored, ...columns } = item
    await db.update(branchTable).set(columns).where(eq(branchTable.id, id))
    return this.findOne(id)
  }

  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(branchTable).where(eq(branchTable.id, id))
    return { id }
  }
}
