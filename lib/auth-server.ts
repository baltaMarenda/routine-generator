import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'
import { authOptions } from './auth'
import { getDb, schema } from './db'

/** Error que las rutas tiran para cortar con un status y un mensaje para mostrar. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

export interface UsuarioActual {
  id: string
  username: string
  nombre: string
  esAdmin: boolean
  googleEmail: string | null
}

/**
 * Usuario logueado, leído de la BD en cada request: `activo`, `es_admin` y
 * `debe_cambiar_password` se cambian desde afuera y el JWT puede tenerlos viejos.
 *
 * Mientras tenga pendiente el cambio de contraseña sólo puede usar las rutas que
 * pasan `permitirCambioPendiente` (el propio cambio de contraseña).
 */
export async function requireUser(
  opciones: { permitirCambioPendiente?: boolean } = {}
): Promise<UsuarioActual> {
  const session = await getServerSession(authOptions)
  const id = session?.user?.id
  if (!id) throw new HttpError(401, 'Tenés que iniciar sesión.')

  const [usuario] = await getDb()
    .select({
      id: schema.usuarios.id,
      username: schema.usuarios.username,
      nombre: schema.usuarios.nombre,
      esAdmin: schema.usuarios.esAdmin,
      activo: schema.usuarios.activo,
      debeCambiarPassword: schema.usuarios.debeCambiarPassword,
      googleEmail: schema.usuarios.googleEmail,
    })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, id))
    .limit(1)

  if (!usuario || !usuario.activo) throw new HttpError(401, 'Tu usuario no está activo.')
  if (usuario.debeCambiarPassword && !opciones.permitirCambioPendiente) {
    throw new HttpError(403, 'Tenés que cambiar la contraseña.', 'DEBE_CAMBIAR_PASSWORD')
  }

  return {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    esAdmin: usuario.esAdmin,
    googleEmail: usuario.googleEmail,
  }
}

export async function requireAdmin(): Promise<UsuarioActual> {
  const usuario = await requireUser()
  if (!usuario.esAdmin) throw new HttpError(403, 'Sólo el administrador puede hacer esto.')
  return usuario
}

/** Parsea el body con zod. Un JSON roto o inválido termina en 400. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function leerBody<T>(req: Request, schemaBody: ZodType<T, ZodTypeDef, any>): Promise<T> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new HttpError(400, 'El cuerpo de la request no es JSON válido.')
  }
  return schemaBody.parse(body)
}

/**
 * Envuelve un route handler y traduce los errores a JSON: HttpError con su status,
 * ZodError como 400 con el primer mensaje, y cualquier otra cosa como 500.
 */
export function ruta<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx)
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.issues[0]?.message ?? 'Datos inválidos.' },
          { status: 400 }
        )
      }
      console.error(`Error en ${req.method} ${new URL(req.url).pathname}:`, err)
      return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
    }
  }
}
