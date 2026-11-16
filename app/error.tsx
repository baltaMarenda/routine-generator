'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Si algo falla al dibujar una página, se muestra esto en vez de la pantalla
 * negra de Next. Lo que ya estaba en la BD no se pierde: el autoguardado
 * guarda cada 1,5 s.
 */
export default function ErrorPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error en la página:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <TriangleAlert className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold">Algo salió mal</h1>
        <p className="text-muted-foreground">
          Los cambios se guardan solos cada pocos segundos, así que no deberías haber perdido nada. Volvé a intentar y, si vuelve a pasar, desactivá
          el traductor del navegador para esta página.
        </p>
        <p className="text-xs text-muted-foreground break-all">
          {error.message}
          {error.digest && ` (${error.digest})`}
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => reset()}>Reintentar</Button>
          <Button asChild variant="outline">
            <Link href="/alumnos">Volver a los alumnos</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
