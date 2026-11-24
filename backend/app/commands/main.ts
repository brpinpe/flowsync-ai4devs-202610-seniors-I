import { ListLoader } from '@adonisjs/core/ace'
import OpenapiCheck from './openapi_check.js'
import OpenapiGenerate from './openapi_generate.js'

/**
 * Comandos propios del proyecto, registrados en `adonisrc.ts`.
 *
 * No viven en `commands/` a propósito: ace valida los comandos de ese
 * directorio con `jsonschema@1.5.0`, que en Node 24 revienta con "Invalid URL"
 * al resolver los `$ref` de su propio esquema y tumba cualquier `node ace`.
 * `ListLoader` no pasa por esa validación.
 */
const loader = new ListLoader([OpenapiGenerate, OpenapiCheck])

export const getMetaData = () => loader.getMetaData()
export const getCommand = (meta: Parameters<typeof loader.getCommand>[0]) => loader.getCommand(meta)
