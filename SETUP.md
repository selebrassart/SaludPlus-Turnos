# SaludPlus — puesta en marcha

## 1. Dependencias

```bash
npm install
```

## 2. Variables de entorno

Creá un archivo `.env.local` en la raíz del proyecto con este contenido:

```ini
# Cadena de conexión a PostgreSQL. OBLIGATORIA.
# PostgreSQL local (sin SSL):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saludplus
#
# Proveedor administrado (Neon / Supabase / RDS): el SSL se agrega solo.
# DATABASE_URL=postgresql://usuario:password@ep-xxx.neon.tech/saludplus

# Secreto de firma de sesiones. OBLIGATORIO en producción.
# Generalo con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
BETTER_AUTH_SECRET=cambiame-por-un-secreto-de-32-bytes-en-base64

# URL pública de la app. En local dejala como está.
BETTER_AUTH_URL=http://localhost:3000

# OPCIONAL. Protege /api/cron/reminders, que genera los recordatorios de
# turno del día siguiente. En desarrollo se puede dejar vacío; en producción
# el endpoint queda deshabilitado hasta que definas un valor.
# CRON_SECRET=un-secreto-largo-cualquiera
```

`.env.local` está en `.gitignore`, así que nunca se commitea.

**Sin `DATABASE_URL` la aplicación no arranca**: antes fallaba con un
`ECONNREFUSED` sin explicación, ahora tira un error que dice exactamente qué
falta.

## 3. Base de datos

El repositorio no tenía forma de crear las tablas (`init.sql` estaba en
`.gitignore` y no hay migraciones de Drizzle). El esquema completo está ahora en
`db/schema.sql`.

```bash
npm run db:setup
```

Eso es todo: crea la base si no existe y aplica el esquema. Usa el driver `pg`
que ya está en `node_modules`, así que **no hace falta tener `psql` en el PATH**
—que en Windows no queda instalado salvo que se tilde esa opción.

El script es **idempotente**: se puede correr sobre una base vacía o sobre una
que ya existe. En el segundo caso agrega las columnas nuevas, las claves
foráneas y los índices únicos, y recalcula el contador de médicos por
especialidad.

Corre **una sentencia por vez**, no el archivo entero de una. La diferencia
importa: mandado en una sola llamada, PostgreSQL lo envuelve en una
transacción implícita y una sola sentencia que falla descarta todo el resto,
incluida la migración que ya había andado. Así una base quedaba a medias y el
síntoma recién aparecía después, como un 500 en la página diciendo «no existe
la columna branchId».

Al terminar informa cuántas sentencias se aplicaron, cuáles fallaron y por
qué, y **verifica contra el catálogo** que estén todas las columnas que la
aplicación necesita. Si falta alguna, corta con código de error en vez de
dejarte creer que salió bien.

<details>
<summary>Alternativa con psql</summary>

Si preferís las herramientas de línea de comandos de PostgreSQL:

```bash
createdb saludplus
psql -d saludplus -f db/schema.sql
```

En Windows, si `psql` no se reconoce, usá la ruta completa (ajustá la versión):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d saludplus -f db\schema.sql
```

</details>

## 4. Arranque

```bash
npm run dev
```

Abrí <http://localhost:3000>.

## 5. Datos de demostración (opcional)

Con el servidor levantado:

- <http://localhost:3000/api/seed-catalog> — carga especialidades y médicos
- <http://localhost:3000/api/seed> — crea las cuentas de demo

## 6. Recordatorios de turno (opcional)

Los avisos de la campanita se generan solos: al reservar, al cancelar, al
cambiar el estado de un turno y al recibir una calificación.

El recordatorio de "tenés un turno mañana" se crea de dos formas:

1. **Al abrir la aplicación.** Cuando un paciente entra, se generan los suyos.
   Alcanza para probarlo, pero solo llega a quien entra.
2. **Con un planificador externo**, llamando a `/api/cron/reminders`. Es la
   forma correcta para que el aviso exista aunque la persona no haya entrado.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

En Vercel, agregando `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 12 * * *" }] }
```

Se puede llamar tantas veces como se quiera: cada aviso lleva una clave de
deduplicación y el índice único descarta los repetidos.

## 7. Verificación

```bash
npm test        # 305 pruebas automatizadas, ~2 segundos
npm run typecheck
npm run lint
npm run build
```

### Sobre las pruebas

Corren con el ejecutor incorporado de Node (`node:test`) y TypeScript nativo:
**no hay ninguna dependencia de testing instalada**. `test/loader.mjs` traduce
el alias `@/` y reemplaza por stubs los módulos que solo existen del lado del
servidor, así que las pruebas ejercitan la lógica de dominio sin base de datos.

Qué cubren:

| Archivo | Qué verifica |
| --- | --- |
| `format.test.ts` | Fechas, edades, DNI, iniciales |
| `validations.test.ts` | Las ocho validaciones, con entradas adversas |
| `booking-slots.test.ts` | Generación de horarios y jornadas mal cargadas |
| `ics.test.ts` | Archivo de calendario: formato, escapado, plegado de líneas |
| `appointment-service.test.ts` | Reserva, reprogramación, cancelación, permisos |
| `domain-services.test.ts` | Reglas de médicos, pacientes, especialidades, sedes, usuarios y reseñas |
| `notification-service.test.ts` | Avisos, deduplicación, recordatorios, aislamiento de fallos |
| `theme.test.ts` | Tema claro/oscuro: cookie, clases y alternancia |
| `theme-css.test.ts` | Que las dos copias del tema oscuro no se desincronicen y que todo token esté registrado con `@property` |
| `google-calendar.test.ts` | El enlace a Google Calendar: fechas, lugar, escapado |
| `schema.test.ts` | El corte del SQL en sentencias y el orden del esquema (que ningún índice use una columna antes de que la migración la agregue) |

Los repositorios se reemplazan por implementaciones en memoria (`test/fakes.ts`),
que replican el comportamiento que importa: un turno cancelado no ocupa horario,
el índice único de avisos descarta los repetidos, y las búsquedas por email
ignoran mayúsculas.

`npm run test:watch` las deja corriendo y reejecutándose al guardar.

---

## Notas de arquitectura

**Capas.** `routes` (Server Actions) → `controllers` (sesión + validación) →
`services` (reglas de negocio) → `repository` (acceso a datos). El grafo de
dependencias se arma una sola vez en `src/services/container.ts`; antes cada
controller reconstruía sus servicios y las copias se desincronizaban.

**Errores.** Las mutaciones devuelven `ActionResult<T>` (`src/lib/actionResult.ts`)
en lugar de lanzar excepciones. Next.js reemplaza el mensaje de una excepción por
un texto genérico en producción, así que el detalle de validación —"Ya existe un
médico con ese email"— no llegaba nunca a la pantalla.

**Integridad.** Las reglas viven en los servicios y están respaldadas por
restricciones en la base:

| Regla | Servicio | Base de datos |
| --- | --- | --- |
| Email único por médico / paciente | chequeo previo con mensaje claro | índice único |
| Nombre de especialidad único | chequeo previo | índice único |
| No borrar una especialidad con médicos | error explicativo | — |
| No hay doble reserva del mismo horario | chequeo previo | índice único parcial |
| No quedan turnos huérfanos | — | `ON DELETE CASCADE` |
| Siempre queda al menos un administrador | guarda en `UserService` | — |
| No hay dos turnos en el mismo consultorio | chequeo previo | índice único parcial |
| Nadie tiene dos turnos a la misma hora | chequeo previo | índice único parcial |
| No borrar una sede con médicos | error explicativo | — |
| Una sola reseña por turno | chequeo previo | `UNIQUE` en `appointmentId` |
| Calificación entre 1 y 5 | validación | `CHECK` |
| Un aviso no se duplica | — | índice único sobre `dedupeKey` |

El chequeo previo da el mensaje entendible; la restricción de la base es la que
realmente decide cuando dos pedidos entran a la vez.

**Datos calculados, no cargados a mano.** Tres valores que antes se escribían y
quedaban desactualizados ahora se derivan de su fuente real:

| Valor | Se calcula desde |
| --- | --- |
| Estrellas del médico (`rating`, `reviewCount`) | tabla `reviews` |
| Médicos por especialidad (`activeDoctors`) | tabla `doctors` |
| Edad del paciente | `birthDate` |

Las estrellas y el contador se cachean en la fila para no rehacer el promedio en
cada listado, pero la tabla es siempre la fuente de verdad y el script SQL los
reconstruye.

**Agenda propia por profesional.** Cada médico tiene su jornada —apertura,
cierre, corte del mediodía y duración de consulta—, y los horarios de reserva se
calculan a partir de eso. Antes eran una constante global de catorce horarios
idénticos para todos. El formulario muestra en vivo cuántos turnos entran por
día, y rechaza una jornada donde no entre ninguno.

El calendario de reserva respeta además los días de atención: `workDays` existía
desde el principio pero no lo leía nadie, así que se podía reservar con alguien
un día que no trabaja.

**Exportar a calendario.** Cada turno se puede descargar como archivo `.ics`
desde el botón "Agendar". Es texto plano generado en el servidor, sin
dependencias ni servicios externos, con un recordatorio propio 24 horas antes.

**Tema claro/oscuro sin dependencia y sin `<script>`.** `next-themes` renderizaba
su script anti-destello dentro de un componente de cliente, y React 19 avisa
por consola que un `<script>` montado en el cliente no se ejecuta nunca. El
aviso salta igual desde un componente de servidor: el layout también se
rerenderiza en el cliente al navegar.

La solución no fue mover el script sino eliminarlo. La preferencia se guarda
en una **cookie** en vez de `localStorage`, así que el servidor la lee antes
de generar el HTML y escribe la clase directamente en `<html>`: sin script,
sin aviso y sin destello. El modo "seguir al sistema" no escribe ninguna clase
y lo resuelve el CSS con `prefers-color-scheme`, sin que intervenga
JavaScript.

| Preferencia | Clase en `<html>` | Quién decide el color |
| --- | --- | --- |
| Oscuro | `dark` | la clase |
| Claro | `light` | la clase, que además bloquea la media query |
| Seguir al sistema | ninguna | `prefers-color-scheme` en CSS |

El tema oscuro queda declarado dos veces en `globals.css` porque CSS no
permite aplicar un mismo bloque de variables desde dos contextos sin
repetirlo. `test/theme-css.test.ts` compara las dos copias variable por
variable: si alguien retoca un color en una sola, la prueba dice cuál.

Se agregó además el botón que faltaba en la barra superior; antes el tema solo
se cambiaba con una tecla que no estaba anunciada en ningún lado.

**Reseñas visibles.** El comentario se pedía, se validaba y se guardaba, pero
no se mostraba en ningún lado: era información que la gente escribía y nadie
leía nunca. Ahora hay una ficha del profesional —desde el paso de elegir
médico al reservar, y desde la tabla de Médicos en administración— con el
promedio, la cantidad de opiniones y los comentarios.

Se muestran **sin identidad del paciente**. En una aplicación de salud, decir
"Juan Pérez calificó al Dr. X" revela que Juan es paciente del Dr. X, y eso es
información médica sobre una persona concreta. La opinión sirve igual sin el
nombre. Con menos de tres opiniones se aclara que son pocas: un 5.0 de una
persona no dice lo mismo que un 5.0 de cuarenta.

El promedio de la ficha se calcula desde la tabla `reviews` y no desde la copia
cacheada en `doctors`, y hay una prueba que ensucia esa copia a propósito para
verificarlo.

**Una persona no puede estar en dos lugares a la vez.** Había guarda para la
agenda del profesional y para el consultorio, pero ninguna para el paciente:
se podían reservar cardiología y fonoaudiología el mismo día a las 08:00 con
profesionales distintos. Cada turno era válido por separado y ninguno de los
dos chequeos existentes los veía. Ahora hay un tercer chequeo, su índice único
`appointments_patient_unique`, y el calendario deshabilita los horarios que la
persona ya tiene ocupados con cualquier médico —antes se ofrecían como libres
y el rechazo aparecía recién al confirmar.

**Agendar en Google Calendar.** El botón "Agendar" ofrece dos caminos: abrir
Google Calendar con el turno cargado, o descargar el `.ics` para Outlook, Apple
o el calendario del teléfono. El enlace a Google no usa la API sino el
formulario de evento nuevo, que no necesita credenciales de OAuth y funciona
hoy; a cambio hace falta un clic para confirmar y el evento no se entera si
después se cancela el turno acá, cosa que el propio evento aclara.

**Diálogos largos.** `DialogContent` es una columna flexible con
`max-h-[calc(100dvh-2rem)]`, y `DialogBody` es la parte que se desplaza:
encabezado y pie quedan fijos, así el título sigue diciendo qué se edita y los
botones de guardar no se van de la pantalla. Antes el formulario de médico
—con jornada y días de atención— se salía por arriba y por abajo sin forma de
llegar a los campos. Se usa `dvh` y no `vh` porque en el celular la barra del
navegador aparece y desaparece.

**Sede y consultorio.** Un profesional atiende en una sede y tiene un
consultorio dentro de ella. El paciente elige la sede como primer paso de la
reserva y eso filtra especialidades y profesionales; el consultorio lo asigna la
clínica, porque es un recurso físico compartido —si lo eligiera el paciente, dos
consultas podrían caer en la misma sala a la misma hora—. Al reservar, la sede y
el consultorio se copian al turno: si el médico se muda después, el turno viejo
sigue diciendo dónde se atendió esa persona.
