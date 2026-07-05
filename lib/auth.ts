import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * Usa el refresh_token de Google para pedir un access_token nuevo cuando el
 * anterior venció. Google no siempre devuelve un refresh_token nuevo, así que
 * conservamos el que ya teníamos si no viene uno.
 */
async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error('No refresh token available')

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshed = await res.json()
    if (!res.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      // expires_in viene en segundos; lo pasamos a epoch en ms
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch (err) {
    console.error('Error al refrescar el access token de Google:', err)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.APP_USERNAME &&
          credentials?.password === process.env.APP_PASSWORD
        ) {
          return { id: 'goblet-user', name: credentials.username }
        }
        return null
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Primer sign-in: guardamos los tokens y el momento de expiración.
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // account.expires_at viene en segundos (epoch); lo guardamos en ms.
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000
        return token
      }

      // Login por credenciales (sin Google): no hay token que refrescar.
      if (!token.refreshToken) return token

      // Token todavía vigente (con 60s de margen): lo devolvemos tal cual.
      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
        return token
      }

      // Venció: lo renovamos con el refresh token.
      return refreshGoogleAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      return session
    },
  },
}
