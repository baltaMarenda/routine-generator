import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { AlumnoResumen } from '@/lib/api-types'
import { leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { crearAlumnoCompleto } from '@/lib/db/alumnos'
import { alumnosVisiblesWhere } from '@/lib/db/permisos'
import { nombreSchema } from '@/lib/usuarios'

const { alumnos, usuarios } = schema

export const GET = ruta(async () => {
  const usuario = await requireUser()

  const filas = await getDb()
    .select({
      id: alumnos.id,
      nombre: alumnos.nombre,
      createdAt: alumnos.createdAt,
      creadoPor: alumnos.creadoPor,
      creador: usuarios.nombre,
    })
    .from(alumnos)
    .innerJoin(usuarios, eq(usuarios.id, alumnos.creadoPor))
    .where(alumnosVisiblesWhere(usuario))
    .orderBy(sql`lower(${alumnos.nombre})`)

  const lista: AlumnoResumen[] = filas.map(f => ({
    id: f.id,
    nombre: f.nombre,
    createdAt: f.createdAt.toISOString(),
    creador: f.creador,
    esPropio: f.creadoPor === usuario.id,
  }))

  return NextResponse.json({ alumnos: lista })
})

export const POST = ruta(async req => {
  const usuario = await requireUser()
  const { nombre } = await leerBody(req, z.object({ nombre: nombreSchema }))

  const id = await crearAlumnoCompleto({ nombre, creadoPor: usuario.id })
  return NextResponse.json({ id }, { status: 201 })
})
