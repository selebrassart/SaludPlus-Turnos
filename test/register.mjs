/** Engancha el resolver de alias antes de cargar las pruebas. */
import { register } from "node:module"

register("./loader.mjs", import.meta.url)
