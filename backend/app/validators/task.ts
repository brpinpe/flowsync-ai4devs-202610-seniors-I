import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import Task from '#models/task'

/**
 * Al crear, el título es lo único que se acepta: VineJS descarta cualquier
 * otra clave del cuerpo (status, assigneeId…).
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
})

/**
 * `optional()` deja pasar `null` (y el bodyparser convierte `""` en `null`).
 * Si la clave viene en el cuerpo, tiene que traer un valor válido.
 */
const sentInBody = (field: FieldContext) => Object.hasOwn(field.parent, field.name)

/**
 * Al actualizar se aceptan estado y responsable, juntos o por separado.
 * El título no se puede cambiar por aquí: se descarta.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(Task.STATUSES).optional().requiredWhen(sentInBody),
  assigneeId: vine
    .number()
    .withoutDecimals()
    .exists({ table: 'users', column: 'id' })
    .optional()
    .requiredWhen(sentInBody),
})
