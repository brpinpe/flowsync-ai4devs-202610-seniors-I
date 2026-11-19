import Task from '#models/task'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  /**
   * Todas las tareas del espacio, sin filtrar por persona.
   * Sin orderBy a propósito: no hay regla de orden decidida (PA-3), así que
   * el orden no está garantizado.
   */
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')
    return serialize(TaskTransformer.transform(tasks))
  }

  /** Nace pendiente y con quien la crea como responsable. */
  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    // `status` explícito: Lucid solo recupera el id tras el insert, así que el
    // default de la columna no llegaría a la respuesta.
    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  /** Cualquiera puede cambiar el estado y el responsable de cualquier tarea. */
  async update({ params, request, serialize }: HttpContext) {
    const { status, assigneeId } = await request.validateUsing(updateTaskValidator)
    const task = await Task.findOrFail(params.id)

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
