/**
 * Stub del constructor de tablas de Drizzle.
 *
 * Los archivos de `src/models` exportan la definición de la tabla junto con la
 * clase de dominio, así que importar el modelo arrastra el ORM. Las pruebas
 * ejercitan la clase, no la tabla: alcanza con que los objetos existan y que
 * los encadenamientos (.notNull().default(...)) devuelvan algo.
 */

function column() {
  const builder = {}
  const chain = () => builder
  for (const method of [
    "notNull",
    "default",
    "defaultNow",
    "primaryKey",
    "unique",
    "references",
    "$type",
  ]) {
    builder[method] = chain
  }
  return builder
}

export const text = column
export const timestamp = column
export const boolean = column
export const integer = column
export const real = column
export const varchar = column
export const serial = column

export function pgTable(name, columns) {
  return { ...columns, __tableName: name }
}
