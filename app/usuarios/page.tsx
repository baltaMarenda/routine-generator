'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, CloudOff, KeyRound, Loader2, Plus, ShieldAlert } from 'lucide-react'
import { AuthButton } from '@/components/auth-button'
import { api, ApiError } from '@/lib/api-client'
import type { UsuarioDto } from '@/lib/api-types'

type Carga = 'cargando' | 'listo' | 'prohibido' | 'error'

const mensajeDeError = (err: unknown, porDefecto: string) =>
  err instanceof ApiError ? err.message : porDefecto

const NUEVO_VACIO = { username: '', nombre: '', password: '' }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([])
  const [carga, setCarga] = useState<Carga>('cargando')
  const [aviso, setAviso] = useState('')
  const [accionError, setAccionError] = useState('')
  const [cambiandoId, setCambiandoId] = useState<string | null>(null)

  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [nuevoError, setNuevoError] = useState('')
  const [creando, setCreando] = useState(false)

  const [reseteando, setReseteando] = useState<UsuarioDto | null>(null)
  const [passwordTemporal, setPasswordTemporal] = useState('')
  const [resetError, setResetError] = useState('')
  const [guardandoReset, setGuardandoReset] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const { usuarios } = await api<{ usuarios: UsuarioDto[] }>('/api/usuarios')
      setUsuarios(usuarios)
      setCarga('listo')
    } catch (err) {
      console.error('Error al cargar los usuarios:', err)
      setCarga(err instanceof ApiError && err.status === 403 ? 'prohibido' : 'error')
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const handleCrear = async () => {
    setCreando(true)
    setNuevoError('')
    try {
      await api('/api/usuarios', { method: 'POST', json: nuevo })
      setAviso(
        `Se creó a ${nuevo.nombre.trim()}. Pasale su usuario y contraseña: la va a tener que cambiar la primera vez que entre.`
      )
      setNuevo(NUEVO_VACIO)
      setNuevoOpen(false)
      await cargar()
    } catch (err) {
      setNuevoError(mensajeDeError(err, 'No se pudo crear el usuario.'))
    } finally {
      setCreando(false)
    }
  }

  const handleReset = async () => {
    if (!reseteando) return
    setGuardandoReset(true)
    setResetError('')
    try {
      await api(`/api/usuarios/${reseteando.id}/reset-password`, {
        method: 'POST',
        json: { passwordTemporal },
      })
      setAviso(
        `Listo. Pasale la contraseña temporal a ${reseteando.nombre}: la va a tener que cambiar al entrar.`
      )
      setReseteando(null)
      setPasswordTemporal('')
      await cargar()
    } catch (err) {
      setResetError(mensajeDeError(err, 'No se pudo resetear la contraseña.'))
    } finally {
      setGuardandoReset(false)
    }
  }

  const handleCambiarActivo = async (usuario: UsuarioDto) => {
    setCambiandoId(usuario.id)
    setAccionError('')
    try {
      await api(`/api/usuarios/${usuario.id}`, { method: 'PATCH', json: { activo: !usuario.activo } })
      await cargar()
    } catch (err) {
      setAccionError(mensajeDeError(err, 'No se pudo actualizar el usuario.'))
    } finally {
      setCambiandoId(null)
    }
  }

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
              <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
              <p className="text-sm text-muted-foreground">Profesores que usan el sistema</p>
            </div>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {carga === 'cargando' ? (
          <Card className="text-center py-16">
            <CardContent>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            </CardContent>
          </Card>
        ) : carga === 'prohibido' ? (
          <Card className="text-center py-16">
            <CardContent>
              <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sólo el administrador puede ver esta página</h3>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/alumnos">Volver a los alumnos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : carga === 'error' ? (
          <Card className="text-center py-16">
            <CardContent>
              <CloudOff className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se pudieron cargar los usuarios</h3>
              <Button variant="outline" onClick={() => void cargar()} className="mt-4">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <p className="text-sm text-muted-foreground max-w-xl">
                Cada profesor ve sólo sus alumnos y las rutinas que le compartieron. Los
                administradores se asignan desde la base de datos.
              </p>
              <Button
                onClick={() => {
                  setNuevoError('')
                  setNuevoOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo profesor
              </Button>
            </div>

            {aviso && <p className="text-sm text-green-600 mb-4">{aviso}</p>}
            {accionError && <p className="text-sm text-destructive mb-4">{accionError}</p>}

            <Card className="py-0">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Drive</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(usuario => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">@{usuario.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {usuario.esAdmin && <Badge>Admin</Badge>}
                            {usuario.activo ? (
                              <Badge variant="secondary">Activo</Badge>
                            ) : (
                              <Badge variant="outline">Inactivo</Badge>
                            )}
                            {usuario.debeCambiarPassword && (
                              <Badge variant="outline">Debe cambiar contraseña</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {usuario.googleEmail ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {usuario.esAdmin ? (
                            <span className="text-xs text-muted-foreground">Se gestiona desde la BD</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setResetError('')
                                  setPasswordTemporal('')
                                  setReseteando(usuario)
                                }}
                              >
                                <KeyRound className="h-4 w-4 mr-1" />
                                Resetear contraseña
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={cambiandoId === usuario.id}
                                onClick={() => void handleCambiarActivo(usuario)}
                              >
                                {cambiandoId === usuario.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : usuario.activo ? (
                                  'Desactivar'
                                ) : (
                                  'Activar'
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Alta de profesor */}
      <Dialog open={nuevoOpen} onOpenChange={(open) => { if (!creando) setNuevoOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo profesor</DialogTitle>
            <DialogDescription>
              La contraseña inicial la va a tener que cambiar la primera vez que entre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-nombre">Nombre</Label>
              <Input
                id="nuevo-nombre"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                placeholder="Ej: Juan Pérez"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-username">Usuario</Label>
              <Input
                id="nuevo-username"
                value={nuevo.username}
                onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })}
                placeholder="Ej: jperez"
                autoCapitalize="none"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Letras, números, punto, guion o guion bajo. Con este usuario le comparten rutinas.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-password">Contraseña inicial</Label>
              <Input
                id="nuevo-password"
                type="text"
                value={nuevo.password}
                onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">Al menos 8 caracteres.</p>
            </div>
            {nuevoError && <p className="text-sm text-destructive">{nuevoError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevoOpen(false)} disabled={creando}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCrear()}
              disabled={creando || !nuevo.nombre.trim() || !nuevo.username.trim() || !nuevo.password}
            >
              {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reseteo de contraseña */}
      <Dialog
        open={reseteando !== null}
        onOpenChange={(open) => { if (!open && !guardandoReset) setReseteando(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
            <DialogDescription>
              {reseteando?.nombre} va a entrar con esta contraseña temporal y tendrá que elegir una
              nueva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="password-temporal">Contraseña temporal</Label>
            <Input
              id="password-temporal"
              type="text"
              value={passwordTemporal}
              onChange={(e) => setPasswordTemporal(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Al menos 8 caracteres.</p>
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReseteando(null)} disabled={guardandoReset}>
              Cancelar
            </Button>
            <Button onClick={() => void handleReset()} disabled={guardandoReset || !passwordTemporal}>
              {guardandoReset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
