import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type TaskStatus = (typeof Task.STATUSES)[number]

export default class Task extends TaskSchema {
  /** Conjunto cerrado de estados. Viajan así por la API; la interfaz los traduce. */
  static readonly STATUSES = ['pending', 'in_progress', 'done'] as const

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
