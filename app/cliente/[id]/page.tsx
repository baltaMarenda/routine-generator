'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, FileSpreadsheet, CloudUpload, Copy, User } from 'lucide-react'
import Link from 'next/link'
import { EvaluationBuilder } from '@/components/evaluation-builder'
import { RoutineBuilder } from '@/components/routine-builder'
import { EvaluationData, createEmptyEvaluation } from '@/lib/evaluation-types'
import { RoutineData, createInitialRoutineData } from '@/lib/types'
import { exportEvaluationToExcel } from '@/lib/evaluation-export'
import { exportRoutineToExcel } from '@/lib/excel-export'
import { AuthButton, SyncStatus } from '@/components/auth-button'
import { writeClientXlsxToDrive, writeClientPhotosToDrive } from '@/lib/drive-sync'

interface Client {
  id: string
  name: string
  createdAt: string
}

interface ClientPageProps {
  params: Promise<{ id: string }>
}

export default function ClientPage({ params }: ClientPageProps) {
  const resolvedParams = use(params)
  const searchParams = useSearchParams()
  const clientName = searchParams.get('name') || 'Cliente'
  const clientId = resolvedParams.id

  const { data: session } = useSession()
  const [evaluation, setEvaluation] = useState<EvaluationData>(createEmptyEvaluation())
  const [routine, setRoutine] = useState<RoutineData>(createInitialRoutineData())
  const [activeTab, setActiveTab] = useState('evaluacion')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [otherClients, setOtherClients] = useState<Client[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const savedEval = localStorage.getItem(`goblet_eval_${clientId}`)
    const savedRoutine = localStorage.getItem(`goblet_routine_${clientId}`)

    if (savedEval) {
      setEvaluation(JSON.parse(savedEval))
    } else {
      setEvaluation(prev => ({
        ...prev,
        patientData: { ...prev.patientData, nombreApellido: clientName },
      }))
    }

    if (savedRoutine) {
      setRoutine(JSON.parse(savedRoutine))
    } else {
      setRoutine(prev => ({
        ...prev,
        header: { ...prev.header, nombreApellido: clientName },
      }))
    }
  }, [clientId, clientName])

  // Auto-save to localStorage only
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(`goblet_eval_${clientId}`, JSON.stringify(evaluation))
    }, 500)
    return () => clearTimeout(timeout)
  }, [evaluation, clientId])

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(`goblet_routine_${clientId}`, JSON.stringify(routine))
    }, 500)
    return () => clearTimeout(timeout)
  }, [routine, clientId])

  const handleOpenCopyDialog = () => {
    const saved = localStorage.getItem('goblet_demo_clients')
    const all: Client[] = saved ? JSON.parse(saved) : []
    setOtherClients(all.filter(c => c.id !== clientId))
    setCopyDialogOpen(true)
  }

  const handleCopyRoutineFrom = (sourceClient: Client) => {
    const saved = localStorage.getItem(`goblet_routine_${sourceClient.id}`)
    if (!saved) return
    const sourceRoutine: RoutineData = JSON.parse(saved)
    setRoutine({ ...sourceRoutine, clientName })
    setCopyDialogOpen(false)
  }

  const handleSaveToDrive = async () => {
    if (!session?.accessToken) return
    setSyncStatus('saving')
    try {
      if (activeTab === 'evaluacion') {
        const buffer = await exportEvaluationToExcel(evaluation)
        await writeClientXlsxToDrive(session.accessToken, clientName, 'Evaluacion', buffer)
        if ((evaluation.registroFotografico ?? []).length > 0) {
          await writeClientPhotosToDrive(session.accessToken, clientName, evaluation.registroFotografico ?? [])
        }
      } else {
        const buffer = await exportRoutineToExcel(routine)
        await writeClientXlsxToDrive(session.accessToken, clientName, 'Rutina', buffer)
      }
      setSyncStatus('saved')
      setTimeout(() => setSyncStatus('idle'), 2500)
    } catch {
      setSyncStatus('error')
    }
  }

  const handleDownloadEvaluation = async () => {
    const buffer = await exportEvaluationToExcel(evaluation)
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${clientName}_Evaluacion.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadRoutine = async () => {
    const buffer = await exportRoutineToExcel(routine)
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${clientName}_Rutina.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/clientes">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">{clientName}</h1>
                <p className="text-sm text-muted-foreground">Ficha del cliente</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AuthButton syncStatus={syncStatus} />
              <Button onClick={activeTab === 'evaluacion' ? handleDownloadEvaluation : handleDownloadRoutine}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Descargar Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="evaluacion">Evaluacion</TabsTrigger>
            <TabsTrigger value="rutina">Rutina</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluacion">
            <EvaluationBuilder data={evaluation} onChange={setEvaluation} />
            {session && (
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleSaveToDrive}
                  disabled={syncStatus === 'saving'}
                  size="lg"
                >
                  <CloudUpload className="h-4 w-4 mr-2" />
                  {syncStatus === 'saving' ? 'Guardando...' : 'Guardar Evaluación en Drive'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rutina">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={handleOpenCopyDialog}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar rutina de otro cliente
              </Button>
            </div>
            <RoutineBuilder data={routine} onChange={setRoutine} />
            {session && (
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleSaveToDrive}
                  disabled={syncStatus === 'saving'}
                  size="lg"
                >
                  <CloudUpload className="h-4 w-4 mr-2" />
                  {syncStatus === 'saving' ? 'Guardando...' : 'Guardar Rutina en Drive'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Copy routine dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar rutina de otro cliente</DialogTitle>
          </DialogHeader>
          {otherClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay otros clientes con rutinas guardadas.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto py-2">
              {otherClients.map(client => {
                const hasRoutine = !!localStorage.getItem(`goblet_routine_${client.id}`)
                return (
                  <button
                    key={client.id}
                    onClick={() => handleCopyRoutineFrom(client)}
                    disabled={!hasRoutine}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {hasRoutine ? 'Rutina disponible' : 'Sin rutina guardada'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
