'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import type { DriveTokenDto } from '@/lib/api-types'
import { usarCuentaDrive } from '@/lib/drive-sync'

export type EstadoDrive = 'cargando' | 'conectado' | 'desconectado' | 'reconectar' | 'error'

/**
 * El access token se comparte entre todos los componentes de la página y se
 * reutiliza hasta un minuto antes de vencer: cada pedido nuevo le cuesta al
 * servidor una llamada a Google.
 */
let tokenCache: DriveTokenDto | null = null
let pedidoEnCurso: Promise<DriveTokenDto> | null = null

function pedirToken(): Promise<DriveTokenDto> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return Promise.resolve(tokenCache)

  pedidoEnCurso ??= api<DriveTokenDto>('/api/google/token')
    .then(token => {
      tokenCache = token
      usarCuentaDrive(token.email)
      return token
    })
    .catch(err => {
      tokenCache = null
      throw err
    })
    .finally(() => {
      pedidoEnCurso = null
    })
  return pedidoEnCurso
}

function estadoDeError(err: unknown): EstadoDrive {
  if (err instanceof ApiError && err.code === 'DRIVE_NO_CONECTADO') return 'desconectado'
  if (err instanceof ApiError && err.code === 'DRIVE_RECONECTAR') return 'reconectar'
  return 'error'
}

/** Link para conectar Drive; al terminar Google vuelve a `volver`. */
export function urlConectarDrive(volver: string): string {
  return `/api/google/connect?volver=${encodeURIComponent(volver)}`
}

/** Conexión del usuario logueado con su propio Google Drive. */
export function useDrive() {
  const [estado, setEstado] = useState<EstadoDrive>('cargando')
  const [email, setEmail] = useState<string | null>(null)

  const refrescar = useCallback(async () => {
    try {
      const token = await pedirToken()
      setEmail(token.email)
      setEstado('conectado')
    } catch (err) {
      setEmail(null)
      setEstado(estadoDeError(err))
    }
  }, [])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  /** Access token vigente. Sin Drive conectado tira el ApiError y actualiza el estado. */
  const obtenerToken = useCallback(async (): Promise<string> => {
    try {
      return (await pedirToken()).accessToken
    } catch (err) {
      setEstado(estadoDeError(err))
      throw err
    }
  }, [])

  const desconectar = useCallback(async () => {
    await api('/api/google/disconnect', { method: 'POST' })
    tokenCache = null
    usarCuentaDrive(null)
    setEmail(null)
    setEstado('desconectado')
  }, [])

  return { estado, email, obtenerToken, desconectar, refrescar }
}
