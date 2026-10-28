import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.
// These live in the public schema (self-hosted Better Auth), separate from the
// managed `neon_auth` schema.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // Application role: patient | doctor | admin
  role: text("role").notNull().default("patient"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  // Not part of Better Auth's account model: it never writes this column, so a
  // NOT NULL constraint here makes every sign-up fail on insert.
  issuer: text("issuer"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  // Una sede dada de baja deja de ofrecerse al reservar pero conserva su
  // historia: los turnos pasados siguen mostrando dónde se atendieron.
  active: boolean("active").notNull().default(true),
})

export const specialties = pgTable("specialties", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  activeDoctors: integer("activeDoctors").notNull().default(0),
})

export const doctors = pgTable("doctors", {
  id: text("id").primaryKey(),
  // Optional link to a user account with the "doctor" role.
  userId: text("userId"),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  specialtyId: text("specialtyId").notNull().default(""),
  specialtyName: text("specialtyName").notNull().default(""),
  // Sede donde atiende y número de consultorio dentro de esa sede.
  branchId: text("branchId"),
  office: text("office").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  license: text("license").notNull().default(""),
  // Promedio de `reviews`. No se carga a mano: lo recalcula MedicService.
  rating: real("rating").notNull().default(0),
  reviewCount: integer("reviewCount").notNull().default(0),
  yearsExperience: integer("yearsExperience").notNull().default(1),
  workDays: text("workDays").notNull().default("1,2,3,4,5"),
  // Jornada de atención propia de cada profesional.
  startTime: text("startTime").notNull().default("08:00"),
  endTime: text("endTime").notNull().default("18:00"),
  breakStart: text("breakStart").notNull().default("12:00"),
  breakEnd: text("breakEnd").notNull().default("15:00"),
  slotMinutes: integer("slotMinutes").notNull().default(30),
})

export const patients = pgTable("patients", {
  id: text("id").primaryKey(),
  // Optional link to a user account with the "patient" role.
  userId: text("userId"),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  dni: text("dni").notNull().default(""),
  birthDate: text("birthDate").notNull().default("1990-01-01"),
  bloodType: text("bloodType"),
  createdAt: text("createdAt").notNull(),
})

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  patientId: text("patientId").notNull(),
  patientName: text("patientName").notNull(),
  doctorId: text("doctorId").notNull(),
  doctorName: text("doctorName").notNull(),
  specialtyName: text("specialtyName").notNull(),
  // Copiados del médico al reservar: si mañana cambia de sede, el turno viejo
  // tiene que seguir diciendo dónde se atendió esa persona.
  branchId: text("branchId"),
  branchName: text("branchName").notNull().default(""),
  office: text("office").notNull().default(""),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("scheduled"),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  // UNIQUE en la base: una sola reseña por turno.
  appointmentId: text("appointmentId")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: text("doctorId")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  patientId: text("patientId")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  // Restringido a 1..5 por un CHECK en la base.
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // appointment_booked | appointment_cancelled | appointment_reminder |
  // appointment_status | review_received
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  // UNIQUE junto con userId: permite reintentar la generación de avisos sin
  // duplicarlos.
  dedupeKey: text("dedupeKey"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
