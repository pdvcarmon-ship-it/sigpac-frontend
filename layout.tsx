import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SIGPAC Sentinel Viewer',
  description: 'Visor de parcelas agrícolas con índices espectrales Sentinel-2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
