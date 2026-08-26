import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  applicationName: 'Picker Pro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Picker Pro',
  },
  title: 'Picker Pro',
  description: 'כלי ליקוט עם הפרדה בין מארזים ובודדים',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0f2d52',
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
