/** fetch para las rutas de app/api desde el navegador. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

interface ApiInit extends Omit<RequestInit, 'body'> {
  /** Se manda como JSON. */
  json?: unknown
}

/**
 * Devuelve el JSON de la respuesta o tira ApiError con el mensaje del servidor.
 * Una sesión vencida lleva al login, y un cambio de contraseña pendiente (lo pone
 * el admin al resetearla) lleva a /cambiar-password.
 */
export async function api<T>(url: string, { json, headers, ...init }: ApiInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
    } else if (res.status === 403 && body?.code === 'DEBE_CAMBIAR_PASSWORD') {
      window.location.href = '/cambiar-password'
    }
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`, body?.code)
  }

  return body as T
}
