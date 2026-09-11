import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { leerBody, requireUser, ruta } from '@/lib/auth-server'
import { getDb, schema } from '@/lib/db'
import { obtenerAccesoRutina } from '@/lib/db/permisos'

type Ctx = { params: Promise<{ id: string }> }

const { rutinas, rutinaAccesos } = schema

const driveSchema = z.object({
  fileId: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/, 'Id de archivo de Drive inválido.'),
  webViewLink: z
    .string()
    .url()
    .refine(
      url => /^https:\/\/(docs|drive)\.google\.com\//.test(url),
      'El link no es de Google Drive.'
    ),
})

/**
 * Registra el archivo .xlsx que el navegador acaba de subir al Drive del usuario.
 * Cada profesor exporta a su propio Drive: la copia del creador va en `rutinas`
 * y la de cada profesor que la recibió, en su fila de `rutina_accesos`. Un admin
 * sin acceso propio exporta igual a su Drive, pero no queda registrado.
 */
export const POST = ruta<Ctx>(async (req, { params }) => {
  const usuario = await requireUser()
  const { id } = await params
  const { rutina } = await obtenerAccesoRutina(usuario, id)
  const { fileId, webViewLink } = await leerBody(req, driveSchema)
  const db = getDb()

  if (rutina.usuarioId === usuario.id) {
    await db
      .update(rutinas)
      .set({ googleDriveFileId: fileId, googleDriveLink: webViewLink })
      .where(eq(rutinas.id, rutina.id))
    return NextResponse.json({ guardado: true })
  }

  const actualizados = await db
    .update(rutinaAccesos)
    .set({ googleDriveFileId: fileId, googleDriveLink: webViewLink })
    .where(and(eq(rutinaAccesos.rutinaId, rutina.id), eq(rutinaAccesos.usuarioId, usuario.id)))
    .returning({ usuarioId: rutinaAccesos.usuarioId })

  return NextResponse.json({ guardado: actualizados.length > 0 })
})
