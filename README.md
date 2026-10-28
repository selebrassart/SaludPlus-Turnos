# SaludPlus

Sistema de gestión de turnos médicos: la administración carga sedes, especialidades y
profesionales; los pacientes reservan, reprograman y califican sus consultas.

[![Node.js](https://img.shields.io/badge/Node.js-22.18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/tests-305%20pasando-3fb950)](#pruebas)
[![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)](#índice)
[![License](https://img.shields.io/badge/license-académico%20%2F%20sin%20licencia%20pública-lightgrey)](#licencia)

Trabajo Práctico de la materia **Desarrollo de Software (UTN)**. No es un paquete publicado ni
tiene pipeline de CI — las badges de stack son informativas.

> **Este repositorio es una copia del proyecto desarrollado en equipo.**
> Repositorio original: [nerffo/utn-dsw-saludplus](https://github.com/nerffo/utn-dsw-saludplus)

## Índice

- [Integrantes del grupo](#integrantes-del-grupo)
- [Acerca del proyecto](#acerca-del-proyecto)
- [Capturas](#capturas)
- [Stack](#stack)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Modelo de dominio](#modelo-de-dominio)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso rápido](#uso-rápido)
- [Configuración](#configuración)
- [Scripts útiles](#scripts-útiles)
- [Pruebas](#pruebas)
- [Flujo de trabajo / Contribuciones](#flujo-de-trabajo--contribuciones)
- [Soporte / Preguntas frecuentes](#soporte--preguntas-frecuentes)
- [Documentación adicional](#documentación-adicional)
- [Licencia](#licencia)
- [Agradecimientos](#agradecimientos)

## Integrantes del grupo

| Legajo | Integrante |
| :--- | :--- |
| _53530_ | _Coso, Franco_ |
| _53260_ | _Lavatti, Valentino_ |
| _49195_ | _Brassart, Selene_ |
| _53219_ | _Virgolin, Iván_ |

**Mi participación (Selene):** trabajé en pair programming con el equipo en ... _(completá con lo
que realmente hiciste: módulos, pantallas, validaciones, pruebas, etc.)_. Los commits del
repositorio original fueron realizados por mis compañeros durante las sesiones de trabajo en
conjunto.

## Acerca del proyecto

SaludPlus reemplaza la agenda en papel de una clínica por una plataforma web con tres vistas
según el rol: un **panel de administración** (sedes, consultorios, especialidades, profesionales,
pacientes y usuarios), un **panel del profesional** (su agenda del día y el detalle de cada
paciente) y un **panel del paciente** (reserva paso a paso, reprogramación, cancelación y
calificación). Nace como TP de la cátedra pero está pensado para poder correr en una clínica
real chica o mediana.

Funcionalidades principales:

- **Autenticación y roles**: registro y login propios con [Better Auth](https://better-auth.com),
  sesión por cookie y control de acceso por rol (`patient` / `doctor` / `admin`) en cada Server
  Action. La ficha de paciente se crea o repara sola si el alta quedó a medias.
- **Reserva paso a paso**: el paciente elige sede → especialidad → profesional → fecha y hora.
  Cada paso filtra al siguiente, y el calendario respeta los días que ese profesional atiende.
- **Agenda propia por profesional**: cada médico tiene su jornada —apertura, cierre, corte del
  mediodía y duración de consulta— y los horarios de reserva se calculan a partir de eso. El
  formulario muestra en vivo cuántos turnos entran por día y rechaza una jornada donde no entre
  ninguno.
- **Tres reglas de superposición**: no hay dos turnos con el mismo profesional a la misma hora,
  ni dos en el mismo consultorio, ni dos del mismo paciente. Cada una está chequeada en el
  servicio con un mensaje entendible y respaldada por un índice único parcial en la base.
- **Reprogramación**: mover un turno conserva el registro y su historial, en lugar de cancelar y
  crear uno nuevo.
- **Sedes y consultorios**: el paciente elige la sede; el consultorio lo asigna la clínica,
  porque es un recurso físico compartido. Al reservar, sede y consultorio se copian al turno.
- **Reseñas y calificaciones**: terminada la consulta, el paciente la califica de 1 a 5 estrellas
  con un comentario opcional. El promedio del profesional se calcula desde las reseñas reales; un
  médico sin opiniones muestra "Sin calificaciones" en vez de una nota inventada.
- **Avisos en la campanita**: se generan solos al reservar, cancelar, cambiar el estado de un
  turno y recibir una calificación, más un recordatorio el día anterior a la consulta. Cada aviso
  lleva una clave de deduplicación, así que el generador se puede correr las veces que haga falta.
- **Exportar al calendario**: cada turno se puede agendar en Google Calendar o descargar como
  archivo `.ics` para Outlook, Apple o el calendario del teléfono, con un recordatorio propio 24
  horas antes.
- **Tema claro y oscuro**: la preferencia viaja en una cookie y la resuelve el servidor, así que
  no hay destello al cargar ni ningún `<script>` en la página.

## Capturas

<img width="1920" height="877" alt="Captura de SaludPlus" src="https://github.com/user-attachments/assets/c0bbc873-fe15-45e1-940d-dec3b310517c" />

## Stack

**Framework** — [Next.js](https://nextjs.org/) 16 con App Router y **Server Actions**: no hay una
API REST propia; los módulos de `src/routes/` se marcan con `"use server"` y el cliente los
importa como funciones. Los únicos endpoints HTTP son los que necesitan serlo (autenticación,
descarga del `.ics`, carga de datos de demostración y el cron de recordatorios).

**Datos** — [PostgreSQL](https://www.postgresql.org/) con [Drizzle ORM](https://orm.drizzle.team/)
sobre `node-postgres`. El esquema se versiona como SQL plano e idempotente en `db/schema.sql`.

**Interfaz** — React 19, [Tailwind CSS](https://tailwindcss.com/) 4 y componentes de
[Base UI](https://base-ui.com/) vía shadcn, con `lucide-react` para los íconos y `sonner` para
los avisos.

**Pruebas** — el ejecutor incorporado de Node (`node:test`) sobre TypeScript nativo. **Cero
dependencias de testing instaladas.**

## Estructura del repositorio

```
db/                 Esquema SQL idempotente y el script que lo aplica
src/
  app/              Rutas del App Router y los endpoints HTTP puntuales
  components/       Interfaz, separada por rol (admin / doctor / patient)
  controllers/      Sesión y validación de entrada
  models/           Entidades, DTOs y su mapeo desde la base
  repository/       Acceso a datos con Drizzle
  routes/           Server Actions: el punto de entrada del cliente
  services/         Reglas de negocio
  validations/      Saneamiento de la entrada del usuario
test/               305 pruebas y los dobles en memoria
```

Las capas se recorren siempre en el mismo sentido:

```
routes → controllers → services → repository
```

El grafo de dependencias se arma una sola vez en `src/services/container.ts`. Ningún controller
instancia un servicio por su cuenta: antes lo hacían, y al agregar una dependencia las copias
quedaban desincronizadas.

## Modelo de dominio

Entidades principales: `branches`, `specialties`, `doctors`, `patients`, `appointments`,
`reviews` y `notifications`, más las cuatro tablas que exige Better Auth (`user`, `session`,
`account`, `verification`). Roles: `patient`, `doctor` y `admin`.

### Turnos, agenda y consultorios

- Una **jornada** (`doctors.startTime`, `endTime`, `breakStart`, `breakEnd`, `slotMinutes`) es
  propia de cada profesional. Los horarios que ve el paciente se calculan a partir de ella; antes
  eran una constante global de catorce horarios idénticos para todos. Dejar el corte vacío
  significa jornada continua.
- Los **días de atención** (`doctors.workDays`) los respeta el calendario de reserva: no se puede
  pedir turno un día que ese profesional no trabaja.
- Un **turno** ocupa tres recursos a la vez, y por eso hay tres índices únicos parciales, todos
  excluyendo los cancelados —un turno cancelado libera el horario:

  | Índice | Qué impide |
  | :--- | :--- |
  | `appointments_slot_unique` | Dos turnos con el mismo profesional a la misma hora |
  | `appointments_room_unique` | Dos turnos en el mismo consultorio a la misma hora |
  | `appointments_patient_unique` | Que una persona esté en dos consultas a la vez |

  El chequeo previo en el servicio da el mensaje entendible; el índice de la base es el que
  realmente decide cuando dos pedidos entran al mismo tiempo.
- La **sede y el consultorio se copian al turno** al reservar. Es desnormalización deliberada: si
  el profesional se muda de sede, el turno del mes pasado tiene que seguir diciendo dónde se
  atendió esa persona.
- Las **estrellas no se cargan a mano**. `doctors.rating` y `reviewCount` se recalculan desde la
  tabla `reviews`; se cachean en la fila para no rehacer el promedio en cada listado, pero la
  tabla es siempre la fuente de verdad y el script SQL los reconstruye.
- Las **reseñas se muestran sin identidad del paciente**. En una aplicación de salud, decir
  "Fulano calificó al Dr. X" revela que Fulano es paciente del Dr. X, y eso es información médica
  sobre una persona concreta.

## Requisitos

- Node.js **22.18** o superior — las pruebas corren TypeScript sin compilar previamente, y eso
  necesita el *type stripping* nativo, que dejó de ser experimental en esa versión
- npm
- PostgreSQL 14 o superior corriendo localmente (o accesible por red)

No hace falta tener `psql` en el `PATH`: el esquema se aplica con el driver `pg`.

## Instalación

```bash
git clone https://github.com/selebrassart/SaludPlus-Turnos.git
cd SaludPlus-Turnos

npm install
```

Creá el archivo `.env.local` en la raíz (ver [Configuración](#configuración)) y después aplicá el
esquema:

```bash
npm run db:setup
```

Ese comando crea la base si no existe y aplica `db/schema.sql`. Es **idempotente**: se puede
correr sobre una base vacía o sobre una que ya existe, y en el segundo caso agrega las columnas y
restricciones nuevas sin tocar los datos.

Corre **una sentencia por vez**, no el archivo entero de una. La diferencia importa: mandado en
una sola llamada, PostgreSQL lo envuelve en una transacción implícita y una sola sentencia que
falla descarta todo el resto, incluida la migración que ya había andado. Al terminar informa
cuántas sentencias se aplicaron, cuáles fallaron y por qué, y **verifica contra el catálogo** que
estén todas las columnas que la aplicación necesita.

## Uso rápido

```bash
npm run dev
```

- Aplicación: `http://localhost:3000`

Con el servidor levantado, para cargar datos de demostración:

- `http://localhost:3000/api/seed-catalog` — especialidades y profesionales
- `http://localhost:3000/api/seed` — cuentas de demo de los tres roles

## Configuración

### `.env.local`

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. **Obligatoria**: sin ella la aplicación no arranca y avisa exactamente qué falta. El SSL se agrega solo para hosts remotos y se omite en `localhost`, donde rompería | `postgresql://postgres:postgres@localhost:5432/saludplus` |
| `BETTER_AUTH_SECRET` | Secreto para firmar las sesiones. Generar uno propio: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | *(generado)* |
| `BETTER_AUTH_URL` | URL pública de la aplicación | `http://localhost:3000` |
| `CRON_SECRET` | Opcional. Protege `/api/cron/reminders`, que genera los recordatorios del día siguiente. En desarrollo se puede dejar sin definir; en producción el endpoint queda deshabilitado hasta que tenga un valor | *(elegida)* |

`.env.local` está en `.gitignore` y nunca se commitea.

### Recordatorios de turno

Los avisos de la campanita se generan solos. El recordatorio de "tenés un turno mañana" se crea de
dos formas: al abrir la aplicación —alcanza para probarlo, pero solo le llega a quien entra— o con
un planificador externo, que es la forma correcta:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

En Vercel, agregando `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 12 * * *" }] }
```

Se puede llamar tantas veces como se quiera: cada aviso lleva una clave de deduplicación y el
índice único descarta los repetidos.

## Scripts útiles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm start` | Sirve el build de producción |
| `npm run db:setup` | Crea la base si no existe y aplica el esquema |
| `npm test` | Las 305 pruebas, en unos 2 segundos |
| `npm run test:watch` | Las deja corriendo y reejecutándose al guardar |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre `**/*.{ts,tsx}` |

## Pruebas

Corren con el ejecutor incorporado de Node y TypeScript nativo: **no hay ninguna dependencia de
testing instalada**. `test/loader.mjs` traduce el alias `@/` y reemplaza por stubs los módulos que
solo existen del lado del servidor, así que las pruebas ejercitan la lógica de dominio sin
levantar una base de datos.

| Archivo | Qué verifica |
| :--- | :--- |
| `format.test.ts` | Fechas, edades, DNI, iniciales |
| `validations.test.ts` | Las ocho validaciones, con entradas adversas |
| `booking-slots.test.ts` | Generación de horarios y jornadas mal cargadas |
| `ics.test.ts` | Archivo de calendario: formato, escapado, plegado de líneas |
| `google-calendar.test.ts` | El enlace a Google Calendar: fechas, lugar, escapado |
| `appointment-service.test.ts` | Reserva, reprogramación, cancelación, permisos, superposiciones |
| `domain-services.test.ts` | Profesionales, pacientes, especialidades, sedes, usuarios y reseñas |
| `notification-service.test.ts` | Avisos, deduplicación, recordatorios, aislamiento de fallos |
| `theme.test.ts` | Tema claro/oscuro: cookie, clases y alternancia |
| `theme-css.test.ts` | Que las dos copias del tema oscuro en el CSS no se desincronicen |
| `schema.test.ts` | El corte del SQL en sentencias y el orden del esquema |

Los repositorios se reemplazan por implementaciones en memoria (`test/fakes.ts`) que replican el
comportamiento que importa: un turno cancelado no ocupa horario, el índice único de avisos
descarta los repetidos y las búsquedas por email ignoran mayúsculas.

## Flujo de trabajo / Contribuciones

Proyecto de cátedra — no acepta contribuciones externas. Convención interna: rama por unidad de
trabajo contra `main`, integrada por Pull Request, con `main` siempre en verde (`npm test` y
`npm run build`).

```bash
git switch -c feat/nombre-de-la-feature
# commits...
npm test && npm run build
git push -u origin feat/nombre-de-la-feature
# abrir PR contra main
```

Prefijos: `feat/`, `fix/`, `refactor/`, `test/`, `chore/`, `docs/`. Los mensajes siguen
[Conventional Commits](https://www.conventionalcommits.org/es/): `type(scope): resumen en
imperativo`, asunto de hasta 50 caracteres y cuerpo hasta 72, explicando **por qué** —el qué ya
está en el diff.

## Soporte / Preguntas frecuentes

- **`next` no se reconoce como comando.** Usá `npm run dev`, no `next dev`. Los binarios viven en
  `node_modules/.bin`, y npm los pone en el `PATH` únicamente al correr un script del
  `package.json`.
- **`psql` no se reconoce como comando.** No hace falta: `npm run db:setup` aplica el esquema con
  el driver `pg`. En Windows, `psql` no queda instalado salvo que se tilde esa opción.
- **La página falla con «no existe la columna ...».** Faltan columnas nuevas en tu base. Corré
  `npm run db:setup`, que además verifica el resultado y corta con error si algo quedó a medias.
- **`npm run db:setup` avisa que hay datos duplicados.** Un índice único no se puede crear porque
  ya hay filas que lo violan (emails repetidos, dos turnos en el mismo horario). El mensaje dice
  cuál: corregí esos datos y volvé a correrlo.
- **El registro falla con «null value in column issuer».** La columna `account.issuer` no forma
  parte del modelo de Better Auth y no puede ser `NOT NULL`. El esquema ya la deja anulable.
- **No aparece el botón para calificar.** Solo se ofrece en turnos ya **atendidos**. Un profesional
  o un administrador tiene que marcar el turno como atendido primero: si se pudiera calificar
  antes de la consulta, la estrella no significaría nada.

## Documentación adicional

- [`SETUP.md`](SETUP.md) — puesta en marcha detallada y notas de arquitectura: por qué cada
  decisión es como es, qué venía roto del andamiaje original y qué quedó deliberadamente sin
  implementar.

## Licencia

Trabajo académico sin licencia pública (`UNLICENSED`) — código presentado como Trabajo Práctico
para la cátedra de Desarrollo de Software, UTN. Todos los derechos reservados a sus autores.

## Agradecimientos

- Cátedra de Desarrollo de Software, UTN FRRo — consigna y seguimiento del TP.
- [Next.js](https://nextjs.org/) y [Drizzle ORM](https://orm.drizzle.team/) por la documentación
  de referencia usada durante el desarrollo.

 
 
