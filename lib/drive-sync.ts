const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const ROOT_FOLDER = 'GOBLET'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// In-memory cache: folderId per cache key (avoids redundant Drive queries per session)
const _folderCache: Record<string, string> = {}

async function apiFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  })
  if (!res.ok) throw new Error(`Drive API ${res.status}`)
  return res.json()
}

/**
 * Returns the id of a folder with `name` under `parentId` (or Drive root).
 * If the folder doesn't exist yet it is created. Never creates duplicates.
 */
async function getOrCreateFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const cacheKey = parentId ? `${parentId}/${name}` : name
  if (_folderCache[cacheKey]) return _folderCache[cacheKey]

  const parentClause = parentId
    ? ` and '${parentId}' in parents`
    : " and 'root' in parents"

  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  )
  const { files } = await apiFetch(
    accessToken,
    `${DRIVE_API}/files?q=${q}&fields=files(id)`
  )

  if (files.length > 0) {
    _folderCache[cacheKey] = files[0].id
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
  _folderCache[cacheKey] = folder.id
  return folder.id
}

/** Returns the id of GOBLET/{clientName}/, creating both folders if needed. */
async function getClientFolderId(
  accessToken: string,
  clientName: string
): Promise<string> {
  const rootId = await getOrCreateFolder(accessToken, ROOT_FOLDER)
  return getOrCreateFolder(accessToken, clientName, rootId)
}

/** Returns the id of GOBLET/{profesor}/{dia}/{horario}/{clientName}/, creating any missing folders. */
async function getRoutineFolderId(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  clientName: string
): Promise<string> {
  const rootId = await getOrCreateFolder(accessToken, ROOT_FOLDER)
  const profesorId = await getOrCreateFolder(accessToken, profesor, rootId)
  const diaId = await getOrCreateFolder(accessToken, dia, profesorId)
  const horarioId = await getOrCreateFolder(accessToken, horario, diaId)
  return getOrCreateFolder(accessToken, clientName, horarioId)
}

/** Returns the Drive file id of an existing file, or null. */
async function findFileId(
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

/** Uploads a single binary blob using multipart upload. Creates or replaces the file. */
async function uploadBinaryFile(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
  data: Uint8Array | Buffer,
  existingId?: string | null
): Promise<void> {
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
    ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(`Drive upload ${res.status}`)
}

/**
 * Uploads all photos to GOBLET/{clientName}/ as {clientName}_Foto_01.ext, _Foto_02.ext, ...
 * Extra photos from a previous save (if count decreased) are deleted.
 */
export async function writeClientPhotosToDrive(
  accessToken: string,
  clientName: string,
  photos: string[]
): Promise<void> {
  const folderId = await getClientFolderId(accessToken, clientName)

  // List existing photo files for this client
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
    const filename = `${clientName}_Foto_${String(i + 1).padStart(2, '0')}.${ext}`
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
 * Uploads an xlsx buffer to GOBLET/{clientName}/{clientName}_Evaluacion.xlsx.
 * If the file already exists it is replaced (PATCH); otherwise created (POST).
 */
export async function writeEvaluationXlsxToDrive(
  accessToken: string,
  clientName: string,
  buffer: Buffer
): Promise<void> {
  const folderId = await getClientFolderId(accessToken, clientName)
  const filename = `${clientName}_Evaluacion.xlsx`
  const existingId = await findFileId(accessToken, folderId, filename)
  await uploadBinaryFile(accessToken, folderId, filename, XLSX_MIME, buffer, existingId)
}

/**
 * Uploads an xlsx buffer to GOBLET/{profesor}/{dia}/{horario}/{clientName}/{clientName}_Rutina.xlsx.
 * If the file already exists it is replaced (PATCH); otherwise created (POST).
 */
export async function writeRoutineXlsxToDrive(
  accessToken: string,
  profesor: string,
  dia: string,
  horario: string,
  clientName: string,
  buffer: Buffer
): Promise<void> {
  const folderId = await getRoutineFolderId(accessToken, profesor, dia, horario, clientName)
  const filename = `${clientName}_Rutina.xlsx`
  const existingId = await findFileId(accessToken, folderId, filename)
  await uploadBinaryFile(accessToken, folderId, filename, XLSX_MIME, buffer, existingId)
}
