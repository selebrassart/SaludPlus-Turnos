import "server-only"
import { and, asc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { userTable, type UserRow } from "@/models/User"

/**
 * Does not implement Repository<T>: `user` is Better Auth's authentication
 * table, so rows are created through `auth.api.signUpEmail` (which owns
 * password hashing) rather than with a plain insert here.
 */
export class UserRepository {
  async findAll(): Promise<UserRow[]> {
    return db.select().from(userTable).orderBy(asc(userTable.name))
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1)
    return row
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await db
      .select()
      .from(userTable)
      .where(sql`lower(${userTable.email}) = lower(${email})`)
      .limit(1)
    return row
  }

  /** Used to reject a duplicate email without tripping the DB constraint. */
  async findOtherByEmail(
    email: string,
    excludeId: string
  ): Promise<UserRow | undefined> {
    const [row] = await db
      .select()
      .from(userTable)
      .where(
        and(
          sql`lower(${userTable.email}) = lower(${email})`,
          ne(userTable.id, excludeId)
        )
      )
      .limit(1)
    return row
  }

  async countByRole(role: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(userTable)
      .where(eq(userTable.role, role))
    return row?.total ?? 0
  }

  async updateRole(id: string, role: string): Promise<void> {
    await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(userTable.id, id))
  }

  async updateProfile(
    id: string,
    attributes: { name: string; email: string; role: string }
  ): Promise<UserRow | undefined> {
    await db
      .update(userTable)
      .set({ ...attributes, updatedAt: new Date() })
      .where(eq(userTable.id, id))
    return this.findById(id)
  }

  /**
   * `session` and `account` cascade from the FK, and `doctors.userId` /
   * `patients.userId` are set to NULL, so the clinical record outlives the
   * login it was attached to.
   */
  async delete(id: string): Promise<{ id: string } | undefined> {
    await db.delete(userTable).where(eq(userTable.id, id))
    return { id }
  }
}
