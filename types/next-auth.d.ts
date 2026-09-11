import type { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      username: string
      nombre: string
      esAdmin: boolean
      debeCambiarPassword: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string
    nombre?: string
    esAdmin?: boolean
    debeCambiarPassword?: boolean
    /** Epoch en ms de la última vez que se leyó al usuario de la BD. */
    refrescadoEn?: number
  }
}
