'use client'

import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import {
  CATALOG_ONBOARDING_FILE_INPUT_ACCEPT,
  catalogOnboardingPreflightFailureCodeFromResponse,
  getCatalogOnboardingFileSelectionIssue,
  isCatalogOnboardingPreflightResult,
  type CatalogOnboardingPreflightFailureCode,
  type CatalogOnboardingPreflightIssue,
  type CatalogOnboardingPreflightIssueCode,
  type CatalogOnboardingPreflightResult,
  type CatalogOnboardingTemplateColumn,
} from '@/lib/catalog/onboarding-preflight-policy'

const CATALOG_UPLOAD_FILE_NAME = 'catalog.csv'
const CATALOG_FILE_HELP_ID = 'catalog-preflight-file-help'

const FAILURE_TEXT: Record<CatalogOnboardingPreflightFailureCode, string> = {
  INVALID_CATALOG_PREFLIGHT_INPUT:
    'לא ניתן להכין את הקובץ לבדיקה. יש לבחור קובץ CSV אחד ולנסות שוב.',
  REQUEST_TOO_LARGE:
    'הבקשה גדולה מדי. יש לפצל את הקובץ או לבחור קובץ קטן יותר.',
  UNSUPPORTED_CSV_TYPE:
    'אפשר לבדוק רק קובץ CSV בקידוד UTF-8.',
  CSV_TOO_LARGE:
    'קובץ ה־CSV גדול מדי לבדיקה זמנית. יש לפצל אותו ולנסות שוב.',
  INVALID_CSV_CONTENT:
    'לא ניתן לקרוא את הקובץ כ־CSV תקין בקידוד UTF-8.',
  UNKNOWN: 'לא ניתן להשלים את בדיקת הקובץ כרגע. נסה שוב מאוחר יותר.',
}

const ISSUE_TEXT: Record<CatalogOnboardingPreflightIssueCode, string> = {
  EMPTY_CSV: 'הקובץ ריק.',
  INVALID_CSV: 'מבנה ה־CSV אינו תקין.',
  INVALID_HEADER: 'כותרות העמודות אינן תואמות לתבנית.',
  NO_PRODUCT_ROWS: 'לא נמצאו שורות מוצר בקובץ.',
  TOO_MANY_ROWS: 'יש יותר מדי שורות בקובץ אחד.',
  EMPTY_PRODUCT_ROW: 'שורת מוצר ריקה אינה מותרת באמצע הקובץ.',
  INVALID_COLUMN_COUNT: 'מספר העמודות בשורה אינו תואם לתבנית.',
  CELL_TOO_LARGE: 'תא אחד ארוך מדי לבדיקה.',
  MISSING_PRODUCT_KEY: 'חסר מזהה פנימי של מוצר.',
  MISSING_PRODUCT_NAME: 'חסר שם מוצר.',
  INVALID_VERIFICATION_STATUS: 'סטטוס האימות חייב להיות unverified.',
  INVALID_ALIASES: 'aliases חייב להיות מערך JSON של מחרוזות.',
  INVALID_BOOLEAN: 'ערך אמת/שקר חייב להיות true או false.',
  INVALID_POSITIVE_NUMBER: 'גודל מארז או יחידה חייב להיות מספר חיובי או ריק.',
  CONTRADICTORY_PICKING_CONFIGURATION:
    'מוצר מארזים בלבד אינו יכול לאפשר גם ליקוט בודדים.',
  DUPLICATE_PRODUCT_KEY: 'מזהה המוצר מופיע ביותר משורה אחת.',
  DUPLICATE_BARCODE: 'הברקוד מופיע ביותר משורה אחת.',
  DUPLICATE_SKU: 'המק״ט מופיע ביותר משורה אחת.',
  VERIFIED_STATUS_NOT_ALLOWED:
    'הבדיקה מקבלת רק unverified; אימות נעשה רק בעדכון JSON מבוקר.',
}

const FIELD_TEXT: Record<CatalogOnboardingTemplateColumn, string> = {
  productKey: 'מזהה מוצר',
  barcode: 'ברקוד',
  sku: 'מק״ט',
  verificationStatus: 'סטטוס אימות',
  name: 'שם מוצר',
  nameEn: 'שם באנגלית',
  aliases: 'שמות חלופיים',
  allowUnitPicking: 'ליקוט בודדים',
  caseOnly: 'מארזים בלבד',
  unitSize: 'גודל יחידה',
  caseSize: 'גודל מארז',
  active: 'פעיל',
}

function issueText(issue: CatalogOnboardingPreflightIssue): string {
  const location = issue.rowNumber === null ? 'קובץ' : `שורה ${issue.rowNumber}`
  const field = issue.field ? ` — ${FIELD_TEXT[issue.field]}` : ''
  return `${location}${field}: ${ISSUE_TEXT[issue.code]}`
}

export default function CatalogOnboardingPreflight() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CatalogOnboardingPreflightResult | null>(
    null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    if (submitLock.current || selectedFiles.length === 0) {
      return
    }
    if (selectedFiles.length !== 1) {
      setFile(null)
      setResult(null)
      setError('יש לבחור קובץ CSV אחד בלבד.')
      return
    }

    const selectedFile = selectedFiles[0]
    const selectionIssue = getCatalogOnboardingFileSelectionIssue(selectedFile)
    if (selectionIssue) {
      setFile(null)
      setResult(null)
      setError(
        selectionIssue === 'UNSUPPORTED_CSV_TYPE'
          ? FAILURE_TEXT.UNSUPPORTED_CSV_TYPE
          : selectionIssue === 'CSV_TOO_LARGE'
            ? FAILURE_TEXT.CSV_TOO_LARGE
            : FAILURE_TEXT.INVALID_CSV_CONTENT
      )
      return
    }

    setFile(selectedFile)
    setResult(null)
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current) {
      return
    }
    if (!file) {
      setError('יש לבחור קובץ CSV לפני הבדיקה.')
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const form = new FormData()
      form.append('file', file, CATALOG_UPLOAD_FILE_NAME)
      const response = await fetch('/api/catalog/preflight', {
        method: 'POST',
        body: form,
      })
      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        setError(
          FAILURE_TEXT[catalogOnboardingPreflightFailureCodeFromResponse(body)]
        )
        return
      }
      if (!isCatalogOnboardingPreflightResult(body)) {
        setError(FAILURE_TEXT.UNKNOWN)
        return
      }

      setResult(body)
    } catch {
      setError(FAILURE_TEXT.UNKNOWN)
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-busy={isSubmitting}
      aria-labelledby="catalog-preflight-heading"
      className="settings__catalog-preflight"
    >
      <h3 id="catalog-preflight-heading">בדיקת קובץ CSV ממולא</h3>
      <p id={CATALOG_FILE_HELP_ID}>
        הקובץ נשלח לבדיקה זמנית בלבד. הוא אינו נשמר, אינו מיובא, אינו משנה את
        הקטלוג הפעיל ואינו מאמת מוצרים.
      </p>
      <form onSubmit={submit}>
        <label className="settings__file-label">
          קובץ קטלוג CSV
          <input
            accept={CATALOG_ONBOARDING_FILE_INPUT_ACCEPT}
            aria-describedby={CATALOG_FILE_HELP_ID}
            disabled={isSubmitting}
            onChange={selectFile}
            type="file"
          />
        </label>
        {file && <p className="settings__file-selected">נבחר קובץ CSV אחד לבדיקה.</p>}
        <button
          className="manual-review__primary-button"
          disabled={!file || isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'בודק קובץ…' : 'בדוק קובץ CSV'}
        </button>
      </form>

      {error && <p className="manual-review__error" role="alert">{error}</p>}

      {result && (
        <div
          className={
            result.status === 'READY_FOR_CONTROLLED_REVIEW'
              ? 'settings__preflight-result settings__preflight-result--ready'
              : 'settings__preflight-result'
          }
          role="status"
        >
          <p>
            {result.status === 'READY_FOR_CONTROLLED_REVIEW'
              ? `הקובץ עומד בבדיקה המבנית: ${result.summary.readyRows} שורות מוכנות לבדיקה מבוקרת.`
              : `נמצאו שגיאות ב־${result.summary.rowsWithErrors} מתוך ${result.summary.totalRows} שורות.`}
          </p>
          <p>
            הבדיקה אינה מייבאת קובץ, אינה משנה את הקטלוג ואינה מאמתת רשומות.
          </p>
          {result.issues.length > 0 && (
            <ol>
              {result.issues.map((issue, index) => (
                <li key={`${issue.rowNumber ?? 'file'}-${issue.field ?? 'all'}-${issue.code}-${index}`}>
                  {issueText(issue)}
                </li>
              ))}
            </ol>
          )}
          {result.issuesTruncated && (
            <p>מוצגות רק הבעיות הראשונות; יש לתקן אותן ולבדוק שוב.</p>
          )}
        </div>
      )}
    </section>
  )
}
