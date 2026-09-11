export const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
export const ROOT_FOLDER = 'GOBLET'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const FOLDER_CACHE_LS_KEY = 'goblet_drive_folder_cache'

/**
 * Cada profesor exporta a su propio Drive y en una misma PC pueden entrar varios:
 * la caché de ids de carpetas va separada por cuenta de Google, si no una cuenta
 * usaría carpetas de otra, a las que no tiene acceso. La fija hooks/use-drive.ts.
 */
let driveAccount = ''

export function usarCuentaDrive(email: string | null): void {
  driveAccount = email ?? ''
}

const folderCacheKey = () => `${FOLDER_CACHE_LS_KEY}:${driveAccount}`

function readFolderCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(folderCacheKey())
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeFolderCache(cache: Record<string, string>): void {
  try {
    localStorage.setItem(folderCacheKey(), JSON.stringify(cache))
  } catch {}
}

export async function apiFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive API ${res.status}: ${body}`)
  }
  return res.json()
}

/**
 * Returns the id of a folder with `name` under `parentId` (or Drive root).
 * If the folder doesn't exist yet it is created. Never creates duplicates.
 */
export async function getOrCreateFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const cacheKey = parentId ? `${parentId}/${name}` : name
  const cache = readFolderCache()
  if (cache[cacheKey]) return cache[cacheKey]

  const parentClause = parentId
    ? ` and '${parentId}' in parents`
    : " and 'root' in parents"

  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  )
  const { files } = await apiFetch(
    accessToken,
    `${DRIVE_API}/files?q=${q}&fields=files(id)&spaces=drive`
  )

  if (files.length > 0) {
    cache[cacheKey] = files[0].id
    writeFolderCache(cache)
    return files[0].id
  }

  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]

  const folder = await apiFetch(accessToken, `${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  cache[cacheKey] = folder.id
  writeFolderCache(cache)
  return folder.id
}

/**
 * Returns the id of GOBLET/{profesor}/{dia}/{horario}/{studentName}/, creating any
 * missing folders. This is the single folder every file for a student lands in:
 * routine, evaluation and photos.
 */
async function getStudentFolderId(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  studentName: string
): Promise<string> {
  const rootId = await getOrCreateFolder(accessToken, ROOT_FOLDER)
  const profesorId = await getOrCreateFolder(accessToken, profesor, rootId)
  const diaId = await getOrCreateFolder(accessToken, dia, profesorId)
  const horarioId = await getOrCreateFolder(accessToken, horario, diaId)
  return getOrCreateFolder(accessToken, studentName, horarioId)
}

/** Returns the Drive file id of an existing file, or null. */
export async function findFileId(
  accessToken: string,
  folderId: string,
  filename: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${filename}' and '${folderId}' in parents and trashed=false`
  )
  const { files } = await apiFetch(
    accessToken,
    `${DRIVE_API}/files?q=${q}&fields=files(id)`
  )
  return files.length > 0 ? files[0].id : null
}

/** Lo que devuelve Drive de un archivo subido; se registra en la BD. */
export interface DriveFile {
  id: string
  webViewLink: string
}

/** Uploads a single binary blob using multipart upload. Creates or replaces the file. */
export async function uploadBinaryFile(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
  data: Uint8Array | Buffer,
  existingId?: string | null
): Promise<DriveFile> {
  const boundary = 'goblet_bin_boundary'
  const metadataJson = existingId ? '{}' : JSON.stringify({ name: filename, parents: [folderId] })
  const preamble = new Blob([
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
    metadataJson,
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  ])
  const epilogue = new Blob([`\r\n--${boundary}--`])
  const body = new Blob([preamble, data, epilogue])

  const url = existingId
    ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart&fields=id,webViewLink`
    : `${UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive upload ${res.status}: ${body}`)
  }
  return res.json()
}

/**
 * Uploads all photos to GOBLET/{profesor}/{dia}/{horario}/{studentName}/ as
 * {studentName}_Foto_01.ext, _Foto_02.ext, ...
 * Extra photos from a previous save (if count decreased) are deleted.
 */
export async function writeStudentPhotosToDrive(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  studentName: string,
  photos: string[]
): Promise<void> {
  const folderId = await getStudentFolderId(accessToken, profesor, dia, horario, studentName)

  // List existing photo files for this student
  const q = encodeURIComponent(
    `'${folderId}' in parents and name contains '_Foto_' and trashed=false`
  )
  const { files: existing } = await apiFetch(
    accessToken,
    `${DRIVE_API}/files?q=${q}&fields=files(id,name)`
  ) as { files: { id: string; name: string }[] }

  const uploadedNames = new Set<string>()

  for (let i = 0; i < photos.length; i++) {
    const dataUrl = photos[i]
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) continue

    const mimeType = match[1]
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
    const filename = `${studentName}_Foto_${String(i + 1).padStart(2, '0')}.${ext}`
    uploadedNames.add(filename)

    const binaryStr = atob(match[2])
    const bytes = new Uint8Array(binaryStr.length)
    for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j)

    const existingFile = existing.find(f => f.name === filename)
    await uploadBinaryFile(accessToken, folderId, filename, mimeType, bytes, existingFile?.id)
  }

  // Delete Drive photos that no longer exist in the current array
  await Promise.all(
    existing
      .filter(f => !uploadedNames.has(f.name))
      .map(f =>
        fetch(`${DRIVE_API}/files/${f.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      )
  )
}

/**
 * Uploads an xlsx buffer to
 * GOBLET/{profesor}/{dia}/{horario}/{studentName}/{studentName}_Evaluacion.xlsx —
 * the same folder the routine is saved to.
 * If the file already exists it is replaced (PATCH); otherwise created (POST).
 */
export async function writeEvaluationXlsxToDrive(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  studentName: string,
  buffer: Buffer
): Promise<void> {
  const folderId = await getStudentFolderId(accessToken, profesor, dia, horario, studentName)
  const filename = `${studentName}_Evaluacion.xlsx`
  const existingId = await findFileId(accessToken, folderId, filename)
  await uploadBinaryFile(accessToken, folderId, filename, XLSX_MIME, buffer, existingId)
}

/**
 * Uploads an xlsx buffer to
 * GOBLET/{profesor}/{dia}/{horario}/{studentName}/{studentName}_Rutina.xlsx.
 * If the file already exists it is replaced (PATCH); otherwise created (POST).
 * Returns the file's id and webViewLink so they can be recorded in the DB.
 */
export async function writeRoutineXlsxToDrive(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  studentName: string,
  buffer: Buffer
): Promise<DriveFile> {
  const folderId = await getStudentFolderId(accessToken, profesor, dia, horario, studentName)
  const filename = `${studentName}_Rutina.xlsx`
  const existingId = await findFileId(accessToken, folderId, filename)
  return uploadBinaryFile(accessToken, folderId, filename, XLSX_MIME, buffer, existingId)
}

/**
 * Returns the id of a folder with `name` under `parentId`, or null if it doesn't
 * exist. A la inversa de getOrCreateFolder: al borrar no queremos crear carpetas.
 */
export async function findFolderId(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
  )
  const { files } = await apiFetch(
    accessToken,
    `${DRIVE_API}/files?q=${q}&fields=files(id)&spaces=drive`
  )
  return files.length > 0 ? files[0].id : null
}

/**
 * Manda un archivo o carpeta a la papelera de Drive. No borramos definitivamente
 * para que un borrado por error se pueda deshacer desde Drive; como todas las
 * consultas filtran `trashed=false`, para la app deja de existir igual.
 */
export async function trashDriveFile(accessToken: string, fileId: string): Promise<void> {
  await apiFetch(accessToken, `${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
}

/** Olvida las entradas de la caché de carpetas que apunten a `folderId`. */
function forgetCachedFolder(folderId: string): void {
  const cache = readFolderCache()
  let changed = false
  for (const [key, value] of Object.entries(cache)) {
    if (value === folderId) {
      delete cache[key]
      changed = true
    }
  }
  if (changed) writeFolderCache(cache)
}

/**
 * Manda a la papelera GOBLET/{profesor}/{dia}/{horario}/{studentName}/ con todo lo
 * que tenga adentro (rutina, evaluación y fotos). No crea nada: si la carpeta no
 * existe — el alumno nunca se guardó en Drive, o se guardó con otro horario — no
 * hace nada.
 */
export async function deleteStudentFolderFromDrive(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  studentName: string
): Promise<void> {
  const rootId = await getOrCreateFolder(accessToken, ROOT_FOLDER)
  const profesorId = await findFolderId(accessToken, profesor, rootId)
  if (!profesorId) return
  const diaId = await findFolderId(accessToken, dia, profesorId)
  if (!diaId) return
  const horarioId = await findFolderId(accessToken, horario, diaId)
  if (!horarioId) return
  const studentId = await findFolderId(accessToken, studentName, horarioId)
  if (!studentId) return

  await trashDriveFile(accessToken, studentId)
  forgetCachedFolder(studentId)
}
