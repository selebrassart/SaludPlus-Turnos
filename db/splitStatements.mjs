/**
 * Parte un script SQL en sentencias individuales.
 *
 * Existe porque mandar `schema.sql` entero en una sola llamada lo envuelve en
 * una transacción implícita: una sola sentencia que falla descarta TODO el
 * resto, incluidas las que ya habían andado. Así se perdía la migración
 * completa por un índice mal ubicado, y el error visible no dejaba ver que lo
 * demás tampoco se había aplicado.
 *
 * El corte no puede ser un `split(";")`: hay puntos y comas dentro de los
 * bloques `DO $$ ... $$`, de los literales de texto, de los identificadores
 * entre comillas y de los comentarios.
 *
 * Vive en su propio módulo para que `apply-schema.mjs` siga siendo un script
 * que se ejecuta y no algo que se pueda importar por accidente: importarlo
 * intentaría conectarse a la base.
 */
export function splitStatements(sql) {
  const statements = []
  let current = ""
  let i = 0

  while (i < sql.length) {
    const rest = sql.slice(i)

    // Comentario de línea.
    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", i)
      const stop = end === -1 ? sql.length : end
      current += sql.slice(i, stop)
      i = stop
      continue
    }

    // Comentario de bloque.
    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2)
      const stop = end === -1 ? sql.length : end + 2
      current += sql.slice(i, stop)
      i = stop
      continue
    }

    // Literal de texto: '' adentro es una comilla escapada, no el final.
    if (sql[i] === "'") {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2
          continue
        }
        if (sql[j] === "'") break
        j++
      }
      current += sql.slice(i, j + 1)
      i = j + 1
      continue
    }

    // Identificador entre comillas dobles.
    if (sql[i] === '"') {
      const end = sql.indexOf('"', i + 1)
      const stop = end === -1 ? sql.length : end + 1
      current += sql.slice(i, stop)
      i = stop
      continue
    }

    // Bloque con comillas de dólar: $$ ... $$ o $etiqueta$ ... $etiqueta$.
    const dollar = rest.match(/^\$([A-Za-z_]\w*)?\$/)
    if (dollar) {
      const tag = dollar[0]
      const end = sql.indexOf(tag, i + tag.length)
      const stop = end === -1 ? sql.length : end + tag.length
      current += sql.slice(i, stop)
      i = stop
      continue
    }

    if (sql[i] === ";") {
      statements.push(current.trim())
      current = ""
      i++
      continue
    }

    current += sql[i]
    i++
  }

  if (current.trim()) statements.push(current.trim())

  // Lo que queda solo con comentarios no es una sentencia.
  return statements.filter((statement) =>
    statement
      .split("\n")
      .some((line) => line.trim() && !line.trim().startsWith("--"))
  )
}
