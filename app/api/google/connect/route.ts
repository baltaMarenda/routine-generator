import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireUser, ruta } from '@/lib/auth-server'
import { COOKIE_STATE, COOKIE_VOLVER, redirectUri, rutaInterna, urlConsentimiento } from '@/lib/google-oauth'

/** Arranca el consentimiento de Google para conectar el Drive del usuario logueado. */
export const GET = ruta(async req => {
  await requireUser()

  const url = new URL(req.url)
  const state = randomBytes(24).toString('base64url')
  const res = NextResponse.redirect(urlConsentimiento(state, redirectUri(url.origin)))

  const cookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/api/google',
  }
  res.cookies.set(COOKIE_STATE, state, cookie)
  res.cookies.set(COOKIE_VOLVER, rutaInterna(url.searchParams.get('volver')), cookie)
  return res
})
