import { and, eq, exists, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { HttpError, type UsuarioActual } from '../auth-server'
import { getDb, schema } from '.'
import type { Alumno, Rutina } from './schema'

const { alumnos, rutinas, rutinaAccesos } = schema

/**
 * Reglas de acceso:
 * - El admin ve y edita todo.
 * - Un profesor ve (y edita: evaluación, fotos y rutina) a los alumnos que creó y
 *   a los que tienen una rutina que le transfirieron.
 * - Sólo el creador o el admin eliminan a un alumno.
 *
 * Cuando algo no es visible respondemos 404, no 403: así no se filtra que existe.
 */

const uuidSchema = z.string().uuid()

function noEncontrado(): never {
  throw new HttpError(404, 'No se encontró el alumno o no tenés acceso.')
}

/** Condición para filtrar `alumnos` a los visibles. `undefined` = sin filtro (admin). */
export function alumnosVisiblesWhere(usuario: UsuarioActual): SQL | undefined {
  if (usuario.esAdmin) return undefined
  return or(
    eq(alumnos.creadoPor, usuario.id),
    exists(
      getDb()
        .select({ uno: sql`1` })
        .from(rutinaAccesos)
        .innerJoin(rutinas, eq(rutinas.id, rutinaAccesos.rutinaId))
        .where(and(eq(rutinas.alumnoId, alumnos.id), eq(rutinaAccesos.usuarioId, usuario.id)))
    )
  )
}

export interface AccesoAlumno {
  alumno: Alumno
  rutina: Rutina
  /** Creó al alumno (y por lo tanto su rutina). */
  esCreador: boolean
  puedeEliminar: boolean
}

async function resolverAcceso(
  usuario: UsuarioActual,
  alumno: Alumno | undefined,
  rutina: Rutina | null | undefined
): Promise<AccesoAlumno> {
  if (!alumno || !rutina) noEncontrado()

  const esCreador = alumno.creadoPor === usuario.id || rutina.usuarioId === usuario.id
  if (!esCreador && !usuario.esAdmin) {
    const [acceso] = await getDb()
      .select({ rutinaId: rutinaAccesos.rutinaId })
      .from(rutinaAccesos)
      .where(and(eq(rutinaAccesos.rutinaId, rutina.id), eq(rutinaAccesos.usuarioId, usuario.id)))
      .limit(1)
    if (!acceso) noEncontrado()
  }

  return { alumno, rutina, esCreador, puedeEliminar: esCreador || usuario.esAdmin }
}

/** Alumno + rutina si el usuario puede verlos; si no, tira 404. */
export async function obtenerAccesoAlumno(
  usuario: UsuarioActual,
  alumnoId: string
): Promise<AccesoAlumno> {
  if (!uuidSchema.safeParse(alumnoId).success) noEncontrado()

  const [fila] = await getDb()
    .select({ alumno: alumnos, rutina: rutinas })
    .from(alumnos)
    .leftJoin(rutinas, eq(rutinas.alumnoId, alumnos.id))
    .where(eq(alumnos.id, alumnoId))
    .limit(1)

  return resolverAcceso(usuario, fila?.alumno, fila?.rutina)
}

/** Igual que obtenerAccesoAlumno, pero partiendo del id de la rutina. */
export async function obtenerAccesoRutina(
  usuario: UsuarioActual,
  rutinaId: string
): Promise<AccesoAlumno> {
  if (!uuidSchema.safeParse(rutinaId).success) noEncontrado()

  const [fila] = await getDb()
    .select({ alumno: alumnos, rutina: rutinas })
    .from(rutinas)
    .innerJoin(alumnos, eq(alumnos.id, rutinas.alumnoId))
    .where(eq(rutinas.id, rutinaId))
    .limit(1)

  return resolverAcceso(usuario, fila?.alumno, fila?.rutina)
}

/**
 * Profesor que el admin quiere modificar (nombre, activo, contraseña). Los admins
 * no se tocan desde la app: se gestionan en la BD.
 */
export async function obtenerProfesorEditable(id: string) {
  if (!uuidSchema.safeParse(id).success) throw new HttpError(404, 'No se encontró el usuario.')

  const [usuario] = await getDb()
    .select({ id: schema.usuarios.id, esAdmin: schema.usuarios.esAdmin })
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, id))
    .limit(1)

  if (!usuario) throw new HttpError(404, 'No se encontró el usuario.')
  if (usuario.esAdmin) {
    throw new HttpError(403, 'Los administradores se gestionan desde la base de datos.')
  }
  return usuario
}
