import manifest from '@/app/manifest'

describe('Picker Pro web app manifest', () => {
  it('declares the online-only standalone install contract', () => {
    expect(manifest()).toMatchObject({
      background_color: '#f5f5f5',
      dir: 'rtl',
      display: 'standalone',
      id: '/',
      lang: 'he',
      name: 'Picker Pro — ליקוט ובדיקת הזמנות',
      prefer_related_applications: false,
      scope: '/',
      short_name: 'Picker Pro',
      start_url: '/',
      theme_color: '#0f2d52',
    })
  })

  it('supplies the required 192px and 512px PNG install icons', () => {
    expect(manifest().icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: '192x192',
          src: '/pwa-icon-192',
          type: 'image/png',
        }),
        expect.objectContaining({
          sizes: '512x512',
          src: '/icon',
          type: 'image/png',
        }),
      ])
    )
  })
})
