import { NextResponse } from 'next/server'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { FotoDto } from '@/lib/api-types'
import { leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerAccesoAlumno } from '@/lib/db/permisos'

type Ctx = { params: Promise<{ id: string }> }

const { evaluacionFotos } = schema

/**
 * Tope por foto. Comprimidas en el navegador pesan ~200–300 KB; esto sólo frena
 * originales enormes si la compresión falló. ~3 MB de base64 ≈ 2,2 MB de imagen.
 */
const MAX_DATA_URL = 3_000_000

export const GET = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno } = await obtenerAccesoAlumno(usuario, id)

  const fotos: FotoDto[] = await getDb()
    .select({ id: evaluacionFotos.id, dataUrl: evaluacionFotos.dataUrl })
    .from(evaluacionFotos)
    .where(eq(evaluacionFotos.alumnoId, alumno.id))
    .orderBy(asc(evaluacionFotos.orden), asc(evaluacionFotos.createdAt))

  return NextResponse.json({ fotos })
})

const fotoSchema = z.object({
  dataUrl: z
    .string()
    .max(MAX_DATA_URL, 'La foto es demasiado grande.')
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'La foto no tiene un formato válido.'),
})

export const POST = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno } = await obtenerAccesoAlumno(usuario, id)
  const { dataUrl } = await leerBody(req, fotoSchema)

  const [foto] = await getDb()
    .insert(evaluacionFotos)
    .values({
      alumnoId: alumno.id,
      dataUrl,
      // Va al final de las que ya tenga el alumno.
      orden: sql`(select coalesce(max(${evaluacionFotos.orden}), -1) + 1 from ${evaluacionFotos} where ${evaluacionFotos.alumnoId} = ${alumno.id})`,
    })
    .returning({ id: evaluacionFotos.id })

  return NextResponse.json({ id: foto.id }, { status: 201 })
})
