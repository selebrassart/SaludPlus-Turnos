-- ---------------------------------------------------------------------------
-- SaludPlus - creación completa del esquema
--
-- Uso:
--   npm run db:setup            (recomendado, no necesita psql)
--   psql -d saludplus -f db/schema.sql
--
-- El script es idempotente: se puede correr sobre una base vacía o sobre una
-- que ya existe. Los identificadores van entre comillas porque Better Auth y
-- Drizzle usan camelCase, y PostgreSQL sin comillas los pasaría a minúsculas.
-- ---------------------------------------------------------------------------

-- === Tablas requeridas por Better Auth ====================================

CREATE TABLE IF NOT EXISTS "user" (
  "id"            text PRIMARY KEY,
  "name"          text NOT NULL,
  "email"         text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image"         text,
  -- Rol de aplicación: patient | doctor | admin
  "role"          text NOT NULL DEFAULT 'patient',
  "createdAt"     timestamp NOT NULL DEFAULT now(),
  "updatedAt"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"         text PRIMARY KEY,
  "expiresAt"  timestamp NOT NULL,
  "token"      text NOT NULL UNIQUE,
  "createdAt"  timestamp NOT NULL DEFAULT now(),
  "updatedAt"  timestamp NOT NULL DEFAULT now(),
  "ipAddress"  text,
  "userAgent"  text,
  "userId"     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- OJO: "issuer" NO forma parte del modelo de Better Auth. Si se declara
-- NOT NULL, toda alta de cuenta falla con "null value in column issuer".
-- Se mantiene por compatibilidad con esquemas viejos, pero anulable.
CREATE TABLE IF NOT EXISTS "account" (
  "id"                      text PRIMARY KEY,
  "accountId"               text NOT NULL,
  "providerId"              text NOT NULL,
  "issuer"                  text,
  "userId"                  text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"             text,
  "refreshToken"            text,
  "idToken"                 text,
  "accessTokenExpiresAt"    timestamp,
  "refreshTokenExpiresAt"   timestamp,
  "scope"                   text,
  "password"                text,
  "createdAt"               timestamp NOT NULL DEFAULT now(),
  "updatedAt"               timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expiresAt"  timestamp NOT NULL,
  "createdAt"  timestamp DEFAULT now(),
  "updatedAt"  timestamp DEFAULT now()
);

-- === Tablas de la aplicación ==============================================

-- Va primero porque "doctors" la referencia.
CREATE TABLE IF NOT EXISTS "branches" (
  "id"      text PRIMARY KEY,
  "name"    text NOT NULL,
  "address" text NOT NULL DEFAULT '',
  "phone"   text NOT NULL DEFAULT '',
  -- Una sede dada de baja deja de ofrecerse al reservar, pero conserva su
  -- historia: los turnos pasados siguen mostrando dónde se atendieron.
  "active"  boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_name_unique"
  ON "branches" (lower("name"));

CREATE TABLE IF NOT EXISTS "specialties" (
  "id"            text PRIMARY KEY,
  "name"          text NOT NULL,
  "description"   text NOT NULL,
  "icon"          text NOT NULL,
  "activeDoctors" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "specialties_name_unique"
  ON "specialties" (lower("name"));

CREATE TABLE IF NOT EXISTS "doctors" (
  "id"              text PRIMARY KEY,
  -- Vínculo opcional con una cuenta de usuario con rol "doctor".
  "userId"          text REFERENCES "user"("id") ON DELETE SET NULL,
  "firstName"       text NOT NULL,
  "lastName"        text NOT NULL,
  "email"           text NOT NULL,
  "phone"           text NOT NULL DEFAULT '',
  "specialtyId"     text NOT NULL DEFAULT '',
  "specialtyName"   text NOT NULL DEFAULT '',
  -- Sede donde atiende y número de consultorio dentro de esa sede.
  "branchId"        text REFERENCES "branches"("id") ON DELETE SET NULL,
  "office"          text NOT NULL DEFAULT '',
  "avatar"          text NOT NULL DEFAULT '',
  "license"         text NOT NULL DEFAULT '',
  -- Promedio de "reviews". NO se carga a mano: lo recalcula la aplicación.
  "rating"          real NOT NULL DEFAULT 0,
  "reviewCount"     integer NOT NULL DEFAULT 0,
  "yearsExperience" integer NOT NULL DEFAULT 1,
  "workDays"        text NOT NULL DEFAULT '1,2,3,4,5',
  -- Jornada de atención. Antes los horarios eran una constante global igual
  -- para todos los profesionales.
  "startTime"       text NOT NULL DEFAULT '08:00',
  "endTime"         text NOT NULL DEFAULT '18:00',
  "breakStart"      text NOT NULL DEFAULT '12:00',
  "breakEnd"        text NOT NULL DEFAULT '15:00',
  "slotMinutes"     integer NOT NULL DEFAULT 30
);

CREATE UNIQUE INDEX IF NOT EXISTS "doctors_email_unique"
  ON "doctors" (lower("email"));

CREATE TABLE IF NOT EXISTS "patients" (
  "id"        text PRIMARY KEY,
  -- Vínculo opcional con una cuenta de usuario con rol "patient".
  "userId"    text REFERENCES "user"("id") ON DELETE SET NULL,
  "firstName" text NOT NULL,
  "lastName"  text NOT NULL,
  "email"     text NOT NULL,
  "phone"     text NOT NULL DEFAULT '',
  "dni"       text NOT NULL DEFAULT '',
  "birthDate" text NOT NULL DEFAULT '1990-01-01',
  "bloodType" text,
  "createdAt" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "patients_email_unique"
  ON "patients" (lower("email"));

-- El nombre del profesional, la especialidad, la sede y el consultorio se
-- copian al turno a propósito: si mañana el médico cambia de sede, el turno de
-- la semana pasada tiene que seguir diciendo dónde se atendió esa persona.
CREATE TABLE IF NOT EXISTS "appointments" (
  "id"            text PRIMARY KEY,
  "patientId"     text NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "patientName"   text NOT NULL,
  "doctorId"      text NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "doctorName"    text NOT NULL,
  "specialtyName" text NOT NULL,
  "branchId"      text REFERENCES "branches"("id") ON DELETE SET NULL,
  "branchName"    text NOT NULL DEFAULT '',
  "office"        text NOT NULL DEFAULT '',
  "date"          text NOT NULL,
  "time"          text NOT NULL,
  "status"        text NOT NULL DEFAULT 'scheduled',
  "reason"        text,
  "notes"         text,
  "createdAt"     timestamp NOT NULL DEFAULT now()
);

-- Una reseña por turno, y solo de turnos atendidos (lo valida la aplicación).
CREATE TABLE IF NOT EXISTS "reviews" (
  "id"            text PRIMARY KEY,
  "appointmentId" text NOT NULL UNIQUE REFERENCES "appointments"("id") ON DELETE CASCADE,
  "doctorId"      text NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "patientId"     text NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "score"         integer NOT NULL,
  "comment"       text,
  "createdAt"     timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_score_range" CHECK ("score" BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS "reviews_doctor_idx" ON "reviews" ("doctorId");

-- Los índices que sostienen las reglas de negocio NO van acá.
--
-- Varios de ellos se apoyan en columnas que en una base vieja todavía no
-- existen —`branchId` y `office` en `appointments` son de una versión
-- posterior—, así que crearlos antes de la migración de más abajo falla con
-- «no existe la columna branchId» y aborta el script justo antes de la parte
-- que habría agregado esa columna.
--
-- Están todos al final, después de los ALTER TABLE. Ver "Índices" ahí.

-- ===========================================================================
-- Migración para bases ya creadas
--
-- Los CREATE TABLE de arriba no hacen nada si la tabla ya existe, así que las
-- columnas y restricciones nuevas se agregan acá. Todo el bloque es
-- idempotente.
-- ===========================================================================

ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "office" text NOT NULL DEFAULT '';
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "reviewCount" integer NOT NULL DEFAULT 0;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "startTime" text NOT NULL DEFAULT '08:00';
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "endTime" text NOT NULL DEFAULT '18:00';
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "breakStart" text NOT NULL DEFAULT '12:00';
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "breakEnd" text NOT NULL DEFAULT '15:00';
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "slotMinutes" integer NOT NULL DEFAULT 30;
ALTER TABLE "doctors" ALTER COLUMN "rating" SET DEFAULT 0;

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "branchName" text NOT NULL DEFAULT '';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "office" text NOT NULL DEFAULT '';

-- La fecha de nacimiento se agregó cuando la edad dejó de cargarse a mano.
-- El valor por defecto es un relleno visible: la aplicación muestra la edad
-- calculada y así se nota cuál falta completar, en vez de inventar un número.
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "birthDate" text NOT NULL DEFAULT '1990-01-01';

-- Vínculo entre la cuenta de acceso y la ficha. Sin esto, quien se registra
-- queda con rol pero sin ficha, que era el "No se encontró el perfil".
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "userId" text;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "userId" text;

DO $$
BEGIN
  BEGIN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_patient_fk"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay turnos con patientId huérfano. Limpialos y volvé a correr el script.';
  END;

  BEGIN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_doctor_fk"
      FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay turnos con doctorId huérfano. Limpialos y volvé a correr el script.';
  END;

  BEGIN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_branch_fk"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay turnos con branchId inexistente.';
  END;

  BEGIN
    ALTER TABLE "doctors"
      ADD CONSTRAINT "doctors_branch_fk"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay médicos con branchId inexistente.';
  END;

  BEGIN
    ALTER TABLE "doctors"
      ADD CONSTRAINT "doctors_user_fk"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay doctors.userId apuntando a usuarios inexistentes.';
  END;

  BEGIN
    ALTER TABLE "patients"
      ADD CONSTRAINT "patients_user_fk"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Hay patients.userId apuntando a usuarios inexistentes.';
  END;
END
$$;

-- Los índices únicos fallan si ya hay duplicados cargados. Este bloque avisa
-- cuáles son en vez de cortar la ejecución del script entero.
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "doctors_email_unique"
      ON "doctors" (lower("email"));
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay médicos con email repetido. Corregilos y volvé a correr el script.';
  END;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "patients_email_unique"
      ON "patients" (lower("email"));
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay pacientes con email repetido. Corregilos y volvé a correr el script.';
  END;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "specialties_name_unique"
      ON "specialties" (lower("name"));
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay especialidades con nombre repetido. Corregilas y volvé a correr el script.';
  END;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "appointments_slot_unique"
      ON "appointments" ("doctorId", "date", "time")
      WHERE "status" <> 'cancelled';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay turnos duplicados en el mismo horario. Cancelá los sobrantes y volvé a correr el script.';
  END;

  BEGIN
    -- Una persona no puede estar en dos consultas a la vez, ni siquiera con
    -- profesionales distintos.
    CREATE UNIQUE INDEX IF NOT EXISTS "appointments_patient_unique"
      ON "appointments" ("patientId", "date", "time")
      WHERE "status" <> 'cancelled';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay pacientes con dos turnos en el mismo horario. Cancelá los sobrantes y volvé a correr el script.';
  END;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "appointments_room_unique"
      ON "appointments" ("branchId", "office", "date", "time")
      WHERE "status" <> 'cancelled' AND "office" <> '' AND "branchId" IS NOT NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay turnos superpuestos en el mismo consultorio. Revisalos y volvé a correr el script.';
  END;
END
$$;

-- === Índices de consulta ===================================================
-- Van después de la migración porque se apoyan en columnas que en una base
-- vieja recién existen a partir de los ALTER TABLE de arriba.

CREATE INDEX IF NOT EXISTS "appointments_patient_idx"
  ON "appointments" ("patientId");

CREATE INDEX IF NOT EXISTS "appointments_doctor_date_idx"
  ON "appointments" ("doctorId", "date");

-- Recalcula el contador de médicos por especialidad, que antes quedaba
-- congelado en el valor de la carga inicial.
UPDATE "specialties" s
SET "activeDoctors" = (
  SELECT count(*) FROM "doctors" d WHERE d."specialtyId" = s."id"
);

-- El DNI se guarda como dígitos puros: la carga inicial traía "35.812.443" y
-- ese formato rompía las búsquedas y las comparaciones.
UPDATE "patients"
SET "dni" = regexp_replace("dni", '\D', '', 'g')
WHERE "dni" ~ '\D';

-- Las estrellas dejan de ser un número escrito a mano. Los valores que había
-- (4.9, 4.7, 5.0...) venían de la carga inicial y no representaban ninguna
-- opinión real, así que el promedio se reconstruye desde "reviews": mientras no
-- haya reseñas queda en cero y la interfaz muestra "Sin calificaciones".
UPDATE "doctors" d
SET "rating" = COALESCE(
      (SELECT avg(r."score") FROM "reviews" r WHERE r."doctorId" = d."id"), 0
    ),
    "reviewCount" = (
      SELECT count(*) FROM "reviews" r WHERE r."doctorId" = d."id"
    );

-- === Notificaciones =======================================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"        text PRIMARY KEY,
  "userId"    text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type"      text NOT NULL,
  "title"     text NOT NULL,
  "body"      text NOT NULL DEFAULT '',
  "dedupeKey" text,
  "readAt"    timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- La tabla puede venir de una versión anterior sin la clave de deduplicación.
-- Va acá y no en el bloque de migración de arriba porque la tabla se crea en
-- esta sección: allá arriba todavía no existe.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "dedupeKey" text;

-- Hace idempotente la generación de avisos: el recordatorio de un turno se
-- puede intentar crear en cada visita y solo entra la primera vez.
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_unique"
  ON "notifications" ("userId", "dedupeKey")
  WHERE "dedupeKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "notifications_user_idx"
  ON "notifications" ("userId", "createdAt" DESC);
