import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { ApplicationService } from '@adonisjs/core/types'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Construye el documento OpenAPI igual que lo sirve `GET /api.json` y lo
 * devuelve ya serializado, con un formato estable para que el diff del
 * fichero versionado solo cambie cuando cambia el contrato.
 */
export async function buildOpenApiDocument(app: ApplicationService) {
  const router = await app.container.make('router')
  // `router.toJSON()` solo devuelve rutas tras el commit; el servidor HTTP lo
  // hace al arrancar, aquí no hay servidor.
  router.commit()
  const openapi = await app.container.make('openapi')
  return JSON.stringify(await openapi.buildDocument(), null, 2) + '\n'
}

/** Fichero versionado del contrato, en `docs/` de la raíz del repo. */
export const openApiDocumentPath = (app: ApplicationService) =>
  app.makePath('..', 'docs', 'api', 'openapi.json')

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI y lo escribe en docs/api/openapi.json'
  static options: CommandOptions = { startApp: true }

  async run() {
    const target = openApiDocumentPath(this.app)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await buildOpenApiDocument(this.app))
    this.logger.action(`escribir ${target}`).succeeded()
  }
}
