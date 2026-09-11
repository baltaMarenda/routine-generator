import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const CAMBIAR_PASSWORD = '/cambiar-password'

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl
  const esApi = pathname.startsWith('/api/')

  // Sin `id` también cae la sesión vieja (usuario único por env / login con Google).
  if (!token?.id) {
    if (esApi) {
      return NextResponse.json({ error: 'Tenés que iniciar sesión.' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Las APIs lo controlan leyendo la BD (lib/auth-server.ts); acá sólo redirigimos páginas.
  if (token.debeCambiarPassword && !esApi && pathname !== CAMBIAR_PASSWORD) {
    return NextResponse.redirect(new URL(CAMBIAR_PASSWORD, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|login|.*\\..*).*)'],
}
