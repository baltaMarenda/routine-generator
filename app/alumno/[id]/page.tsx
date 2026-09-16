'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  CloudUpload,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Share2,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { EvaluationBuilder } from '@/components/evaluation-builder'
import { RoutineBuilder } from '@/components/routine-builder'
import { AuthButton, type SyncStatus } from '@/components/auth-button'
import { urlConectarDrive, useDrive } from '@/hooks/use-drive'
import { api, ApiError } from '@/lib/api-client'
import type { AccesosRutina, AlumnoDetalle, FotoDto, RutinaCopiable } from '@/lib/api-types'
import {
  deleteStudentFolderFromDrive,
  writeEvaluationXlsxToDrive,
  writeRoutineXlsxToDrive,
  writeStudentPhotosToDrive,
} from '@/lib/drive-sync'
import { EvaluationData, createEmptyEvaluation } from '@/lib/evaluation-types'
import { exportEvaluationToExcel } from '@/lib/evaluation-export'
import { exportRoutineToExcel } from '@/lib/excel-export'
import { comprimirImagen } from '@/lib/image-compress'
import { RoutineData, createInitialRoutineData } from '@/lib/types'

interface AlumnoPageProps {
  params: Promise<{ id: string }>
}

type Carga = 'cargando' | 'listo' | 'no-encontrado' | 'error'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const mensajeDeError = (err: unknown, porDefecto: string) =>
  err instanceof ApiError ? err.message : porDefecto

/** Lo que se guarda de la evaluación: las fotos van en su propia tabla. */
const evaluacionSinFotos = (evaluacion: EvaluationData): EvaluationData => ({
  ...evaluacion,
  registroFotografico: [],
})

function descargar(buffer: Buffer, filename: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AlumnoPage({ params }: AlumnoPageProps) {
  const { id: alumnoId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  // Cada profesor exporta a su propio Drive, en GOBLET/{profesor}/... La carpeta
  // "profesor" se guarda en el alumno; si nunca se eligió, arranca con su nombre.
  const nombreUsuario = session?.user?.nombre ?? ''
  const drive = useDrive()

  const [carga, setCarga] = useState<Carga>('cargando')
  const [alumno, setAlumno] = useState<AlumnoDetalle['alumno'] | null>(null)
  const [rutinaId, setRutinaId] = useState<string | null>(null)
  const [rutinaNombre, setRutinaNombre] = useState('')
  const [accesos, setAccesos] = useState<AccesosRutina | null>(null)
  const [miDriveLink, setMiDriveLink] = useState<string | null>(null)
  const [puedeEliminar, setPuedeEliminar] = useState(false)

  const [evaluation, setEvaluation] = useState<EvaluationData>(createEmptyEvaluation())
  const [routine, setRoutine] = useState<RoutineData>(createInitialRoutineData())
  const [fotos, setFotos] = useState<FotoDto[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(0)
  const [fotosError, setFotosError] = useState('')

  const [activeTab, setActiveTab] = useState('evaluacion')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [autoSync, setAutoSync] = useState<SyncStatus>('idle')
  const [driveError, setDriveError] = useState('')

  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copiables, setCopiables] = useState<RutinaCopiable[] | null>(null)
  const [copyLoadingId, setCopyLoadingId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')

  const [shareOpen, setShareOpen] = useState(false)
  const [shareUsername, setShareUsername] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareOk, setShareOk] = useState('')

  // Which save is waiting on the día/horario dialog, if any
  const [pendingSave, setPendingSave] = useState<'evaluacion' | 'rutina' | null>(null)
  const [profesor, setProfesor] = useState('')
  const [dia, setDia] = useState('')
  const [horario, setHorario] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Una vez eliminado el alumno, ningún autoguardado pendiente debe volver a
  // escribirlo antes de que la navegación desmonte la página.
  const deletedRef = useRef(false)
  // Lo último que quedó guardado en la BD: el autoguardado sólo manda lo que cambió.
  const lastEvalRef = useRef<string | null>(null)
  const lastRoutineRef = useRef<string | null>(null)
  const lastNombreRef = useRef<string | null>(null)

  // 1) Carga desde la BD. Los editores no se muestran hasta que termina, así que
  //    no hay forma de que una edición quede pisada por datos que llegan tarde.
  const cargar = useCallback(async () => {
    setCarga('cargando')
    try {
      const [detalle, { fotos }] = await Promise.all([
        api<AlumnoDetalle>(`/api/alumnos/${alumnoId}`),
        api<{ fotos: FotoDto[] }>(`/api/alumnos/${alumnoId}/fotos`),
      ])

      const vacia = createEmptyEvaluation()
      const evaluacion =
        detalle.evaluacion ?? {
          ...vacia,
          patientData: { ...vacia.patientData, nombreApellido: detalle.alumno.nombre },
        }

      setAlumno(detalle.alumno)
      setRutinaId(detalle.rutina.id)
      setRutinaNombre(detalle.rutina.nombre)
      setAccesos(detalle.accesos)
      setMiDriveLink(detalle.miDriveLink)
      setPuedeEliminar(detalle.puedeEliminar)
      setEvaluation(evaluacion)
      setRoutine(detalle.rutina.datos)
      setFotos(fotos)
      setProfesor(detalle.alumno.profesor ?? '')
      setDia(detalle.alumno.dia ?? '')
      setHorario(detalle.alumno.horario ?? '')

      lastEvalRef.current = JSON.stringify(evaluacionSinFotos(evaluacion))
      lastRoutineRef.current = JSON.stringify(detalle.rutina.datos)
      lastNombreRef.current = detalle.rutina.nombre
      setCarga('listo')
    } catch (err) {
      console.error('Error al cargar el alumno:', err)
      setCarga(err instanceof ApiError && err.status === 404 ? 'no-encontrado' : 'error')
    }
  }, [alumnoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  /** Manda a la BD lo que cambió desde el último guardado. */
  const guardarCambios = useCallback(async () => {
    if (deletedRef.current || !rutinaId) return

    const evalDatos = evaluacionSinFotos(evaluation)
    const evalJson = JSON.stringify(evalDatos)
    const routineJson = JSON.stringify(routine)
    const nombre = rutinaNombre.trim()

    const tareas: Promise<void>[] = []

    if (evalJson !== lastEvalRef.current) {
      tareas.push(
        api(`/api/alumnos/${alumnoId}/evaluacion`, { method: 'PUT', json: { datos: evalDatos } }).then(
          () => {
            lastEvalRef.current = evalJson
          }
        )
      )
    }

    const cambiosRutina: { datos?: RoutineData; nombre?: string } = {}
    if (routineJson !== lastRoutineRef.current) cambiosRutina.datos = routine
    if (nombre && nombre !== lastNombreRef.current) cambiosRutina.nombre = nombre
    if (cambiosRutina.datos || cambiosRutina.nombre) {
      tareas.push(
        api(`/api/rutinas/${rutinaId}`, { method: 'PUT', json: cambiosRutina }).then(() => {
          lastRoutineRef.current = routineJson
          if (cambiosRutina.nombre) lastNombreRef.current = nombre
        })
      )
    }

    if (tareas.length === 0) return

    setAutoSync('saving')
    try {
      await Promise.all(tareas)
      setAutoSync('saved')
      setTimeout(() => setAutoSync('idle'), 2000)
    } catch (err) {
      setAutoSync('error')
      throw err
    }
  }, [alumnoId, rutinaId, evaluation, routine, rutinaNombre])

  // 2) Autoguardado en la BD, 1,5 s después del último cambio.
  useEffect(() => {
    if (carga !== 'listo') return
    const timeout = setTimeout(() => {
      guardarCambios().catch(err => console.error('Error al autoguardar:', err))
    }, 1500)
    return () => clearTimeout(timeout)
  }, [carga, guardarCambios])

  // 3) Al salir de la página (volver al listado) se guarda lo que haya quedado
  //    pendiente del debounce, en vez de perderlo.
  const guardarRef = useRef(guardarCambios)
  useEffect(() => {
    guardarRef.current = guardarCambios
  }, [guardarCambios])
  useEffect(() => {
    return () => {
      guardarRef.current().catch(err => console.error('Error al guardar al salir:', err))
    }
  }, [])

  /**
   * Las fotos se comprimen y se suben de a una. Cada una que llega se agrega a la
   * lista con un update funcional, así elegir varias juntas no deja sólo la última.
   */
  const handleAddPhotos = async (files: File[]) => {
    if (files.length === 0) return
    setFotosError('')
    setSubiendoFotos(n => n + files.length)

    for (const file of files) {
      try {
        const dataUrl = await comprimirImagen(file)
        const { id } = await api<{ id: string }>(`/api/alumnos/${alumnoId}/fotos`, {
          method: 'POST',
          json: { dataUrl },
        })
        setFotos(prev => [...prev, { id, dataUrl }])
      } catch (err) {
        console.error('Error al guardar una foto:', err)
        setFotosError(mensajeDeError(err, `No se pudo guardar la foto ${file.name}.`))
      } finally {
        setSubiendoFotos(n => n - 1)
      }
    }
  }

  const handleRemovePhoto = async (fotoId: string) => {
    setFotosError('')
    try {
      await api(`/api/alumnos/${alumnoId}/fotos/${fotoId}`, { method: 'DELETE' })
      setFotos(prev => prev.filter(f => f.id !== fotoId))
    } catch (err) {
      setFotosError(mensajeDeError(err, 'No se pudo eliminar la foto.'))
    }
  }

  const handleOpenCopyDialog = async () => {
    setCopyError('')
    setCopiables(null)
    setCopyDialogOpen(true)
    try {
      const { rutinas } = await api<{ rutinas: RutinaCopiable[] }>('/api/rutinas/copiables')
      setCopiables(rutinas.filter(r => r.alumnoId !== alumnoId))
    } catch (err) {
      setCopiables([])
      setCopyError(mensajeDeError(err, 'No se pudieron listar las rutinas.'))
    }
  }

  const handleCopyRoutineFrom = async (origen: RutinaCopiable) => {
    setCopyError('')
    setCopyLoadingId(origen.id)
    try {
      const { datos } = await api<{ datos: RoutineData }>(`/api/rutinas/${origen.id}`)
      setRoutine({ ...datos, clientName: alumno?.nombre ?? datos.clientName })
      setCopyDialogOpen(false)
    } catch (err) {
      setCopyError(mensajeDeError(err, 'No se pudo leer la rutina.'))
    } finally {
      setCopyLoadingId(null)
    }
  }

  const handleShare = async () => {
    const username = shareUsername.trim()
    if (!username || !rutinaId) return

    setSharing(true)
    setShareError('')
    setShareOk('')
    try {
      const nuevos = await api<AccesosRutina>(`/api/rutinas/${rutinaId}/accesos`, {
        method: 'POST',
        json: { username },
      })
      setAccesos(nuevos)
      setShareUsername('')
      setShareOk(`Listo: @${username.toLowerCase()} ya puede ver y editar la rutina.`)
    } catch (err) {
      setShareError(mensajeDeError(err, 'No se pudo compartir la rutina.'))
    } finally {
      setSharing(false)
    }
  }

  // Evaluation and routine both land in GOBLET/{profesor}/{dia}/{horario}/{alumno}/
  // of the logged-in user's own Drive.
  const handleConfirmSave = async () => {
    if (!pendingSave || !alumno) return
    const profesorLimpio = profesor.trim()
    const diaLimpio = dia.trim()
    const horarioLimpio = horario.trim()
    if (!profesorLimpio || !diaLimpio || !horarioLimpio) return

    const target = pendingSave
    const carpeta = [profesorLimpio, diaLimpio, horarioLimpio] as const
    setPendingSave(null)
    setSyncStatus('saving')
    setDriveError('')
    try {
      const accessToken = await drive.obtenerToken()

      // Guardado explícito: la BD queda al día sin esperar al autoguardado.
      await guardarCambios()
      if (
        profesorLimpio !== (alumno.profesor ?? '') ||
        diaLimpio !== (alumno.dia ?? '') ||
        horarioLimpio !== (alumno.horario ?? '')
      ) {
        const carpetaNueva = { profesor: profesorLimpio, dia: diaLimpio, horario: horarioLimpio }
        await api(`/api/alumnos/${alumnoId}`, { method: 'PATCH', json: carpetaNueva })
        setAlumno(prev => prev && { ...prev, ...carpetaNueva })
      }

      if (target === 'evaluacion') {
        const dataUrls = fotos.map(f => f.dataUrl)
        const buffer = await exportEvaluationToExcel({ ...evaluation, registroFotografico: dataUrls })
        await writeEvaluationXlsxToDrive(accessToken, ...carpeta, alumno.nombre, buffer)
        if (dataUrls.length > 0) {
          await writeStudentPhotosToDrive(accessToken, ...carpeta, alumno.nombre, dataUrls)
        }
      } else {
        const buffer = await exportRoutineToExcel(routine)
        const archivo = await writeRoutineXlsxToDrive(accessToken, ...carpeta, alumno.nombre, buffer)
        // Registra en la BD el archivo que devolvió Drive (id + webViewLink).
        if (rutinaId && archivo.webViewLink) {
          const { guardado } = await api<{ guardado: boolean }>(`/api/rutinas/${rutinaId}/drive`, {
            method: 'POST',
            json: { fileId: archivo.id, webViewLink: archivo.webViewLink },
          })
          if (guardado) setMiDriveLink(archivo.webViewLink)
        }
      }
      setSyncStatus('saved')
      setTimeout(() => setSyncStatus('idle'), 2500)
      toast.success(
        target === 'evaluacion' ? 'Evaluación guardada exitosamente' : 'Rutina guardada exitosamente',
        { description: 'Se guardó en la base de datos y el Excel quedó en tu Drive.' }
      )
    } catch (err) {
      console.error(`Error al guardar ${target} en Drive:`, err)
      setSyncStatus('error')
      setDriveError(
        mensajeDeError(err, 'No se pudo guardar en Drive. Revisá la conexión e intentá de nuevo.')
      )
    }
  }

  /**
   * Borra al alumno de la BD (con su evaluación, fotos, rutina y accesos) y vuelve
   * al listado. La carpeta del Drive de quien lo elimina va a la papelera; las
   * copias que otros profesores hayan exportado a sus Drive quedan donde están.
   */
  const handleDeleteStudent = async () => {
    if (!alumno) return
    setDeleting(true)
    setDeleteError('')
    // Frenamos los autoguardados antes de borrar.
    deletedRef.current = true

    try {
      await api(`/api/alumnos/${alumnoId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Error al eliminar el alumno:', err)
      deletedRef.current = false
      setDeleteError(mensajeDeError(err, 'No se pudo eliminar el alumno. Revisá la conexión e intentá de nuevo.'))
      setDeleting(false)
      return
    }

    const carpetaProfesor = alumno.profesor || nombreUsuario
    if (drive.estado === 'conectado' && carpetaProfesor && alumno.dia && alumno.horario) {
      try {
        const accessToken = await drive.obtenerToken()
        await deleteStudentFolderFromDrive(accessToken, carpetaProfesor, alumno.dia, alumno.horario, alumno.nombre)
      } catch (err) {
        console.error('No se pudo mandar a la papelera la carpeta de Drive:', err)
      }
    }

    setDeleteDialogOpen(false)
    router.push('/alumnos')
  }

  const handleDownload = async () => {
    const nombre = alumno?.nombre ?? 'Alumno'
    if (activeTab === 'evaluacion') {
      const fotosActuales = fotos.map(f => f.dataUrl)
      descargar(
        await exportEvaluationToExcel({ ...evaluation, registroFotografico: fotosActuales }),
        `${nombre}_Evaluacion.xlsx`
      )
      toast.success('Excel de la evaluación descargado exitosamente')
    } else {
      descargar(await exportRoutineToExcel(routine), `${nombre}_Rutina.xlsx`)
      toast.success('Excel de la rutina descargado exitosamente')
    }
  }

  const nombreAlumno = alumno?.nombre ?? 'Alumno'
  const compartidoPor =
    accesos && session?.user && accesos.creador.username !== session.user.username
      ? accesos.creador.nombre
      : null

  const botonGuardarEnDrive = (target: 'evaluacion' | 'rutina', etiqueta: string) => {
    if (drive.estado === 'cargando') return null
    if (drive.estado !== 'conectado') {
      return (
        <Button asChild variant="outline" size="lg">
          <a href={urlConectarDrive(`/alumno/${alumnoId}`)}>
            <Cloud className="h-4 w-4 mr-2" />
            Conectar Drive para exportar
          </a>
        </Button>
      )
    }
    return (
      <Button
        onClick={() => {
          setDriveError('')
          setProfesor(prev => prev.trim() ? prev : nombreUsuario)
          setPendingSave(target)
        }}
        disabled={syncStatus === 'saving'}
        size="lg"
      >
        <CloudUpload className="h-4 w-4 mr-2" />
        {syncStatus === 'saving' ? 'Guardando...' : etiqueta}
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/alumnos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">{nombreAlumno}</h1>
                <p className="text-sm text-muted-foreground truncate">
                  {compartidoPor ? `Ficha compartida por ${compartidoPor}` : 'Ficha del alumno'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* El guardado explícito manda sobre el autoguardado en el indicador. */}
              <AuthButton syncStatus={syncStatus !== 'idle' ? syncStatus : autoSync} />
              {carga === 'listo' && (
                <Button onClick={() => void handleDownload()}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {carga === 'cargando' ? (
          <Card className="text-center py-16">
            <CardContent>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando ficha...</p>
            </CardContent>
          </Card>
        ) : carga === 'no-encontrado' ? (
          <Card className="text-center py-16">
            <CardContent>
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontró el alumno</h3>
              <p className="text-muted-foreground mb-6">
                Puede que lo hayan eliminado o que no tengas acceso a su ficha.
              </p>
              <Button asChild variant="outline">
                <Link href="/alumnos">Volver a los alumnos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : carga === 'error' ? (
          <Card className="text-center py-16">
            <CardContent>
              <CloudOff className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se pudo cargar la ficha</h3>
              <p className="text-muted-foreground mb-6">Revisá la conexión y volvé a intentar.</p>
              <Button variant="outline" onClick={() => void cargar()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="evaluacion">Evaluacion</TabsTrigger>
                <TabsTrigger value="rutina">Rutina</TabsTrigger>
              </TabsList>

              {puedeEliminar && (
                <Button
                  variant="outline"
                  onClick={() => { setDeleteError(''); setDeleteDialogOpen(true) }}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Alumno
                </Button>
              )}
            </div>

            {driveError && <p className="text-sm text-destructive mb-4">{driveError}</p>}

            <TabsContent value="evaluacion">
              {fotosError && <p className="text-sm text-destructive mb-4">{fotosError}</p>}
              <EvaluationBuilder
                data={evaluation}
                onChange={setEvaluation}
                fotos={fotos}
                subiendoFotos={subiendoFotos}
                onAddPhotos={(files) => void handleAddPhotos(files)}
                onRemovePhoto={(fotoId) => void handleRemovePhoto(fotoId)}
              />
              <div className="mt-8 flex justify-end">
                {botonGuardarEnDrive('evaluacion', 'Guardar Evaluación en Drive')}
              </div>
            </TabsContent>

            <TabsContent value="rutina">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                <div className="space-y-1.5 w-full lg:max-w-sm">
                  <label htmlFor="rutina-nombre" className="text-sm font-medium">
                    Nombre de la rutina
                  </label>
                  <Input
                    id="rutina-nombre"
                    value={rutinaNombre}
                    onChange={(e) => setRutinaNombre(e.target.value)}
                    placeholder="Ej: Rutina de Hipertrofia A"
                    maxLength={200}
                  />
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {miDriveLink && (
                    <Button asChild variant="outline" size="sm">
                      <a href={miDriveLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir en Drive
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShareError('')
                      setShareOk('')
                      setShareOpen(true)
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir con otro profesor
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleOpenCopyDialog()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar rutina de otro alumno
                  </Button>
                </div>
              </div>
              <RoutineBuilder data={routine} onChange={setRoutine} />
              <div className="mt-8 flex justify-end">
                {botonGuardarEnDrive('rutina', 'Guardar Rutina en Drive')}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Copy routine dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar rutina de otro alumno</DialogTitle>
            <DialogDescription>
              Reemplaza la rutina de {nombreAlumno} por una copia de la que elijas.
            </DialogDescription>
          </DialogHeader>
          {copiables === null ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : copiables.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay otras rutinas para copiar.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto py-2">
              {copiables.map(origen => (
                <button
                  key={origen.id}
                  onClick={() => void handleCopyRoutineFrom(origen)}
                  disabled={copyLoadingId !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center shrink-0">
                    {copyLoadingId === origen.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{origen.alumnoNombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{origen.nombre}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {copyError && <p className="text-sm text-destructive">{copyError}</p>}
        </DialogContent>
      </Dialog>

      {/* Compartir la rutina: suma el acceso del otro profesor sin quitar el propio */}
      <Dialog open={shareOpen} onOpenChange={(open) => { if (!sharing) setShareOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir rutina</DialogTitle>
            <DialogDescription>
              El profesor va a poder ver y editar la rutina y la ficha de {nombreAlumno}. Vos no
              perdés el acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleShare()}
                placeholder="Usuario del profesor"
                autoCapitalize="none"
                autoComplete="off"
                autoFocus
              />
              <Button onClick={() => void handleShare()} disabled={sharing || !shareUsername.trim()}>
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Compartir'}
              </Button>
            </div>
            {shareError && <p className="text-sm text-destructive">{shareError}</p>}
            {shareOk && <p className="text-sm text-green-600">{shareOk}</p>}

            {accesos && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Con acceso</p>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {accesos.creador.nombre}{' '}
                      <span className="text-muted-foreground">@{accesos.creador.username}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">Creó la rutina</span>
                  </li>
                  {accesos.compartidos.map(persona => (
                    <li key={persona.username} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        {persona.nombre}{' '}
                        <span className="text-muted-foreground">@{persona.username}</span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Compartida por {persona.otorgadoPor}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado: se lleva puesto todo lo del alumno */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteDialogOpen(false) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar alumno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              Se va a eliminar a <span className="font-medium">{nombreAlumno}</span> con su
              evaluación, su rutina y sus fotos, para vos y para los profesores con los que se
              compartió.
            </p>
            <p className="text-sm text-muted-foreground">
              Si lo exportaste a tu Drive, esa carpeta queda en la papelera de Drive por si
              necesitás recuperarla.
            </p>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleDeleteStudent()}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Día/horario, asked before saving anything to Drive */}
      <Dialog open={pendingSave !== null} onOpenChange={(open) => { if (!open) setPendingSave(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Datos de entrenamiento</DialogTitle>
            <DialogDescription>
              Se guarda en tu Drive, en GOBLET/{profesor.trim() || 'profesor'}/{dia.trim() || 'día'}/
              {horario.trim() || 'horario'}/{nombreAlumno}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Profesor</label>
              <Input
                value={profesor}
                onChange={(e) => setProfesor(e.target.value)}
                placeholder="Ej: Juan"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Día</label>
              <Input
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                placeholder="Ej: Lunes"
                maxLength={50}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Horario</label>
              <Input
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ej: 18:00"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingSave(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConfirmSave()}
              disabled={!profesor.trim() || !dia.trim() || !horario.trim()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
