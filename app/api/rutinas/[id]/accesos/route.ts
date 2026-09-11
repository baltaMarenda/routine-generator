import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { listarAccesos } from '@/lib/db/alumnos'
import { obtenerAccesoRutina } from '@/lib/db/permisos'
import { normalizarUsername } from '@/lib/usuarios'

type Ctx = { params: Promise<{ id: string }> }

const { usuarios, rutinaAccesos } = schema

export const GET = ruta<Ctx>(async (_req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { rutina } = await obtenerAccesoRutina(usuario, id)
  return NextResponse.json(await listarAccesos(rutina.id, rutina.usuarioId))
})

/**
 * Transfiere la rutina a otro profesor por su nombre de usuario. Quien la
 * transfiere conserva el acceso: sólo se agrega el del otro. Puede transferirla
 * cualquiera que ya tenga acceso.
 */
export const POST = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { rutina } = await obtenerAccesoRutina(usuario, id)

  const { username } = await leerBody(
    req,
    z.object({ username: z.string().min(1, 'Ingresá el usuario del profesor.').transform(normalizarUsername) })
  )

  const db = getDb()
  const [destino] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, activo: usuarios.activo })
    .from(usuarios)
    .where(eq(usuarios.username, username))
    .limit(1)

  if (!destino || !destino.activo) {
    throw new HttpError(404, `No hay ningún profesor activo con el usuario "${username}".`)
  }
  if (destino.id === usuario.id) throw new HttpError(400, 'Ya tenés acceso a esta rutina.')
  if (destino.id === rutina.usuarioId) {
    throw new HttpError(400, `${destino.nombre} es quien creó la rutina: ya tiene acceso.`)
  }

  const agregados = await db
    .insert(rutinaAccesos)
    .values({ rutinaId: rutina.id, usuarioId: destino.id, otorgadoPor: usuario.id })
    .onConflictDoNothing()
    .returning({ usuarioId: rutinaAccesos.usuarioId })

  if (agregados.length === 0) throw new HttpError(409, `${destino.nombre} ya tiene acceso a esta rutina.`)

  return NextResponse.json(await listarAccesos(rutina.id, rutina.usuarioId), { status: 201 })
})
