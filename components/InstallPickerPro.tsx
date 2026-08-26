'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getMobileInstallGuidance,
  isAppleMobileDevice,
  isMobileDevice,
  type MobileInstallEnvironment,
} from '@/lib/mobile-install/install-guidance'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INITIAL_ENVIRONMENT: MobileInstallEnvironment = {
  hasDeferredPrompt: false,
  isAppleMobile: false,
  isMobileDevice: false,
  isStandalone: false,
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return typeof (event as Partial<BeforeInstallPromptEvent>).prompt === 'function'
}

function isStandaloneWindow(): boolean {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

export default function InstallPickerPro() {
  const deferredInstallPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const shouldFocusInstalledStatusRef = useRef(false)
  const [environment, setEnvironment] =
    useState<MobileInstallEnvironment>(INITIAL_ENVIRONMENT)
  const [installMessage, setInstallMessage] = useState<string | null>(null)
  const [isInstallPromptPending, setIsInstallPromptPending] = useState(false)
  const [wasInstalledInThisSession, setWasInstalledInThisSession] = useState(false)

  useEffect(() => {
    const userAgent = window.navigator.userAgent
    const appleMobile = isAppleMobileDevice({
      maxTouchPoints: window.navigator.maxTouchPoints,
      platform: window.navigator.platform,
      userAgent,
    })

    const environmentAnimationFrame = window.requestAnimationFrame(() => {
      setEnvironment((current) => ({
        ...current,
        isAppleMobile: appleMobile,
        isMobileDevice: appleMobile || isMobileDevice(userAgent),
        isStandalone: isStandaloneWindow() || current.isStandalone,
      }))
    })

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) {
        return
      }

      event.preventDefault()
      deferredInstallPromptRef.current = event
      setInstallMessage(null)
      setEnvironment((current) => ({
        ...current,
        hasDeferredPrompt: true,
      }))
    }

    const handleAppInstalled = () => {
      deferredInstallPromptRef.current = null
      shouldFocusInstalledStatusRef.current = true
      setWasInstalledInThisSession(true)
      setInstallMessage('Picker Pro נוסף למסך הבית של המכשיר.')
      setEnvironment((current) => ({
        ...current,
        hasDeferredPrompt: false,
        isStandalone: true,
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.cancelAnimationFrame(environmentAnimationFrame)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const guidance = getMobileInstallGuidance(environment)

  const requestInstall = async () => {
    const installPrompt = deferredInstallPromptRef.current

    if (!installPrompt || isInstallPromptPending) {
      return
    }

    setIsInstallPromptPending(true)

    try {
      const result = await installPrompt.prompt()
      deferredInstallPromptRef.current = null
      setEnvironment((current) => ({
        ...current,
        hasDeferredPrompt: false,
      }))

      if (result.outcome === 'dismissed') {
        setInstallMessage('ההתקנה בוטלה. אפשר לנסות שוב דרך תפריט הדפדפן.')
      }
    } catch {
      deferredInstallPromptRef.current = null
      setEnvironment((current) => ({
        ...current,
        hasDeferredPrompt: false,
      }))
      setInstallMessage('הדפדפן לא פתח את חלון ההתקנה. אפשר לנסות דרך התפריט שלו.')
    } finally {
      setIsInstallPromptPending(false)
    }
  }

  const focusInstalledStatus = (element: HTMLElement | null) => {
    if (element && shouldFocusInstalledStatusRef.current) {
      shouldFocusInstalledStatusRef.current = false
      element.focus()
    }
  }

  if (wasInstalledInThisSession) {
    return (
      <section
        className="mobile-install-guidance mobile-install-guidance--installed"
        ref={focusInstalledStatus}
        role="status"
        tabIndex={-1}
      >
        <p>{installMessage ?? 'Picker Pro נוסף למסך הבית של המכשיר.'}</p>
        <p>גם מהמסך הבית OCR דורש חיבור לרשת.</p>
      </section>
    )
  }

  if (guidance === 'INSTALLED' || guidance === 'UNAVAILABLE') {
    return null
  }

  return (
    <section
      aria-labelledby="mobile-install-guidance-title"
      className="mobile-install-guidance"
    >
      <p className="mobile-install-guidance__title" id="mobile-install-guidance-title">
        התקנת Picker Pro במסך הבית
      </p>

      {guidance === 'PROMPT_AVAILABLE' ? (
        <>
          <p>אפשר להוסיף קיצור נוח לאפליקציה ישירות ממסך זה.</p>
          <button
            className="manual-review__primary-button mobile-install-guidance__button"
            disabled={isInstallPromptPending}
            onClick={requestInstall}
            type="button"
          >
            {isInstallPromptPending ? 'פותח חלון התקנה…' : 'התקן במסך הבית'}
          </button>
        </>
      ) : null}

      {guidance === 'APPLE_INSTRUCTIONS' ? (
        <details className="mobile-install-guidance__details">
          <summary>באייפון או באייפד: הוספה למסך הבית</summary>
          <ol>
            <li>פתח/י את תפריט השיתוף בדפדפן.</li>
            <li>בחר/י ״הוסף למסך הבית״.</li>
            <li>אשר/י את שם האפליקציה.</li>
          </ol>
        </details>
      ) : null}

      {guidance === 'MOBILE_BROWSER_INSTRUCTIONS' ? (
        <p>
          פתח/י את תפריט הדפדפן וחפש/י ״התקן״ או ״הוסף למסך הבית״. הניסוח
          משתנה בין דפדפנים.
        </p>
      ) : null}

      <p className="mobile-install-guidance__privacy-note">
        ההתקנה אינה מוסיפה שמירה או שחזור: OCR דורש חיבור לרשת, ותמונות וטיוטות
        OCR אינן נשמרות לשחזור אופליין. תוצאה מאומתת נשמרת רק בפעולה מפורשת ונפרדת.
      </p>

      {installMessage ? (
        <p aria-atomic="true" className="mobile-install-guidance__status" role="status">
          {installMessage}
        </p>
      ) : null}
    </section>
  )
}
