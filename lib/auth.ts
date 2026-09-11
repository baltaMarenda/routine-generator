import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { getDb, schema } from './db'
import { normalizarUsername, verificarPassword } from './usuarios'

/**
 * Cada cuánto el JWT vuelve a leer al usuario de la BD. `es_admin`, `activo` y
 * `debe_cambiar_password` se cambian desde afuera (el admin o la BD); sin esto la
 * sesión los arrastraría viejos hasta el próximo login. Las APIs igual los leen
 * de la BD en cada request (lib/auth-server.ts): esto es sólo para la UI y proxy.ts.
 */
const REFRESCO_MS = 60_000

async function completarDesdeBd(token: JWT): Promise<JWT> {
  if (!token.id) return token

  const [usuario] = await getDb()
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, token.id))
    .limit(1)

  // Borrado o desactivado: sin id, proxy.ts lo manda al login.
  if (!usuario || !usuario.activo) return { ...token, id: undefined }

  return {
    ...token,
    name: usuario.nombre,
    username: usuario.username,
    nombre: usuario.nombre,
    esAdmin: usuario.esAdmin,
    debeCambiarPassword: usuario.debeCambiarPassword,
    refrescadoEn: Date.now(),
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const username = normalizarUsername(credentials?.username ?? '')
        const password = credentials?.password ?? ''
        if (!username || !password) return null

        const [usuario] = await getDb()
          .select()
          .from(schema.usuarios)
          .where(eq(schema.usuarios.username, username))
          .limit(1)

        if (!usuario || !usuario.activo) return null
        if (!(await verificarPassword(password, usuario.passwordHash))) return null

        return { id: usuario.id, name: usuario.nombre }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Login recién hecho.
      if (user) return completarDesdeBd({ ...token, id: user.id })

      const vencido = !token.refrescadoEn || Date.now() - token.refrescadoEn > REFRESCO_MS
      if (trigger === 'update' || vencido) {
        try {
          return await completarDesdeBd(token)
        } catch (err) {
          // Si la BD no responde, seguimos con lo que ya teníamos en vez de cortar la sesión.
          console.error('No se pudo refrescar la sesión desde la BD:', err)
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id ?? '',
        username: token.username ?? '',
        nombre: token.nombre ?? '',
        esAdmin: token.esAdmin ?? false,
        debeCambiarPassword: token.debeCambiarPassword ?? false,
      }
      return session
    },
  },
}
