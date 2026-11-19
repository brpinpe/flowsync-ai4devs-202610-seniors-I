import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

const TITLE_MAX = 255

/** Mismo criterio que el backend: sin contar los espacios de los extremos. */
function titleError(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Escribe un título para la tarea.'
  if (trimmed.length > TITLE_MAX)
    return `El título no puede superar los ${TITLE_MAX} caracteres.`
  return null
}

export function TasksPage() {
  const { token, expireSession } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Aviso de una acción fallida (crear o cambiar estado) que no es de un campo.
  const [actionError, setActionError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleFieldError, setTitleFieldError] = useState<string | null>(null)
  const [isCreating, setCreating] = useState(false)
  // Filas con un cambio de estado en vuelo: su selector queda bloqueado para
  // que una respuesta tardía o una reversión no pise una elección posterior.
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(new Set())

  /** Un 401 significa que el servidor ya no reconoce la sesión: se cierra. */
  const handleSessionLoss = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      expireSession(error.message)
      return true
    }
    return false
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false

    api
      .listTasks(token)
      .then((result) => {
        if (!cancelled) setTasks(result)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          expireSession(error.message)
          return
        }
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No hemos podido cargar las tareas.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token, expireSession])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    const error = titleError(title)
    setTitleFieldError(error)
    setActionError(null)
    if (error) return

    setCreating(true)
    try {
      const task = await api.createTask(token, title)
      // Al final: es donde la deja el orden natural de inserción. No es una
      // regla de orden (PA-3 sigue abierto).
      setTasks((current) => [...(current ?? []), task])
      setTitle('')
    } catch (error) {
      if (handleSessionLoss(error)) return
      if (error instanceof ApiError && error.fieldErrors.title) {
        setTitleFieldError(error.fieldErrors.title)
      } else {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'No se pudo crear la tarea. Inténtalo de nuevo.',
        )
      }
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (!token) return
    const previous = task.status
    const setRowStatus = (value: TaskStatus) =>
      setTasks((current) =>
        (current ?? []).map((item) =>
          item.id === task.id ? { ...item, status: value } : item,
        ),
      )

    setActionError(null)
    setRowStatus(status) // optimista: se ve al momento
    setSavingIds((ids) => new Set(ids).add(task.id))

    try {
      await api.updateTask(token, task.id, { status })
    } catch (error) {
      if (handleSessionLoss(error)) return
      setRowStatus(previous)
      setActionError(
        'No se pudo guardar el cambio de estado. Inténtalo de nuevo.',
      )
    } finally {
      setSavingIds((ids) => {
        const next = new Set(ids)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Link
            to="/profile"
            className="text-foreground text-sm font-medium underline"
          >
            Mi perfil
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Tareas del equipo</CardTitle>
            <CardDescription>
              Una sola lista para todos: quién lleva cada tarea y en qué estado
              está.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <form onSubmit={handleCreate} className="grid gap-2" noValidate>
              <Label htmlFor="title">Nueva tarea</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  name="title"
                  placeholder="¿En qué vas a trabajar?"
                  autoComplete="off"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(titleFieldError)}
                  aria-describedby={titleFieldError ? 'title-error' : undefined}
                />
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creando…' : 'Crear tarea'}
                </Button>
              </div>
              <FieldError
                id="title-error"
                message={titleFieldError ?? undefined}
              />
            </form>

            {actionError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <TaskList
              tasks={tasks}
              loadError={loadError}
              savingIds={savingIds}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type TaskListProps = {
  tasks: Task[] | null
  loadError: string | null
  savingIds: ReadonlySet<number>
  onStatusChange: (task: Task, status: TaskStatus) => void
}

function TaskList({
  tasks,
  loadError,
  savingIds,
  onStatusChange,
}: TaskListProps) {
  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    )
  }

  if (!tasks) {
    return (
      <div
        className="flex justify-center py-8"
        role="status"
        aria-live="polite"
      >
        <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        <span className="sr-only">Cargando tareas…</span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        <p className="text-foreground font-medium">Todavía no hay tareas.</p>
        <p className="mt-1">
          Esta es la lista compartida del equipo: aquí se ve en qué anda cada
          uno. Crea la primera tarea con el campo de arriba.
        </p>
      </div>
    )
  }

  // Sin reordenar: se pintan tal y como llegan de la API (PA-3).
  return (
    <ul className="divide-y rounded-md border">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{task.title}</p>
            <p className="text-muted-foreground text-sm">
              {task.assignee.fullName?.trim() || 'Sin nombre'}
            </p>
          </div>
          <select
            aria-label={`Estado de «${task.title}»`}
            value={task.status}
            disabled={savingIds.has(task.id)}
            onChange={(event) =>
              onStatusChange(task, event.target.value as TaskStatus)
            }
            className={cn(
              'border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
            )}
          >
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  )
}
