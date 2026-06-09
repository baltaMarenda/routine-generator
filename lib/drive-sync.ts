const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_NAME = 'GOBLET'

let _folderId: string | null = null

async function apiFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  })
  if (!res.ok) throw new Error(`Drive API ${res.status}`)
  return res.json()
}

async function getFolderId(accessToken: string): Promise<string> {
  if (_folderId) return _folderId

  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const { files } = await apiFetch(accessToken, `${DRIVE_API}/files?q=${q}&fields=files(id)`)

  if (files.length > 0) {
    _folderId = files[0].id
    return _folderId!
  }

  const folder = await apiFetch(accessToken, `${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  _folderId = folder.id
  return _folderId!
}

async function findFileId(accessToken: string, folderId: string, filename: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`)
  const { files } = await apiFetch(accessToken, `${DRIVE_API}/files?q=${q}&fields=files(id)`)
  return files.length > 0 ? files[0].id : null
}

export async function readFromDrive<T>(accessToken: string, filename: string): Promise<T | null> {
  try {
    const folderId = await getFolderId(accessToken)
    const fileId = await findFileId(accessToken, folderId, filename)
    if (!fileId) return null

    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function writeToDrive(accessToken: string, filename: string, data: unknown): Promise<void> {
  const folderId = await getFolderId(accessToken)
  const fileId = await findFileId(accessToken, folderId, filename)

  const boundary = 'goblet_boundary'
  const metadata = JSON.stringify(fileId ? {} : { name: filename, parents: [folderId] })
  const body = [
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(data),
    `--${boundary}--`,
  ].join('\r\n')

  const res = await fetch(
    fileId
      ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`,
    {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )
  if (!res.ok) throw new Error(`Drive write ${res.status}`)
}
