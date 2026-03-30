import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'ClinicaApp — Gestión de Clínicas',
  description: 'Sistema de gestión para clínicas dentales y médicas en Guatemala',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.className} h-full`}>
      <body className="min-h-full">
        {children}
      </body>
    </html>
  )
}
