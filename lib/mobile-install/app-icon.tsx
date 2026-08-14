import { ImageResponse } from 'next/og'

export function createPickerProAppIcon(size: number): ImageResponse {
  const innerRadius = Math.round(size * 0.12)
  const rowGap = Math.round(size * 0.055)

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0f2d52',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: innerRadius,
            display: 'flex',
            flexDirection: 'column',
            gap: rowGap,
            height: '68%',
            padding: Math.round(size * 0.095),
            width: '68%',
          }}
        >
          <div
            style={{
              background: '#ef8b24',
              borderRadius: Math.round(size * 0.035),
              display: 'flex',
              height: '17%',
              width: '100%',
            }}
          />
          <div
            style={{
              alignItems: 'stretch',
              display: 'flex',
              flex: 1,
              gap: rowGap,
              width: '100%',
            }}
          >
            <div
              style={{
                background: '#dbeafe',
                borderRadius: Math.round(size * 0.035),
                display: 'flex',
                flex: 1,
              }}
            />
            <div
              style={{
                display: 'flex',
                flex: 1.45,
                flexDirection: 'column',
                gap: rowGap,
              }}
            >
              <div
                style={{
                  background: '#0f2d52',
                  borderRadius: Math.round(size * 0.035),
                  display: 'flex',
                  flex: 1,
                }}
              />
              <div
                style={{
                  background: '#0f2d52',
                  borderRadius: Math.round(size * 0.035),
                  display: 'flex',
                  flex: 1,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      height: size,
      width: size,
    }
  )
}
