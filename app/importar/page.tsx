'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, CheckCircle, Cloud, Loader2, MinusCircle, XCircle } from 'lucide-react'
import { AuthButton } from '@/components/auth-button'
import { urlConectarDrive, useDrive } from '@/hooks/use-drive'
import { api, ApiError } from '@/lib/api-client'
import { comprimirImagen } from '@/lib/image-compress'
import {
  leerDatosAnteriores,
  leerFotosAnteriores,
  limpiarCacheAnterior,
  listarAlumnosAnteriores,
  type AlumnoAnterior,
} from '@/lib/legacy-drive-import'

interface Resultado {
  legacyId: string
  nombre: string
  estado: 'importado' | 'existente' | 'error'
  detalle?: string
}

const mensajeDeError = (err: unknown, porDefecto: string) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : porDefecto

export default function ImportarPage() {
  const drive = useDrive()
  const [alumnos, setAlumnos] = useState<AlumnoAnterior[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])

  const buscar = async () => {
    setBuscando(true)
    setError('')
    setResultados([])
    try {
      const accessToken = await drive.obtenerToken()
      setAlumnos(await listarAlumnosAnteriores(accessToken))
    } catch (err) {
      console.error('Error al buscar datos anteriores:', err)
      setError(mensajeDeError(err, 'No se pudieron leer los datos de Drive.'))
    } finally {
      setBuscando(false)
    }
  }

  /**
   * De a un alumno: crea alumno + evaluación + rutina en la BD y, si se creó en
   * este paso, sube sus fotos comprimidas. Uno que ya estaba importado se saltea.
   */
  const importar = async () => {
    if (!alumnos) return
    setImportando(true)
    setError('')
    setResultados([])
    const listos: string[] = []

    for (const anterior of alumnos) {
      try {
        const accessToken = await drive.obtenerToken()
        const datos = await leerDatosAnteriores(accessToken, anterior.legacyId)
        const res = await api<{ estado: 'importado' | 'existente'; alumnoId: string }>('/api/importar', {
          method: 'POST',
          json: {
            legacyId: anterior.legacyId,
            nombre: anterior.nombre,
            createdAt: anterior.createdAt,
            ...datos,
          },
        })

        let detalle: string | undefined
        if (res.estado === 'importado') {
          const fotos = await leerFotosAnteriores(accessToken, anterior.legacyId)
          let subidas = 0
          for (const foto of fotos) {
            try {
              const dataUrl = await comprimirImagen(foto)
              await api(`/api/alumnos/${res.alumnoId}/fotos`, { method: 'POST', json: { dataUrl } })
              subidas++
            } catch (err) {
              console.error(`No se pudo importar una foto de ${anterior.nombre}:`, err)
            }
          }
          if (fotos.length > 0) detalle = `${subidas} de ${fotos.length} fotos`
        }

        listos.push(anterior.legacyId)
        setResultados(prev => [...prev, { ...anterior, estado: res.estado, detalle }])
      } catch (err) {
        console.error(`Error al importar a ${anterior.nombre}:`, err)
        setResultados(prev => [
          ...prev,
          { ...anterior, estado: 'error', detalle: mensajeDeError(err, 'Error desconocido') },
        ])
      }
    }

    limpiarCacheAnterior(listos)
    setImportando(false)
  }

  const total = alumnos?.length ?? 0
  const terminado = !importando && resultados.length > 0
  const cuenta = (estado: Resultado['estado']) => resultados.filter(r => r.estado === estado).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/alumnos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Importar datos anteriores</h1>
              <p className="text-sm text-muted-foreground">Desde la versión de la app sin base de datos</p>
            </div>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Antes los alumnos se guardaban en <span className="font-mono">GOBLET/_datos/</span> de
              tu Google Drive. Esto los copia a la base de datos a tu nombre, con su evaluación,
              su rutina y sus fotos. Conectá la misma cuenta de Google que usabas.
            </p>
            <p className="text-sm text-muted-foreground">
              Se puede correr más de una vez: los alumnos que ya se importaron se saltean. Los
              archivos de Drive no se modifican.
            </p>

            {drive.estado === 'cargando' ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : drive.estado !== 'conectado' ? (
              <Button asChild>
                <a href={urlConectarDrive('/importar')}>
                  <Cloud className="h-4 w-4 mr-2" />
                  Conectar Drive
                </a>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => void buscar()} disabled={buscando || importando}>
                  {buscando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Buscar datos en {drive.email ?? 'Drive'}
                </Button>
                {alumnos && alumnos.length > 0 && (
                  <Button onClick={() => void importar()} disabled={importando || buscando}>
                    {importando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Importar {alumnos.length} {alumnos.length === 1 ? 'alumno' : 'alumnos'}
                  </Button>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {alumnos && alumnos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No se encontraron alumnos para importar en esta cuenta ni en este navegador.
              </p>
            )}

            {(importando || terminado) && (
              <div className="space-y-2">
                <Progress value={total ? (resultados.length / total) * 100 : 0} />
                <p className="text-sm text-muted-foreground">
                  {importando
                    ? `Importando ${resultados.length + 1} de ${total}...`
                    : `Listo: ${cuenta('importado')} importados, ${cuenta('existente')} ya estaban, ${cuenta('error')} con error.`}
                </p>
              </div>
            )}

            {resultados.length > 0 && (
              <ul className="divide-y divide-border border border-border rounded-md">
                {resultados.map(r => (
                  <li key={r.legacyId} className="flex items-center gap-3 px-3 py-2 text-sm">
                    {r.estado === 'importado' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : r.estado === 'existente' ? (
                      <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="flex-1 truncate">{r.nombre}</span>
                    <span className="text-xs text-muted-foreground text-right">
                      {r.estado === 'existente' ? 'Ya estaba importado' : r.detalle}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {terminado && (
              <Button asChild variant="outline">
                <Link href="/alumnos">Ir a los alumnos</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
