import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { buildOpenApiDocument, openApiDocumentPath } from './openapi_generate.js'

/**
 * Lista las diferencias entre dos valores JSON como rutas legibles
 * (`paths./api/v1/tasks.post.summary`), una por hoja que cambia.
 */
export function diffJson(versioned: unknown, fresh: unknown, path = ''): string[] {
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
  if (isObject(versioned) && isObject(fresh) && Array.isArray(versioned) === Array.isArray(fresh)) {
    const keys = new Set([...Object.keys(versioned), ...Object.keys(fresh)])
    return [...keys].flatMap((key) => {
      const child = path ? `${path}.${key}` : key
      if (!(key in fresh)) return [`- ${child} (está en el versionado, ya no se genera)`]
      if (!(key in versioned)) return [`+ ${child} (se genera, falta en el versionado)`]
      return diffJson(versioned[key], fresh[key], child)
    })
  }
  if (JSON.stringify(versioned) === JSON.stringify(fresh)) return []
  return [`~ ${path || '(raíz)'}: ${JSON.stringify(versioned)} → ${JSON.stringify(fresh)}`]
}

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Regenera el documento OpenAPI en una ubicación temporal y falla si no coincide con docs/api/openapi.json'
  static options: CommandOptions = { startApp: true }

  async run() {
    const versionedPath = openApiDocumentPath(this.app)
    const dir = await mkdtemp(join(tmpdir(), 'openapi-check-'))
    try {
      const freshPath = join(dir, 'openapi.json')
      await writeFile(freshPath, await buildOpenApiDocument(this.app))
      const fresh = await readFile(freshPath, 'utf8')

      let versioned: string
      try {
        versioned = await readFile(versionedPath, 'utf8')
      } catch {
        return this.fail(`No existe ${versionedPath}.`)
      }
      if (versioned === fresh) {
        this.logger.success(`${versionedPath} está al día`)
        return
      }

      let differences: string[]
      try {
        differences = diffJson(JSON.parse(versioned), JSON.parse(fresh))
      } catch {
        differences = ['el fichero versionado no es JSON válido']
      }
      if (differences.length === 0) differences = ['mismo contenido, distinto formato']
      this.fail(`${versionedPath} no coincide con el contrato actual:\n${differences.join('\n')}`)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  private fail(reason: string) {
    this.logger.error(`${reason}\nEjecuta "npm run openapi:generate" y commitea el resultado.`)
    this.exitCode = 1
  }
}
