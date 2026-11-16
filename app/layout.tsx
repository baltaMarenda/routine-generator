import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/session-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Goblet - Creador de Rutinas',
  description: 'Crea y exporta rutinas de entrenamiento profesionales',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // La app está en español. Con lang="en" Chrome ofrecía traducirla, y el
    // traductor reemplaza los textos por sus propios nodos: cuando React cambia
    // un texto (p. ej. "Guardar" → "Guardando...") la página entera se cae.
    <html lang="es" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster position="top-center" theme="light" richColors />
      </body>
    </html>
  )
}
