import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { AlumnoDetalle } from '@/lib/api-types'
import { HttpError, leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { listarAccesos } from '@/lib/db/alumnos'
import { obtenerAccesoAlumno } from '@/lib/db/permisos'
import { nombreSchema } from '@/lib/usuarios'

type Ctx = { params: Promise<{ id: string }> }

const { alumnos, evaluaciones, rutinaAccesos } = schema

export const GET = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno, rutina, puedeEliminar } = await obtenerAccesoAlumno(usuario, id)
  const db = getDb()

  // La copia de Drive del creador está en `rutinas`; la de los demás, en su acceso.
  const miDrive =
    rutina.usuarioId === usuario.id
      ? Promise.resolve([{ link: rutina.googleDriveLink }])
      : db
          .select({ link: rutinaAccesos.googleDriveLink })
          .from(rutinaAccesos)
          .where(and(eq(rutinaAccesos.rutinaId, rutina.id), eq(rutinaAccesos.usuarioId, usuario.id)))
          .limit(1)

  const [[evaluacion], accesos, [drive]] = await Promise.all([
    db
      .select({ datos: evaluaciones.datos })
      .from(evaluaciones)
      .where(eq(evaluaciones.alumnoId, alumno.id))
      .limit(1),
    listarAccesos(rutina.id, rutina.usuarioId),
    miDrive,
  ])

  const detalle: AlumnoDetalle = {
    alumno: {
      id: alumno.id,
      nombre: alumno.nombre,
      dia: alumno.dia,
      horario: alumno.horario,
      createdAt: alumno.createdAt.toISOString(),
    },
    evaluacion: evaluacion?.datos ?? null,
    rutina: {
      id: rutina.id,
      nombre: rutina.nombre,
      datos: rutina.datos,
      updatedAt: rutina.updatedAt.toISOString(),
    },
    accesos,
    miDriveLink: drive?.link ?? null,
    puedeEliminar,
  }

  return NextResponse.json(detalle)
})

const textoCorto = z.string().trim().max(50).nullable().optional()

export const PATCH = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno } = await obtenerAccesoAlumno(usuario, id)

  const cambios = await leerBody(
    req,
    z.object({ nombre: nombreSchema.optional(), dia: textoCorto, horario: textoCorto })
  )
  const set = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined))
  if (Object.keys(set).length === 0) throw new HttpError(400, 'No hay nada para actualizar.')

  await getDb().update(alumnos).set(set).where(eq(alumnos.id, alumno.id))
  return NextResponse.json({ ok: true })
})

export const DELETE = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { alumno, puedeEliminar } = await obtenerAccesoAlumno(usuario, id)

  if (!puedeEliminar) {
    throw new HttpError(403, 'Sólo quien creó al alumno o el administrador pueden eliminarlo.')
  }

  // Evaluación, fotos, rutina y accesos se van en cascada.
  await getDb().delete(alumnos).where(eq(alumnos.id, alumno.id))
  return NextResponse.json({ ok: true })
})
