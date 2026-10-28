import "server-only"
import { and, asc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { Specialty, specialtyTable } from "@/models/Specialty"
import type { Repository } from "./BaseRepository"

export class SpecialtyRepository implements Repository<Specialty> {
  async findAll(): Promise<Specialty[]> {
    const rows = await db
      .select()
      .from(specialtyTable)
      .orderBy(asc(specialtyTable.name))
    return rows.map(Specialty.fromRow)
  }

  async findByName(name: string): Promise<Specialty | undefined> {
    const [row] = await db
      .select()
      .from(specialtyTable)
      .where(sql`lower(${specialtyTable.name}) = lower(${name})`)
      .limit(1)
    return row ? Specialty.fromRow(row) : undefined
  }

  /** Used to reject a duplicate name without tripping the DB constraint. */
  async findOtherByName(
    name: string,
    excludeId: string
  ): Promise<Specialty | undefined> {
    const [row] = await db
      .select()
      .from(specialtyTable)
      .where(
        and(
          sql`lower(${specialtyTable.name}) = lower(${name})`,
          ne(specialtyTable.id, excludeId)
        )
      )
      .limit(1)
    return row ? Specialty.fromRow(row) : undefined
  }

  /** Keeps the "N médicos" badge in the admin panel honest. */
  async setActiveDoctors(id: string, total: number): Promise<void> {
    await db
      .update(specialtyTable)
      .set({ activeDoctors: total })
      .where(eq(specialtyTable.id, id))
  }

  async findOne(id: string): Promise<Specialty | undefined> {
    const [row] = await db
      .select()
      .from(specialtyTable)
      .where(eq(specialtyTable.id, id))
      .limit(1)
    return row ? Specialty.fromRow(row) : undefined
  }

  async create(item: Specialty): Promise<Specialty> {
    await db.insert(specialtyTable).values({
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      activeDoctors: item.activeDoctors,
    })
    return item
  }

  async createIfMissing(item: Specialty): Promise<void> {
    await db
      .insert(specialtyTable)
      .values({
        id: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        activeDoctors: item.activeDoctors,
      })
      .onConflictDoNothing()
  }

  async update(
    id: string,
    item: Partial<Specialty>
  ): Promise<Specialty | undefined> {
    await db.update(specialtyTable).set(item).where(eq(specialtyTable.id, id))
    return this.findOne(id)
  }

  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(specialtyTable).where(eq(specialtyTable.id, id))
    return { id }
  }
}
