import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import type { DriveTokenDto } from '@/lib/api-types'
import { HttpError, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { descifrar, GoogleDesconectadoError, refrescarAccessToken } from '@/lib/google-oauth'

const { usuarios } = schema

/** Access token corto para que el navegador hable con la API de Drive. */
export const GET = ruta(async () => {
  const usuario = await requireUser()
  const db = getDb()

  const [fila] = await db
    .select({ refreshToken: usuarios.googleRefreshToken, email: usuarios.googleEmail })
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1)

  if (!fila?.refreshToken) throw new HttpError(404, 'Drive no está conectado.', 'DRIVE_NO_CONECTADO')

  try {
    const { accessToken, expiresAt } = await refrescarAccessToken(descifrar(fila.refreshToken))
    const token: DriveTokenDto = { accessToken, expiresAt, email: fila.email }
    return NextResponse.json(token, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (!(err instanceof GoogleDesconectadoError)) throw err

    console.error('Conexión de Drive inutilizable, se descarta:', err.message)
    await db
      .update(usuarios)
      .set({ googleRefreshToken: null, googleEmail: null })
      .where(eq(usuarios.id, usuario.id))
    throw new HttpError(409, 'La conexión con Drive venció. Volvé a conectarla.', 'DRIVE_RECONECTAR')
  }
})
