'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  ChevronDown,
  Cloud,
  CloudOff,
  Download,
  KeyRound,
  Loader2,
  LogOut,
  Unplug,
  Users,
} from 'lucide-react'
import { urlConectarDrive, useDrive } from '@/hooks/use-drive'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AuthButtonProps {
  syncStatus?: SyncStatus
}

export function AuthButton({ syncStatus = 'idle' }: AuthButtonProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const drive = useDrive()

  if (status === 'loading') {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  }

  const usuario = session?.user
  const driveDesconectado = drive.estado === 'desconectado' || drive.estado === 'reconectar'

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        {syncStatus === 'saving' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Guardando...</span>
          </>
        )}
        {syncStatus === 'saved' && (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-green-500">Guardado</span>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <CloudOff className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Error al guardar</span>
          </>
        )}
      </div>

      {driveDesconectado && (
        <Button asChild variant="outline" size="sm">
          {/* Es una ruta de API que redirige a Google: navegación completa, no Link. */}
          <a href={urlConectarDrive(pathname)}>
            <Cloud className="h-4 w-4 mr-2" />
            {drive.estado === 'reconectar' ? 'Reconectar Drive' : 'Conectar Drive'}
          </a>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <span className="max-w-32 truncate">{usuario?.nombre || usuario?.username}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-muted-foreground">
              @{usuario?.username}
              {usuario?.esAdmin && ' · Administrador'}
            </p>
            {drive.estado === 'conectado' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <Cloud className="h-3 w-3 shrink-0" />
                {drive.email ?? 'Drive conectado'}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {usuario?.esAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/usuarios">
                <Users className="h-4 w-4 mr-2" />
                Usuarios
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/cambiar-password">
              <KeyRound className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/importar">
              <Download className="h-4 w-4 mr-2" />
              Importar datos anteriores
            </Link>
          </DropdownMenuItem>
          {drive.estado === 'conectado' && (
            <DropdownMenuItem onSelect={() => void drive.desconectar()}>
              <Unplug className="h-4 w-4 mr-2" />
              Desconectar Drive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: '/login' })}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
