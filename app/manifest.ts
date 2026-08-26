import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#f5f5f5',
    description: 'כלי ליקוט ובדיקת הזמנות עם הפרדה בין מארזים ובודדים',
    dir: 'rtl',
    display: 'standalone',
    id: '/',
    icons: [
      {
        sizes: '192x192',
        src: '/pwa-icon-192',
        type: 'image/png',
      },
      {
        sizes: '512x512',
        src: '/icon',
        type: 'image/png',
      },
    ],
    lang: 'he',
    name: 'Picker Pro — ליקוט ובדיקת הזמנות',
    prefer_related_applications: false,
    scope: '/',
    short_name: 'Picker Pro',
    start_url: '/',
    theme_color: '#0f2d52',
  }
}
