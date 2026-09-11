import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { hashPassword, passwordSchema, verificarPassword } from '@/lib/usuarios'

const { usuarios } = schema

export const POST = ruta(async req => {
  // Es justamente la ruta que tiene que andar con el cambio de contraseña pendiente.
  const usuario = await requireUser({ permitirCambioPendiente: true })
  const { actual, nueva } = await leerBody(
    req,
    z.object({ actual: z.string().min(1, 'Ingresá tu contraseña actual.'), nueva: passwordSchema })
  )

  const db = getDb()
  const [fila] = await db
    .select({ passwordHash: usuarios.passwordHash })
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1)

  if (!fila || !(await verificarPassword(actual, fila.passwordHash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta.')
  }
  if (actual === nueva) throw new HttpError(400, 'La contraseña nueva tiene que ser distinta de la actual.')

  await db
    .update(usuarios)
    .set({ passwordHash: await hashPassword(nueva), debeCambiarPassword: false })
    .where(eq(usuarios.id, usuario.id))

  return NextResponse.json({ ok: true })
})
