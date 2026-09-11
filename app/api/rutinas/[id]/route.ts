import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerAccesoRutina } from '@/lib/db/permisos'
import type { RoutineData } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

const { rutinas } = schema

export const GET = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno, rutina } = await obtenerAccesoRutina(usuario, id)

  return NextResponse.json({
    id: rutina.id,
    nombre: rutina.nombre,
    datos: rutina.datos,
    alumnoNombre: alumno.nombre,
  })
})

const cambiosSchema = z.object({
  nombre: z.string().trim().min(1, 'La rutina necesita un nombre.').max(200).optional(),
  datos: z
    .object({ days: z.array(z.unknown()) })
    .passthrough()
    .optional(),
})

export const PUT = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { rutina } = await obtenerAccesoRutina(usuario, id)
  const { nombre, datos } = await leerBody(req, cambiosSchema)

  if (nombre === undefined && datos === undefined) throw new HttpError(400, 'No hay nada para actualizar.')

  await getDb()
    .update(rutinas)
    .set({
      ...(nombre !== undefined && { nombre }),
      ...(datos !== undefined && { datos: datos as unknown as RoutineData }),
      updatedAt: new Date(),
    })
    .where(eq(rutinas.id, rutina.id))

  return NextResponse.json({ ok: true })
})
