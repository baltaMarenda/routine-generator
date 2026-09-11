import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import {
  canjearCodigo,
  cifrar,
  COOKIE_STATE,
  COOKIE_VOLVER,
  redirectUri,
  rutaInterna,
} from '@/lib/google-oauth'

/** Vuelta del consentimiento de Google: guarda el refresh token cifrado en el usuario. */
export const GET = ruta(async req => {
  const usuario = await requireUser()
  const url = new URL(req.url)
  const store = await cookies()
  const volver = rutaInterna(store.get(COOKIE_VOLVER)?.value)

  const terminar = (resultado: 'conectado' | 'cancelado' | 'error') => {
    const destino = new URL(volver, url.origin)
    destino.searchParams.set('drive', resultado)
    const res = NextResponse.redirect(destino)
    res.cookies.delete({ name: COOKIE_STATE, path: '/api/google' })
    res.cookies.delete({ name: COOKIE_VOLVER, path: '/api/google' })
    return res
  }

  const state = url.searchParams.get('state')
  const esperado = store.get(COOKIE_STATE)?.value
  if (!state || !esperado || state !== esperado) return terminar('error')

  // El usuario canceló en la pantalla de Google.
  if (url.searchParams.get('error')) return terminar('cancelado')

  const code = url.searchParams.get('code')
  if (!code) return terminar('error')

  try {
    const { refreshToken, email } = await canjearCodigo(code, redirectUri(url.origin))
    await getDb()
      .update(schema.usuarios)
      .set({ googleRefreshToken: cifrar(refreshToken), googleEmail: email })
      .where(eq(schema.usuarios.id, usuario.id))
    return terminar('conectado')
  } catch (err) {
    console.error('No se pudo conectar Google Drive:', err)
    return terminar('error')
  }
})
