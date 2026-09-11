import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { descifrar } from '@/lib/google-oauth'

const { usuarios } = schema

export const POST = ruta(async () => {
  const usuario = await requireUser()
  const db = getDb()

  const [fila] = await db
    .select({ refreshToken: usuarios.googleRefreshToken })
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1)

  // Revocarlo en Google es cortesía: si falla, igual lo olvidamos acá.
  if (fila?.refreshToken) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: descifrar(fila.refreshToken) }),
      })
    } catch (err) {
      console.error('No se pudo revocar el token de Google:', err)
    }
  }

  await db
    .update(usuarios)
    .set({ googleRefreshToken: null, googleEmail: null })
    .where(eq(usuarios.id, usuario.id))

  return NextResponse.json({ ok: true })
})
