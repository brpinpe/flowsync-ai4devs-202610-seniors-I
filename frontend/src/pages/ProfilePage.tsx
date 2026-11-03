import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CircleAlert } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { AuthLayout } from '@/components/auth-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiError, genericErrorMessage, getProfile, type User } from '@/lib/api'

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string }

export function ProfilePage() {
  const { token, logout, clearSession } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()

    getProfile(token, controller.signal)
      .then((user) => setState({ status: 'ready', user }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          // Token caducado o revocado: se olvida y ProtectedRoute manda a /login.
          clearSession()
          return
        }
        setState({ status: 'error', message: genericErrorMessage(error) })
      })

    return () => controller.abort()
  }, [token, clearSession, reloadKey])

  function retry() {
    setState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>
            Datos de la cuenta con la que has iniciado sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' && (
            <p className="text-sm text-muted-foreground" role="status">
              Cargando perfil…
            </p>
          )}
          {state.status === 'error' && (
            <div className="grid gap-3">
              <Alert variant="destructive" role="alert">
                <CircleAlert />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={retry}>
                Reintentar
              </Button>
            </div>
          )}
          {state.status === 'ready' && (
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground"
              >
                {state.user.initials}
              </div>
              <dl className="grid min-w-0 gap-1 text-sm">
                <div>
                  <dt className="sr-only">Nombre</dt>
                  <dd className="font-medium">
                    {state.user.fullName ?? 'Sin nombre'}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">Email</dt>
                  <dd className="truncate text-muted-foreground">
                    {state.user.email}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
