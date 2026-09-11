import { NextResponse } from 'next/server'
import { z } from 'zod'
import { leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { sinFotos } from '@/lib/db/alumnos'
import { obtenerAccesoAlumno } from '@/lib/db/permisos'
import type { EvaluationData } from '@/lib/evaluation-types'

type Ctx = { params: Promise<{ id: string }> }

const { evaluaciones } = schema

export const PUT = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno } = await obtenerAccesoAlumno(usuario, id)

  const { datos } = await leerBody(req, z.object({ datos: z.object({}).passthrough() }))
  const evaluacion = sinFotos(datos as unknown as EvaluationData)

  await getDb()
    .insert(evaluaciones)
    .values({ alumnoId: alumno.id, datos: evaluacion, updatedBy: usuario.id })
    .onConflictDoUpdate({
      target: evaluaciones.alumnoId,
      set: { datos: evaluacion, updatedAt: new Date(), updatedBy: usuario.id },
    })

  return NextResponse.json({ ok: true })
})
