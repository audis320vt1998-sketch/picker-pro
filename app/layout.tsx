import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Picker Pro',
  description: 'כלי ליקוט עם הפרדה בין מארזים ובודדים',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
