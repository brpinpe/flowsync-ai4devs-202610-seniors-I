import type Task from '#models/task'
import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Del responsable solo sale lo que la lista necesita: nunca su email ni otros
 * datos de cuenta (por eso no se reutiliza UserTransformer).
 */
export class AssigneeTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName'])
  }
}

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: AssigneeTransformer.transform(this.resource.assignee),
    }
  }
}
