'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, User, CloudOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AuthButton } from '@/components/auth-button'
import { api, ApiError } from '@/lib/api-client'
import type { AlumnoResumen } from '@/lib/api-types'

type LoadState = 'loading' | 'ready' | 'error'

const ordenarPorNombre = (lista: AlumnoResumen[]) =>
  [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

export default function AlumnosPage() {
  const { data: session } = useSession()
  const esAdmin = session?.user?.esAdmin ?? false

  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveError, setSaveError] = useState('')
  const [search, setSearch] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creando, setCreando] = useState(false)

  // La BD decide qué alumnos ve cada uno: los propios, los de rutinas que le
  // compartieron, o todos si es admin.
  const cargarAlumnos = useCallback(async () => {
    setLoadState('loading')
    try {
      const { alumnos } = await api<{ alumnos: AlumnoResumen[] }>('/api/alumnos')
      setAlumnos(alumnos)
      setLoadState('ready')
    } catch (err) {
      console.error('Error al cargar los alumnos:', err)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void cargarAlumnos()
  }, [cargarAlumnos])

  const handleCrearAlumno = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre || creando) return

    setCreando(true)
    setSaveError('')
    try {
      const { id } = await api<{ id: string }>('/api/alumnos', { method: 'POST', json: { nombre } })
      setAlumnos(prev =>
        ordenarPorNombre([
          ...prev,
          {
            id,
            nombre,
            createdAt: new Date().toISOString(),
            creador: session?.user?.nombre ?? '',
            esPropio: true,
          },
        ])
      )
      setNuevoNombre('')
      setIsDialogOpen(false)
    } catch (err) {
      console.error('Error al crear el alumno:', err)
      setSaveError(err instanceof ApiError ? err.message : 'No se pudo crear el alumno.')
    } finally {
      setCreando(false)
    }
  }

  const filteredAlumnos = alumnos.filter(alumno =>
    alumno.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">GOBLET</h1>
              <p className="text-xs text-primary">FUERZA & MOVIMIENTO</p>
            </div>
          </div>

          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Alumnos</h2>
          <p className="text-muted-foreground">
            {esAdmin
              ? 'Todos los alumnos del gimnasio'
              : 'Tus alumnos y los que otros profesores te compartieron'}
          </p>
        </div>

        {loadState === 'error' ? (
          <Card className="text-center py-16">
            <CardContent>
              <CloudOff className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se pudieron cargar los alumnos</h3>
              <p className="text-muted-foreground mb-6">
                Revisá la conexión y volvé a intentar.
              </p>
              <Button variant="outline" onClick={() => void cargarAlumnos()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alumno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  if (creando) return
                  setSaveError('')
                  setIsDialogOpen(open)
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Alumno
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo alumno</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                    <Input
                      placeholder="Nombre del alumno"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleCrearAlumno()}
                      autoFocus
                    />
                    {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={creando}>
                      Cancelar
                    </Button>
                    <Button onClick={() => void handleCrearAlumno()} disabled={!nuevoNombre.trim() || creando}>
                      {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadState === 'loading' ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Cargando alumnos...</p>
                </CardContent>
              </Card>
            ) : filteredAlumnos.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {search ? 'No se encontraron alumnos' : 'No hay alumnos aún'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {search ? 'Intenta con otro término de búsqueda' : 'Crea tu primer alumno para comenzar'}
                  </p>
                  {!search && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer alumno
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAlumnos.map(alumno => (
                  <Link key={alumno.id} href={`/alumno/${alumno.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer group h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary transition-colors shrink-0">
                            <User className="h-6 w-6 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{alumno.nombre}</h3>
                            <p className="text-sm text-muted-foreground">
                              Creado: {new Date(alumno.createdAt).toLocaleDateString('es-AR')}
                            </p>
                            {!alumno.esPropio && (
                              <Badge variant="secondary" className="mt-1.5 max-w-full truncate">
                                {esAdmin ? `Creado por ${alumno.creador}` : `Compartido por ${alumno.creador}`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
