import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { AccesosRutina } from '../api-types'
import { createEmptyEvaluation, type EvaluationData } from '../evaluation-types'
import { createInitialRoutineData, type RoutineData } from '../types'
import { getDb, schema } from '.'

/** Las fotos viven en evaluacion_fotos: en el JSON de la evaluación nunca van. */
export function sinFotos(evaluacion: EvaluationData): EvaluationData {
  return { ...evaluacion, registroFotografico: [] }
}

interface NuevoAlumno {
  nombre: string
  creadoPor: string
  legacyId?: string
  createdAt?: Date
  dia?: string | null
  horario?: string | null
  evaluacion?: EvaluationData | null
  rutina?: RoutineData | null
}

/**
 * Crea al alumno junto con su evaluación y su rutina, todo o nada. Sin datos,
 * arranca con una evaluación y una rutina vacías con el nombre ya cargado, igual
 * que hacía el editor antes.
 */
export async function crearAlumnoCompleto(nuevo: NuevoAlumno): Promise<string> {
  const db = getDb()
  const alumnoId = crypto.randomUUID()
  const createdAt = nuevo.createdAt ?? new Date()

  const vacia = createEmptyEvaluation()
  const evaluacion = nuevo.evaluacion ?? {
    ...vacia,
    patientData: { ...vacia.patientData, nombreApellido: nuevo.nombre },
  }
  const rutina = nuevo.rutina ?? { ...createInitialRoutineData(), clientName: nuevo.nombre }

  await db.batch([
    db.insert(schema.alumnos).values({
      id: alumnoId,
      nombre: nuevo.nombre,
      creadoPor: nuevo.creadoPor,
      legacyId: nuevo.legacyId ?? null,
      dia: nuevo.dia ?? null,
      horario: nuevo.horario ?? null,
      createdAt,
    }),
    db.insert(schema.evaluaciones).values({
      alumnoId,
      datos: sinFotos(evaluacion),
      updatedBy: nuevo.creadoPor,
    }),
    db.insert(schema.rutinas).values({
      alumnoId,
      usuarioId: nuevo.creadoPor,
      nombre: `Rutina de ${nuevo.nombre}`.slice(0, 200),
      datos: rutina,
      createdAt,
    }),
  ])

  return alumnoId
}

/** Quién creó la rutina y a quiénes se la transfirieron. */
export async function listarAccesos(rutinaId: string, creadorId: string): Promise<AccesosRutina> {
  const db = getDb()
  const { usuarios, rutinaAccesos } = schema
  const otorgante = alias(usuarios, 'otorgante')

  const [[creador], compartidos] = await Promise.all([
    db
      .select({ username: usuarios.username, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, creadorId))
      .limit(1),
    db
      .select({
        username: usuarios.username,
        nombre: usuarios.nombre,
        otorgadoPor: otorgante.nombre,
        createdAt: rutinaAccesos.createdAt,
      })
      .from(rutinaAccesos)
      .innerJoin(usuarios, eq(usuarios.id, rutinaAccesos.usuarioId))
      .innerJoin(otorgante, eq(otorgante.id, rutinaAccesos.otorgadoPor))
      .where(eq(rutinaAccesos.rutinaId, rutinaId))
      .orderBy(rutinaAccesos.createdAt),
  ])

  return {
    creador: creador ?? { username: '', nombre: '(desconocido)' },
    compartidos: compartidos.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
  }
}
