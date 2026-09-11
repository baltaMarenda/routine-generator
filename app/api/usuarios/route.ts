import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { UsuarioDto } from '@/lib/api-types'
import { HttpError, leerBody, requireAdmin, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { hashPassword, nombreSchema, passwordSchema, usernameSchema } from '@/lib/usuarios'

const { usuarios } = schema

export const GET = ruta(async () => {
  await requireAdmin()

  const filas = await getDb()
    .select({
      id: usuarios.id,
      username: usuarios.username,
      nombre: usuarios.nombre,
      esAdmin: usuarios.esAdmin,
      activo: usuarios.activo,
      debeCambiarPassword: usuarios.debeCambiarPassword,
      googleEmail: usuarios.googleEmail,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .orderBy(sql`lower(${usuarios.nombre})`)

  const lista: UsuarioDto[] = filas.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))
  return NextResponse.json({ usuarios: lista })
})

/**
 * Alta de un profesor. `z.object` descarta campos desconocidos, así que un
 * `esAdmin` en el body se ignora: los admins sólo se asignan desde la BD.
 * La contraseña inicial la conoce el admin, así que se pide cambiarla al entrar.
 */
export const POST = ruta(async req => {
  await requireAdmin()
  const { username, nombre, password } = await leerBody(
    req,
    z.object({ username: usernameSchema, nombre: nombreSchema, password: passwordSchema })
  )

  const [creado] = await getDb()
    .insert(usuarios)
    .values({
      username,
      nombre,
      passwordHash: await hashPassword(password),
      esAdmin: false,
      debeCambiarPassword: true,
    })
    .onConflictDoNothing({ target: usuarios.username })
    .returning({ id: usuarios.id })

  if (!creado) throw new HttpError(409, `Ya existe un usuario "${username}".`)
  return NextResponse.json({ id: creado.id }, { status: 201 })
})
