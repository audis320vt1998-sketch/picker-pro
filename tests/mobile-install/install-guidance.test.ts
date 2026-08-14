import {
  getMobileInstallGuidance,
  isAppleMobileDevice,
  isMobileDevice,
} from '@/lib/mobile-install/install-guidance'

describe('mobile install guidance', () => {
  it('prioritizes an already installed standalone app', () => {
    expect(
      getMobileInstallGuidance({
        hasDeferredPrompt: true,
        isAppleMobile: true,
        isMobileDevice: true,
        isStandalone: true,
      })
    ).toBe('INSTALLED')
  })

  it('offers the browser prompt only when one is available', () => {
    expect(
      getMobileInstallGuidance({
        hasDeferredPrompt: true,
        isAppleMobile: false,
        isMobileDevice: true,
        isStandalone: false,
      })
    ).toBe('PROMPT_AVAILABLE')
  })

  it('uses manual Apple instructions when there is no browser prompt', () => {
    expect(
      getMobileInstallGuidance({
        hasDeferredPrompt: false,
        isAppleMobile: true,
        isMobileDevice: true,
        isStandalone: false,
      })
    ).toBe('APPLE_INSTRUCTIONS')
  })

  it('keeps a browser-menu fallback for other mobile browsers', () => {
    expect(
      getMobileInstallGuidance({
        hasDeferredPrompt: false,
        isAppleMobile: false,
        isMobileDevice: true,
        isStandalone: false,
      })
    ).toBe('MOBILE_BROWSER_INSTRUCTIONS')
  })

  it('does not add installation UI on an unsupported desktop browser', () => {
    expect(
      getMobileInstallGuidance({
        hasDeferredPrompt: false,
        isAppleMobile: false,
        isMobileDevice: false,
        isStandalone: false,
      })
    ).toBe('UNAVAILABLE')
  })

  it('recognizes iPhone, iPad, and iPadOS user agents safely', () => {
    expect(
      isAppleMobileDevice({
        maxTouchPoints: 5,
        platform: 'iPhone',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      })
    ).toBe(true)
    expect(
      isAppleMobileDevice({
        maxTouchPoints: 5,
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      })
    ).toBe(true)
    expect(
      isAppleMobileDevice({
        maxTouchPoints: 0,
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      })
    ).toBe(false)
    expect(
      isMobileDevice('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36')
    ).toBe(true)
  })
})
