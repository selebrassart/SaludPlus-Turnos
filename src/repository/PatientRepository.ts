import "server-only"
import { and, asc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { Patient, patientTable } from "@/models/Patient"
import type { Repository } from "./BaseRepository"

export class PatientRepository implements Repository<Patient> {
  async findAll(): Promise<Patient[]> {
    const rows = await db
      .select()
      .from(patientTable)
      .orderBy(asc(patientTable.lastName))
    return rows.map(Patient.fromRow)
  }

  async findByEmail(email: string): Promise<Patient | undefined> {
    const [row] = await db
      .select()
      .from(patientTable)
      .where(sql`lower(${patientTable.email}) = lower(${email})`)
      .limit(1)
    return row ? Patient.fromRow(row) : undefined
  }

  /** Used to reject a duplicate email without tripping the DB constraint. */
  async findOtherByEmail(
    email: string,
    excludeId: string
  ): Promise<Patient | undefined> {
    const [row] = await db
      .select()
      .from(patientTable)
      .where(
        and(
          sql`lower(${patientTable.email}) = lower(${email})`,
          ne(patientTable.id, excludeId)
        )
      )
      .limit(1)
    return row ? Patient.fromRow(row) : undefined
  }

  async findOne(id: string): Promise<Patient | undefined> {
    const [row] = await db
      .select()
      .from(patientTable)
      .where(eq(patientTable.id, id))
      .limit(1)
    return row ? Patient.fromRow(row) : undefined
  }

  async findByUserId(userId: string): Promise<Patient | undefined> {
    const [row] = await db
      .select()
      .from(patientTable)
      .where(eq(patientTable.userId, userId))
      .limit(1)
    return row ? Patient.fromRow(row) : undefined
  }

  async create(item: Patient): Promise<Patient> {
    await db.insert(patientTable).values({
      id: item.id,
      userId: item.userId ?? null,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      dni: item.dni,
      birthDate: item.birthDate,
      bloodType: item.bloodType ?? null,
      createdAt: item.createdAt,
    })
    return item
  }

  async update(
    id: string,
    item: Partial<Patient>
  ): Promise<Patient | undefined> {
    await db.update(patientTable).set(item).where(eq(patientTable.id, id))
    return this.findOne(id)
  }

  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(patientTable).where(eq(patientTable.id, id))
    return { id }
  }
}
