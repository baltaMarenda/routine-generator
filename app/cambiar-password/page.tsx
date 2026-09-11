'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'

export default function CambiarPasswordPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  // Primer ingreso o contraseña reseteada por el admin: no se puede saltear.
  const obligatorio = session?.user?.debeCambiarPassword ?? false

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (nueva !== repetida) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await api('/api/cuenta/password', { method: 'POST', json: { actual, nueva } })
      // Refresca el JWT desde la BD: sin esto proxy.ts nos seguiría mandando acá.
      await update()
      router.replace('/alumnos')
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">G</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">GOBLET</h1>
          <p className="text-xs text-primary">FUERZA & MOVIMIENTO</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent>
          <h2 className="text-lg font-semibold mb-1">Cambiar contraseña</h2>
          {obligatorio && (
            <p className="text-sm text-muted-foreground mb-4">
              Antes de seguir tenés que elegir una contraseña nueva. Como contraseña actual usá la
              que te pasó el administrador.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="actual">Contraseña actual</Label>
              <Input
                id="actual"
                type="password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nueva">Contraseña nueva</Label>
              <Input
                id="nueva"
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Al menos 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repetida">Repetí la contraseña nueva</Label>
              <Input
                id="repetida"
                type="password"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !actual || !nueva || !repetida}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar contraseña'}
            </Button>
          </form>

          <div className="flex justify-between mt-4 text-sm">
            {obligatorio ? (
              <span />
            ) : (
              <Link href="/alumnos" className="text-muted-foreground hover:text-foreground">
                Volver
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="text-muted-foreground hover:text-foreground"
            >
              Salir
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
