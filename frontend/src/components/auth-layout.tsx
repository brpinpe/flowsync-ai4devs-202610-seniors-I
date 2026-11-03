import type { ReactNode } from 'react'

/** Centra la tarjeta de las pantallas de auth y perfil. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
