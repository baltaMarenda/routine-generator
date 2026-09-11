import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import type { RutinaCopiable } from '@/lib/api-types'
import { requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { alumnosVisiblesWhere } from '@/lib/db/permisos'

const { alumnos, rutinas } = schema

/** Rutinas que el usuario puede ver, para "Copiar rutina de otro alumno". */
export const GET = ruta(async () => {
  const usuario = await requireUser()

  const lista: RutinaCopiable[] = await getDb()
    .select({
      id: rutinas.id,
      nombre: rutinas.nombre,
      alumnoId: alumnos.id,
      alumnoNombre: alumnos.nombre,
    })
    .from(rutinas)
    .innerJoin(alumnos, eq(alumnos.id, rutinas.alumnoId))
    .where(alumnosVisiblesWhere(usuario))
    .orderBy(sql`lower(${alumnos.nombre})`)

  return NextResponse.json({ rutinas: lista })
})
