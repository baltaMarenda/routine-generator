'use client'

import { useEffect } from 'react'
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import posthog from 'posthog-js'

function PostHogIdentity() {
  const { data: session } = useSession()
  const user = session?.user

  useEffect(() => {
    if (!user?.id) return

    posthog.identify(user.id, {
      username: user.username,
      name: user.nombre,
      role: user.esAdmin ? 'admin' : 'user',
    })
  }, [user?.esAdmin, user?.id, user?.nombre, user?.username])

  return null
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <PostHogIdentity />
      {children}
    </NextAuthSessionProvider>
  )
}
