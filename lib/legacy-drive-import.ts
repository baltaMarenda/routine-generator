/**
 * Lectura de los datos de la versión anterior de la app, para importarlos a la BD
 * (app/importar). Antes no había BD: los alumnos vivían como JSON en
 * `GOBLET/_datos/` del Drive de quien había conectado Google, y localStorage hacía
 * de caché (o era lo único, en las versiones más viejas). Acá sólo se lee: nada
 * de esto escribe en Drive.
 *
 * El scope `drive.file` alcanza para leer esos JSON siempre que se conecte la
 * misma cuenta de Google y la app use el mismo GOOGLE_CLIENT_ID que los creó.
 */
import { DRIVE_API, ROOT_FOLDER, findFileId, findFolderId, getOrCreateFolder } from './drive-sync'
import type { EvaluationData } from './evaluation-types'
import type { RoutineData } from './types'

const DATA_FOLDER = '_datos'

interface StoredClient {
  id: string
  name: string
  createdAt: string
}

interface ClientsIndex {
  clients: StoredClient[]
  /** Ids de alumnos eliminados: no se importan aunque sigan en el localStorage. */
  deleted?: string[]
}

interface RoutineMeta {
  profesor: string
  dia: string
  horario: string
}

export interface AlumnoAnterior {
  legacyId: string
  nombre: string
  createdAt: string
}

export interface DatosAlumnoAnterior {
  evaluation: EvaluationData | null
  routine: RoutineData | null
  meta: RoutineMeta | null
}

// Claves de localStorage de la versión anterior.
const LS_CLIENTS_KEY = 'goblet_demo_clients'
const lsEvalKey = (id: string) => `goblet_eval_${id}`
const lsRoutineKey = (id: string) => `goblet_routine_${id}`
const lsMetaKey = (id: string) => `goblet_routine_meta_${id}`

function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Id de GOBLET/_datos/, o null si nunca existió. Se busca una vez por token. */
const carpetaDatos = new Map<string, Promise<string | null>>()

function getDataFolderId(accessToken: string): Promise<string | null> {
  let pedido = carpetaDatos.get(accessToken)
  if (!pedido) {
    pedido = getOrCreateFolder(accessToken, ROOT_FOLDER).then(rootId =>
      findFolderId(accessToken, DATA_FOLDER, rootId)
    )
    carpetaDatos.set(accessToken, pedido)
  }
  return pedido
}

/** Contenido del JSON, o null si el archivo (o la carpeta) no existe. */
async function readJson<T>(accessToken: string, filename: string): Promise<T | null> {
  const folderId = await getDataFolderId(accessToken)
  if (!folderId) return null
  const fileId = await findFileId(accessToken, folderId, filename)
  if (!fileId) return null

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive download ${res.status}: ${body}`)
  }
  return (await res.json()) as T
}

/**
 * Alumnos del alumnos.json de Drive, más los que este navegador tenga sólo en
 * localStorage (sin contar los eliminados).
 */
export async function listarAlumnosAnteriores(accessToken: string): Promise<AlumnoAnterior[]> {
  const index = await readJson<ClientsIndex>(accessToken, 'alumnos.json')
  const borrados = new Set(index?.deleted ?? [])
  const remotos = index?.clients ?? []
  const idsRemotos = new Set(remotos.map(c => c.id))
  const locales = (readLocalJson<StoredClient[]>(LS_CLIENTS_KEY) ?? []).filter(
    c => !idsRemotos.has(c.id) && !borrados.has(c.id)
  )

  return [...remotos, ...locales]
    .filter(c => c.id && c.name?.trim())
    .map(c => ({ legacyId: c.id, nombre: c.name.trim(), createdAt: c.createdAt }))
}

/** Evaluación, rutina y meta del alumno. Drive manda; localStorage es el respaldo. */
export async function leerDatosAnteriores(
  accessToken: string,
  legacyId: string
): Promise<DatosAlumnoAnterior> {
  const blob = await readJson<DatosAlumnoAnterior>(accessToken, `alumno_${legacyId}.json`)
  return {
    evaluation: blob?.evaluation ?? readLocalJson<EvaluationData>(lsEvalKey(legacyId)),
    routine: blob?.routine ?? readLocalJson<RoutineData>(lsRoutineKey(legacyId)),
    meta: blob?.meta ?? readLocalJson<RoutineMeta>(lsMetaKey(legacyId)),
  }
}

/** Fotos como data URLs, sin comprimir: tal como estaban guardadas. */
export async function leerFotosAnteriores(accessToken: string, legacyId: string): Promise<string[]> {
  const blob = await readJson<{ fotos: string[] }>(accessToken, `alumno_${legacyId}_fotos.json`)
  if (blob?.fotos?.length) return blob.fotos
  return readLocalJson<EvaluationData>(lsEvalKey(legacyId))?.registroFotografico ?? []
}

/**
 * Borra la caché vieja de este navegador para los alumnos ya importados. Los JSON
 * de Drive no se tocan.
 */
export function limpiarCacheAnterior(legacyIds: string[]): void {
  try {
    for (const id of legacyIds) {
      localStorage.removeItem(lsEvalKey(id))
      localStorage.removeItem(lsRoutineKey(id))
      localStorage.removeItem(lsMetaKey(id))
    }
    const importados = new Set(legacyIds)
    const restantes = (readLocalJson<StoredClient[]>(LS_CLIENTS_KEY) ?? []).filter(
      c => !importados.has(c.id)
    )
    if (restantes.length === 0) localStorage.removeItem(LS_CLIENTS_KEY)
    else localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(restantes))
  } catch {
    // Sin localStorage no hay nada que limpiar.
  }
}
