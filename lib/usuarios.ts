import bcrypt from 'bcryptjs'
import { z } from 'zod'

/**
 * Reglas compartidas por el login, el alta de usuarios del admin, el cambio de
 * contraseña y el script scripts/crear-usuario.ts.
 */

export const normalizarUsername = (username: string) => username.trim().toLowerCase()

export const usernameSchema = z
  .string()
  .transform(normalizarUsername)
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9._-]{3,32}$/,
        'El usuario debe tener entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.'
      )
  )

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede tener más de 128 caracteres.')

export const nombreSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'El nombre no puede tener más de 100 caracteres.')

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
