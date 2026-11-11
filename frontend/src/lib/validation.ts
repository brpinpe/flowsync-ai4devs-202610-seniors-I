// Mismas reglas que backend/app/validators/user.ts, para avisar antes de enviar.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_MAX_LENGTH = 254
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 32

export function validateEmail(email: string): string | null {
  if (!email) return 'Introduce tu email.'
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return 'Introduce un email válido.'
  }
  return null
}

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Introduce una contraseña.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede tener más de ${PASSWORD_MAX_LENGTH} caracteres.`
  }
  return null
}
