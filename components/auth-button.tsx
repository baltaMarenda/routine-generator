'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AuthButtonProps {
  syncStatus?: SyncStatus
}

export function AuthButton({ syncStatus = 'idle' }: AuthButtonProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  }

  if (!session) {
    return (
      <Button variant="outline" size="sm" onClick={() => signIn('google')}>
        <Cloud className="h-4 w-4 mr-2" />
        Conectar Drive
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {syncStatus === 'saving' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Guardando en Drive...</span>
          </>
        )}
        {syncStatus === 'saved' && (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-green-500">Guardado en Drive</span>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <CloudOff className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Error al guardar</span>
          </>
        )}
      </div>
      {session.user?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user.name ?? ''}
          title={session.user.name ?? session.user.email ?? ''}
          className="w-8 h-8 rounded-full"
        />
      )}
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Salir
      </Button>
    </div>
  )
}
