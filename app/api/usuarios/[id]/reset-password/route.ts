import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { leerBody, requireAdmin, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerProfesorEditable } from '@/lib/db/permisos'
import { hashPassword, passwordSchema } from '@/lib/usuarios'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Recuperación de contraseña: el admin le pone una temporal y el profesor queda
 * obligado a elegir una nueva la próxima vez que entre.
 */
export const POST = ruta<Ctx>(async (req, { params }) => {
  await requireAdmin()
  const { id } = await params
  const profesor = await obtenerProfesorEditable(id)
  const { passwordTemporal } = await leerBody(req, z.object({ passwordTemporal: passwordSchema }))

  await getDb()
    .update(schema.usuarios)
    .set({ passwordHash: await hashPassword(passwordTemporal), debeCambiarPassword: true })
    .where(eq(schema.usuarios.id, profesor.id))

  return NextResponse.json({ ok: true })
})
