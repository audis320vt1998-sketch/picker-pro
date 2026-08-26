export type MobileInstallGuidance =
  | 'INSTALLED'
  | 'PROMPT_AVAILABLE'
  | 'APPLE_INSTRUCTIONS'
  | 'MOBILE_BROWSER_INSTRUCTIONS'
  | 'UNAVAILABLE'

export interface MobileInstallEnvironment {
  isStandalone: boolean
  hasDeferredPrompt: boolean
  isAppleMobile: boolean
  isMobileDevice: boolean
}

export interface AppleMobileDeviceInput {
  userAgent: string
  platform: string
  maxTouchPoints: number
}

export function isAppleMobileDevice({
  userAgent,
  platform,
  maxTouchPoints,
}: AppleMobileDeviceInput): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return true
  }

  return platform === 'MacIntel' && maxTouchPoints > 1
}

export function isMobileDevice(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent)
}

export function getMobileInstallGuidance({
  isStandalone,
  hasDeferredPrompt,
  isAppleMobile,
  isMobileDevice: mobileDevice,
}: MobileInstallEnvironment): MobileInstallGuidance {
  if (isStandalone) {
    return 'INSTALLED'
  }

  if (hasDeferredPrompt) {
    return 'PROMPT_AVAILABLE'
  }

  if (isAppleMobile) {
    return 'APPLE_INSTRUCTIONS'
  }

  if (mobileDevice) {
    return 'MOBILE_BROWSER_INSTRUCTIONS'
  }

  return 'UNAVAILABLE'
}
