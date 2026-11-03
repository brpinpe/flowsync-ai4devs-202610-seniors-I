import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { CircleAlert } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
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
import { ApiError, genericErrorMessage } from '@/lib/api'
import { validateEmail } from '@/lib/validation'

type FieldErrors = { email?: string; password?: string }

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors: FieldErrors = {}
    const emailError = validateEmail(email.trim())
    if (emailError) errors.email = emailError
    if (!password) errors.password = 'Introduce tu contraseña.'
    setFieldErrors(errors)
    setFormError(null)
    if (errors.email || errors.password) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/profile', { replace: true })
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 422)
      ) {
        // 400: credenciales incorrectas. 422: el backend rechazó el formato.
        setFormError('Email o contraseña incorrectos.')
      } else {
        setFormError(genericErrorMessage(error))
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Entra con tu email y tu contraseña.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="grid gap-4">
            {formError && (
              <Alert variant="destructive" role="alert">
                <CircleAlert />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
            />
            <FormField
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-4">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Iniciar sesión'}
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link
                to="/signup"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Regístrate
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  )
}
