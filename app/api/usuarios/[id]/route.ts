import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, leerBody, requireAdmin, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerProfesorEditable } from '@/lib/db/permisos'
import { nombreSchema } from '@/lib/usuarios'

type Ctx = { params: Promise<{ id: string }> }

const { usuarios } = schema

/** Nombre y activar/desactivar. `es_admin` no se puede cambiar desde acá. */
export const PATCH = ruta<Ctx>(async (req, { params }) => {
  await requireAdmin()
  const { id } = await params
  const profesor = await obtenerProfesorEditable(id)

  const { nombre, activo } = await leerBody(
    req,
    z.object({ nombre: nombreSchema.optional(), activo: z.boolean().optional() })
  )
  if (nombre === undefined && activo === undefined) throw new HttpError(400, 'No hay nada para actualizar.')

  await getDb()
    .update(usuarios)
    .set({ ...(nombre !== undefined && { nombre }), ...(activo !== undefined && { activo }) })
    .where(eq(usuarios.id, profesor.id))

  return NextResponse.json({ ok: true })
})
