import { useCallback, useMemo, useState, type ReactNode } from 'react'
import * as api from '@/lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'

const TOKEN_KEY = 'flowsync.token'

// localStorage puede no estar disponible (modo privado, almacenamiento bloqueado).
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken)

  const saveToken = useCallback((next: string | null) => {
    writeToken(next)
    setToken(next)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: newToken } = await api.login(email, password)
      saveToken(newToken)
    },
    [saveToken],
  )

  const signup = useCallback(
    async (email: string, password: string) => {
      const { token: newToken } = await api.signup(email, password)
      saveToken(newToken)
    },
    [saveToken],
  )

  const logout = useCallback(async () => {
    try {
      if (token) await api.logout(token)
    } catch {
      // Aunque el backend falle o el token ya no valga, la sesión local se cierra.
    } finally {
      saveToken(null)
    }
  }, [token, saveToken])

  const clearSession = useCallback(() => saveToken(null), [saveToken])

  const value = useMemo<AuthContextValue>(
    () => ({ token, login, signup, logout, clearSession }),
    [token, login, signup, logout, clearSession],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
