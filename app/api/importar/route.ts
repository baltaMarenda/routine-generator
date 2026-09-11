import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { crearAlumnoCompleto } from '@/lib/db/alumnos'
import type { EvaluationData } from '@/lib/evaluation-types'
import type { RoutineData } from '@/lib/types'
import { nombreSchema } from '@/lib/usuarios'

const importarSchema = z.object({
  legacyId: z.string().min(1).max(100),
  nombre: nombreSchema,
  createdAt: z.string().optional(),
  evaluation: z.object({}).passthrough().nullable(),
  routine: z.object({ days: z.array(z.unknown()) }).passthrough().nullable(),
  meta: z
    .object({ dia: z.string().max(50).optional(), horario: z.string().max(50).optional() })
    .passthrough()
    .nullable(),
})

/**
 * Importa un alumno de los JSON viejos de GOBLET/_datos/ (o del localStorage) a
 * nombre del usuario logueado. Es idempotente por `legacy_id`: correrlo dos veces
 * no duplica. Las fotos las sube después el navegador, ya comprimidas, sólo si
 * el alumno se creó en este paso.
 */
export const POST = ruta(async req => {
  const usuario = await requireUser()
  const datos = await leerBody(req, importarSchema)

  const [existente] = await getDb()
    .select({ id: schema.alumnos.id })
    .from(schema.alumnos)
    .where(eq(schema.alumnos.legacyId, datos.legacyId))
    .limit(1)

  if (existente) return NextResponse.json({ estado: 'existente', alumnoId: existente.id })

  // La versión anterior guardaba sólo la fecha (YYYY-MM-DD). Tomada como medianoche
  // UTC, en Argentina se muestra como el día anterior: la anclamos al mediodía UTC.
  const fecha = datos.createdAt
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(datos.createdAt) ? `${datos.createdAt}T12:00:00Z` : datos.createdAt)
    : null
  const alumnoId = await crearAlumnoCompleto({
    nombre: datos.nombre,
    creadoPor: usuario.id,
    legacyId: datos.legacyId,
    createdAt: fecha && !Number.isNaN(fecha.getTime()) ? fecha : undefined,
    dia: datos.meta?.dia?.trim() || null,
    horario: datos.meta?.horario?.trim() || null,
    evaluacion: datos.evaluation as unknown as EvaluationData | null,
    rutina: datos.routine as unknown as RoutineData | null,
  })

  return NextResponse.json({ estado: 'importado', alumnoId }, { status: 201 })
})
