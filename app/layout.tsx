import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Picker Pro',
  description: 'OCR-based product picker and data processing application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}