import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerAccesoAlumno } from '@/lib/db/permisos'

type Ctx = { params: Promise<{ id: string; fotoId: string }> }

const { evaluacionFotos } = schema

export const DELETE = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id, fotoId } = await params
  const { alumno } = await obtenerAccesoAlumno(usuario, id)

  if (!z.string().uuid().safeParse(fotoId).success) throw new HttpError(404, 'No se encontró la foto.')

  const borradas = await getDb()
    .delete(evaluacionFotos)
    .where(and(eq(evaluacionFotos.id, fotoId), eq(evaluacionFotos.alumnoId, alumno.id)))
    .returning({ id: evaluacionFotos.id })

  if (borradas.length === 0) throw new HttpError(404, 'No se encontró la foto.')
  return NextResponse.json({ ok: true })
})
