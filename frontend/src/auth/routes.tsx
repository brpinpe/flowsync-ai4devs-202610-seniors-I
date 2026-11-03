import { Navigate, Outlet } from 'react-router'
import { useAuth } from './auth-context'

/** Solo con sesión: si no hay token, a /login. */
export function ProtectedRoute() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

/** Solo sin sesión: login y registro mandan al perfil si ya hay token. */
export function GuestRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/profile" replace /> : <Outlet />
}
