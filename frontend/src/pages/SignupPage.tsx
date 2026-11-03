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
import { ApiError, genericErrorMessage, type ApiFieldError } from '@/lib/api'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateNewPassword,
} from '@/lib/validation'

type FieldErrors = { email?: string; password?: string }

/** Traduce los errores 422 del validador de signup a mensajes por campo. */
function mapSignupErrors(errors: ApiFieldError[]): {
  fields: FieldErrors
  other: string | null
} {
  const fields: FieldErrors = {}
  let other: string | null = null

  for (const error of errors) {
    if (error.field === 'email' && !fields.email) {
      fields.email =
        error.rule === 'database.unique'
          ? 'Ese email ya está registrado. Inicia sesión o usa otro email.'
          : 'Introduce un email válido.'
    } else if (
      (error.field === 'password' || error.field === 'passwordConfirmation') &&
      !fields.password
    ) {
      fields.password = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`
    } else if (!other) {
      other = 'Revisa los datos del formulario e inténtalo de nuevo.'
    }
  }

  return { fields, other }
}

export function SignupPage() {
  const { signup } = useAuth()
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
    const passwordError = validateNewPassword(password)
    if (emailError) errors.email = emailError
    if (passwordError) errors.password = passwordError
    setFieldErrors(errors)
    setFormError(null)
    if (errors.email || errors.password) return

    setSubmitting(true)
    try {
      await signup(email.trim(), password)
      navigate('/profile', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const { fields, other } = mapSignupErrors(error.errors)
        setFieldErrors(fields)
        setFormError(other)
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
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Regístrate con tu email y una contraseña.
          </CardDescription>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
            />
            {!fieldErrors.password && (
              <p className="-mt-2 text-sm text-muted-foreground">
                Entre {PASSWORD_MIN_LENGTH} y {PASSWORD_MAX_LENGTH} caracteres.
              </p>
            )}
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-4">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  )
}
