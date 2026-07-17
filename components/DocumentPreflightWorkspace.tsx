'use client'

import Link from 'next/link'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import type {
  DocumentPreflightIssue,
  DocumentPreflightResult,
} from '@/lib/document-intake'

const ISSUE_TEXT: Record<DocumentPreflightIssue['code'], string> = {
  OCR_DRAFT_REQUIRES_REVIEW:
    'זוהי טיוטת OCR בלבד. יש לאמת כל מזהה וכל כמות מול המסמך לפני הזנה ידנית.',
  IMAGE_TOO_LOW_RESOLUTION:
    'התמונה קטנה או לא חדה מספיק. יש לצלם תקריב חד של הטבלה, או להזין את השורות ידנית.',
  DOCUMENT_LAYOUT_UNRECOGNIZED:
    'מבנה טבלת מעיין לא זוהה באופן שניתן לעקוב אחריו. לא נוצרו שורות OCR.',
  NO_TRACEABLE_ROWS:
    'זוהתה טבלה, אך לא נמצאה שורה עם מק״ט וברקוד מוצר יחד. לא נוצרו שורות OCR.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDocumentPreflightResult(value: unknown): value is DocumentPreflightResult {
  return (
    isRecord(value) &&
    value.kind === 'DOCUMENT_PREFLIGHT' &&
    value.status === 'NEEDS_REVIEW' &&
    value.profile === 'MAAYAN_PRICE_OFFER_V1' &&
    Array.isArray(value.pages)
  )
}

function responseError(value: unknown): string | null {
  return isRecord(value) && typeof value.error === 'string' ? value.error : null
}

function displayQuantity(value: number | null): string {
  return value === null ? 'לא זוהה' : String(value)
}

export default function DocumentPreflightWorkspace() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<DocumentPreflightResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setResult(null)
    setFile(event.target.files?.[0] ?? null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('יש לבחור תמונת JPEG, PNG או WebP אחת.')
      return
    }

    setError(null)
    setResult(null)
    setIsSubmitting(true)

    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/intake/preflight', {
        method: 'POST',
        body: form,
      })
      const body: unknown = await response.json()

      if (!response.ok) {
        throw new Error(responseError(body) ?? 'לא ניתן היה ליצור טיוטת OCR.')
      }
      if (!isDocumentPreflightResult(body)) {
        throw new Error('התקבלה תשובה לא תקינה משירות ה-OCR.')
      }

      setResult(body)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'אירעה שגיאה לא צפויה בעת קריאת התמונה.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="manual-review document-preflight" dir="rtl">
      <section className="manual-review__intro">
        <h1>קריאת מסמך לביקורת</h1>
        <p>
          העלה תמונה חדה אחת של טבלת ההזמנה. המערכת מחזירה טיוטת OCR של שורות
          הטבלה בלבד, ללא יצירת ליקוט, ללא התאמת קטלוג וללא שמירת המסמך.
        </p>
      </section>

      <form className="manual-review__form" onSubmit={submit}>
        <label className="document-preflight__file-label">
          תמונת מסמך
          <input
            accept="image/jpeg,image/png,image/webp"
            onChange={selectFile}
            type="file"
            disabled={isSubmitting}
          />
        </label>
        {file && <p className="document-preflight__selected">נבחרה תמונה אחת לבדיקה.</p>}
        <button
          className="manual-review__primary-button"
          type="submit"
          disabled={!file || isSubmitting}
        >
          {isSubmitting ? 'קורא את הטבלה…' : 'צור טיוטת OCR'}
        </button>
      </form>

      {error && <p className="manual-review__error">{error}</p>}

      {result && (
        <section className="manual-review__result">
          <h2>טיוטת OCR — נדרשת בדיקה ידנית</h2>
          <p className="manual-review__notice">
            אין להשתמש בתוצאה זו כליקוט. בדוק את הברקוד, המק״ט ושלוש עמודות הכמות
            מול המסמך המקורי, ואז הזן את הנתונים באופן מפורש במסך הבדיקה הידנית. אות
            ה-OCR הוא סימן טכני בלבד ואינו מאשר נכונות של שדה כלשהו.
          </p>

          {result.pages.map((page) => (
            <div className="document-preflight__page" key={page.pageNumber}>
              {page.issues.map((issue) => (
                <p className="document-preflight__issue" key={issue.code}>
                  {ISSUE_TEXT[issue.code]}
                </p>
              ))}

              {page.rows.length > 0 && (
                <div className="manual-review__table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>שורת מקור</th>
                        <th>מק״ט</th>
                        <th>ברקוד</th>
                        <th>שם פריט</th>
                        <th>כמות מארזים</th>
                        <th>כמות באריזה</th>
                        <th>כמות בודדים</th>
                        <th>אות OCR בלבד</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.rows.map((row) => (
                        <tr key={row.source.parserRowIndex}>
                          <td>{row.source.printedRowNumber ?? row.source.parserRowIndex}</td>
                          <td>{row.sku ?? 'לא זוהה'}</td>
                          <td>{row.barcode ?? 'לא זוהה'}</td>
                          <td>
                            {row.productName ?? 'לא זוהה'}
                            <details className="document-preflight__trace">
                              <summary>טקסט מקור</summary>
                              <span>{row.traceText}</span>
                            </details>
                          </td>
                          <td>{displayQuantity(row.sourceQuantities.caseQuantity)}</td>
                          <td>{displayQuantity(row.sourceQuantities.unitsPerCase)}</td>
                          <td>{displayQuantity(row.sourceQuantities.totalUnits)}</td>
                          <td>{Math.round(row.confidence)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <Link className="manual-review__primary-button" href="/review">
            עבור להזנה ידנית ובדיקה
          </Link>
        </section>
      )}
    </div>
  )
}
