import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Google ya no sirve para iniciar sesión: cada profesor, ya logueado con su
 * usuario, conecta su propio Drive. El refresh token queda cifrado en su fila de
 * `usuarios` y el servidor le entrega access tokens cortos al navegador
 * (app/api/google/token), que es quien habla con la API de Drive.
 */

const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Cookies del ida y vuelta del consentimiento (app/api/google/connect y callback). */
export const COOKIE_STATE = 'goblet_google_state'
export const COOKIE_VOLVER = 'goblet_google_volver'

/** Sólo rutas internas, para que `volver` no sirva de redirección abierta. */
export function rutaInterna(valor: string | null | undefined): string {
  const valida = valor && valor.startsWith('/') && !valor.startsWith('//') && !valor.startsWith('/\\')
  return valida ? valor : '/alumnos'
}

/**
 * El refresh token guardado ya no sirve: revocado o vencido en Google, o cifrado
 * con otra GOOGLE_TOKEN_KEY. Hay que volver a conectar Drive.
 */
export class GoogleDesconectadoError extends Error {}

function clave(): Buffer {
  const key = Buffer.from(process.env.GOOGLE_TOKEN_KEY ?? '', 'base64')
  if (key.length !== 32) {
    throw new Error('GOOGLE_TOKEN_KEY tiene que ser una clave de 32 bytes en base64 (openssl rand -base64 32)')
  }
  return key
}

/** AES-256-GCM. Formato: v1.iv.tag.cifrado, cada parte en base64url. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', clave(), iv)
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), cifrado.toString('base64url')].join('.')
}

export function descifrar(valor: string): string {
  // Una clave mal configurada es un error de configuración, no un token inservible:
  // se deja escapar tal cual para no borrarle la conexión a nadie.
  const key = clave()
  try {
    const [version, iv, tag, cifrado] = valor.split('.')
    if (version !== 'v1' || !iv || !tag || !cifrado) throw new Error('formato desconocido')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(cifrado, 'base64url')), decipher.final()]).toString('utf8')
  } catch (err) {
    throw new GoogleDesconectadoError(`No se pudo descifrar el token guardado: ${(err as Error).message}`)
  }
}

export function redirectUri(origenRequest: string): string {
  const base = process.env.NEXTAUTH_URL ?? origenRequest
  return new URL('/api/google/callback', base).toString()
}

export function urlConsentimiento(state: string, redirect: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPES,
    // offline + consent: así Google siempre devuelve refresh_token, aunque ya se
    // haya conectado antes con esa cuenta.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function pedirToken(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (body?.error === 'invalid_grant') throw new GoogleDesconectadoError(body.error_description)
    throw new Error(`Google token ${res.status}: ${JSON.stringify(body)}`)
  }
  return body as {
    access_token: string
    expires_in: number
    refresh_token?: string
    id_token?: string
    scope?: string
  }
}

/** Canjea el `code` del consentimiento. Devuelve el refresh token y el mail de la cuenta. */
export async function canjearCodigo(code: string, redirect: string) {
  const tokens = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirect })
  if (!tokens.refresh_token) throw new Error('Google no devolvió refresh_token')
  // En la pantalla de consentimiento se puede destildar el permiso de Drive.
  if (!tokens.scope?.includes('drive.file')) throw new Error('No se otorgó el permiso de Drive')

  // El id_token viene directo de Google por TLS en esta misma respuesta, así que
  // leer su payload sin verificar la firma es seguro acá.
  let email: string | null = null
  if (tokens.id_token) {
    const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'))
    email = typeof payload.email === 'string' ? payload.email : null
  }

  return { refreshToken: tokens.refresh_token, email }
}

export async function refrescarAccessToken(refreshToken: string) {
  const tokens = await pedirToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
  return {
    accessToken: tokens.access_token,
    // expires_in viene en segundos; lo pasamos a epoch en ms.
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }
}
