import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { EvaluationData } from '../evaluation-types'
import type { RoutineData } from '../types'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

/**
 * Profesores que usan el sistema. `es_admin` sólo se cambia desde la BD: ninguna
 * ruta de la app lo escribe. Los usuarios no se borran (tienen alumnos y rutinas
 * colgando); se desactivan con `activo`.
 */
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Siempre en minúsculas: el login y las transferencias no distinguen mayúsculas. */
  username: text('username').notNull().unique(),
  nombre: text('nombre').notNull(),
  passwordHash: text('password_hash').notNull(),
  esAdmin: boolean('es_admin').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  /** Lo pone el admin al resetear la contraseña: obliga a elegir una nueva al entrar. */
  debeCambiarPassword: boolean('debe_cambiar_password').notNull().default(false),
  /** Cuenta de Google conectada para exportar a su propio Drive. */
  googleEmail: text('google_email'),
  /** Cifrado con GOOGLE_TOKEN_KEY (ver lib/google-oauth.ts). */
  googleRefreshToken: text('google_refresh_token'),
  createdAt: createdAt(),
})

export const alumnos = pgTable(
  'alumnos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: text('nombre').notNull(),
    creadoPor: uuid('creado_por').notNull().references(() => usuarios.id),
    /** Carpeta de profesor en Drive (GOBLET/{profesor}/...); la elige quien exporta. */
    profesor: text('profesor'),
    dia: text('dia'),
    horario: text('horario'),
    /** Id que tenía el alumno en el alumnos.json de Drive; hace idempotente la importación. */
    legacyId: text('legacy_id').unique(),
    createdAt: createdAt(),
  },
  t => [index('alumnos_creado_por_idx').on(t.creadoPor)]
)

/** Una evaluación por alumno. Las fotos van en evaluacion_fotos, no en `datos`. */
export const evaluaciones = pgTable('evaluaciones', {
  alumnoId: uuid('alumno_id')
    .primaryKey()
    .references(() => alumnos.id, { onDelete: 'cascade' }),
  datos: jsonb('datos').$type<EvaluationData>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => usuarios.id),
})

export const evaluacionFotos = pgTable(
  'evaluacion_fotos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    alumnoId: uuid('alumno_id')
      .notNull()
      .references(() => alumnos.id, { onDelete: 'cascade' }),
    orden: integer('orden').notNull(),
    /** data URL de un JPEG ya comprimido en el navegador (lib/image-compress.ts). */
    dataUrl: text('data_url').notNull(),
    createdAt: createdAt(),
  },
  t => [index('evaluacion_fotos_alumno_idx').on(t.alumnoId)]
)

/**
 * Una rutina por alumno. `usuario_id` es quien la creó; los profesores a los que
 * se la transfirieron están en rutina_accesos. El archivo de Drive de acá es la
 * copia del creador: cada profesor exporta a su propio Drive.
 */
export const rutinas = pgTable('rutinas', {
  id: uuid('id').primaryKey().defaultRandom(),
  alumnoId: uuid('alumno_id')
    .notNull()
    .unique()
    .references(() => alumnos.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  datos: jsonb('datos').$type<RoutineData>().notNull(),
  googleDriveFileId: varchar('google_drive_file_id', { length: 200 }),
  googleDriveLink: text('google_drive_link'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Profesores a los que se les transfirió una rutina, con su copia en su propio Drive. */
export const rutinaAccesos = pgTable(
  'rutina_accesos',
  {
    rutinaId: uuid('rutina_id')
      .notNull()
      .references(() => rutinas.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
    otorgadoPor: uuid('otorgado_por').notNull().references(() => usuarios.id),
    googleDriveFileId: varchar('google_drive_file_id', { length: 200 }),
    googleDriveLink: text('google_drive_link'),
    createdAt: createdAt(),
  },
  t => [
    primaryKey({ columns: [t.rutinaId, t.usuarioId] }),
    index('rutina_accesos_usuario_idx').on(t.usuarioId),
  ]
)

export type Usuario = typeof usuarios.$inferSelect
export type Alumno = typeof alumnos.$inferSelect
export type Rutina = typeof rutinas.$inferSelect
