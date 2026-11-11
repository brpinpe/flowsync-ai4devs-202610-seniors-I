const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3333'}/api/v1`

/** Un error tal como lo devuelve el backend en `{ errors: [...] }`. */
export type ApiFieldError = {
  message: string
  rule?: string
  field?: string
}

/**
 * Error de una llamada a la API. `status` es el código HTTP, o 0 si no hubo
 * respuesta (backend caído, sin red, CORS).
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiFieldError[]

  constructor(status: number, errors: ApiFieldError[]) {
    super(errors[0]?.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

/** Lo que expone `UserTransformer` en el backend. */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string | null
}

type AuthPayload = { user: User; token: string }

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

async function request<T>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error
    throw new ApiError(0, [])
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errors =
      payload &&
      typeof payload === 'object' &&
      'errors' in payload &&
      Array.isArray(payload.errors)
        ? (payload.errors as ApiFieldError[])
        : []
    throw new ApiError(response.status, errors)
  }

  return payload as T
}

/**
 * Registro. El formulario solo pide email y contraseña, pero el validador del
 * backend exige además `fullName` (nullable) y `passwordConfirmation`.
 */
export async function signup(
  email: string,
  password: string,
): Promise<AuthPayload> {
  const { data } = await request<{ data: AuthPayload }>('/auth/signup', {
    method: 'POST',
    body: { fullName: null, email, password, passwordConfirmation: password },
  })
  return data
}

export async function login(
  email: string,
  password: string,
): Promise<AuthPayload> {
  const { data } = await request<{ data: AuthPayload }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  return data
}

export async function getProfile(
  token: string,
  signal?: AbortSignal,
): Promise<User> {
  const { data } = await request<{ data: User }>('/account/profile', {
    token,
    signal,
  })
  return data
}

/** `logout` responde `{ message }` sin envolver en `data`. */
export async function logout(token: string): Promise<void> {
  await request<{ message: string }>('/account/logout', {
    method: 'POST',
    token,
  })
}

/** Mensaje para errores que ninguna pantalla trata de forma específica. */
export function genericErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
  }
  return 'Algo salió mal. Inténtalo de nuevo en unos minutos.'
}
