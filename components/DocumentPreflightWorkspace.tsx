'use client'

import Link from 'next/link'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import {
  createOcrPreflightBatchPage,
  createOcrSourceDocumentRef,
  type DocumentPreflightIssue,
  type DocumentPreflightResult,
  type DocumentPreflightRow,
  type OcrPreflightBatchPage,
} from '@/lib/document-intake'
import {
  createOcrManualReviewHandoff,
  saveOcrManualReviewHandoff,
  toOcrManualReviewHandoffRow,
} from '@/lib/manual-review'

const MAX_BATCH_IMAGES = 20

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

interface SelectedSourceImage {
  file: File
  sourceDocumentRef: string
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

function displayQuantity(value: number | null): string {
  return value === null ? 'לא זוהה' : String(value)
}

function rowKey(pageNumber: number, row: DocumentPreflightRow): string {
  return `${pageNumber}:${row.source.parserRowIndex}`
}

function createSourceDocumentRef(): string {
  const randomBytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(randomBytes)
  return createOcrSourceDocumentRef(randomBytes)
}

function canTransferRow(
  row: DocumentPreflightRow,
  sourceDocumentRef: string
): boolean {
  return toOcrManualReviewHandoffRow({ row, sourceDocumentRef }) !== null
}

export default function DocumentPreflightWorkspace() {
  const [files, setFiles] = useState<readonly SelectedSourceImage[]>([])
  const [pages, setPages] = useState<readonly OcrPreflightBatchPage[] | null>(null)
  const [failedPageNumbers, setFailedPageNumbers] = useState<readonly number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null
  )
  const [selectedRowKeys, setSelectedRowKeys] = useState<Record<string, boolean>>({})
  const [hasConfirmedSourceCheck, setHasConfirmedSourceCheck] = useState(false)

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    setError(null)
    setPages(null)
    setFailedPageNumbers([])
    setSelectedRowKeys({})
    setHasConfirmedSourceCheck(false)

    if (selectedFiles.length > MAX_BATCH_IMAGES) {
      setFiles([])
      setError(`אפשר לבחור עד ${MAX_BATCH_IMAGES} תמונות בכל אצווה.`)
      return
    }

    try {
      setFiles(
        selectedFiles.map((file) => ({
          file,
          sourceDocumentRef: createSourceDocumentRef(),
        }))
      )
    } catch {
      setFiles([])
      setError('הדפדפן לא הצליח ליצור מזהה זמני ובטוח למסמך. נסה שוב.')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (files.length === 0) {
      setError('יש לבחור לפחות תמונת JPEG, PNG או WebP אחת.')
      return
    }

    setError(null)
    setPages([])
    setFailedPageNumbers([])
    setSelectedRowKeys({})
    setHasConfirmedSourceCheck(false)
    setIsSubmitting(true)

    const completedPages: OcrPreflightBatchPage[] = []
    const failures: number[] = []

    try {
      for (const [index, selectedFile] of files.entries()) {
        const pageNumber = index + 1
        setProgress({ current: pageNumber, total: files.length })

        try {
          const form = new FormData()
          form.append('file', selectedFile.file)
          const response = await fetch('/api/intake/preflight', {
            method: 'POST',
            body: form,
          })
          const body: unknown = await response.json()

          if (!response.ok || !isDocumentPreflightResult(body) || body.pages.length !== 1) {
            throw new Error('Invalid OCR preflight response.')
          }

          completedPages.push(
            createOcrPreflightBatchPage(
              body.pages[0],
              pageNumber,
              selectedFile.sourceDocumentRef
            )
          )
          setPages([...completedPages])
        } catch {
          failures.push(pageNumber)
          setFailedPageNumbers([...failures])
        }
      }
    } finally {
      setIsSubmitting(false)
      setProgress(null)
    }
  }

  const toggleRowSelection = (key: string, selected: boolean) => {
    setSelectedRowKeys((current) => ({ ...current, [key]: selected }))
    setHasConfirmedSourceCheck(false)
  }

  const selectedRows = (pages ?? []).flatMap(({ page, sourceDocumentRef }) =>
    page.rows
      .filter(
        (row) =>
          selectedRowKeys[rowKey(page.pageNumber, row)] &&
          canTransferRow(row, sourceDocumentRef)
      )
      .map((row) => ({ row, sourceDocumentRef }))
  )

  const transferToManualReview = () => {
    const handoff = createOcrManualReviewHandoff(selectedRows)
    if (!handoff || !hasConfirmedSourceCheck) {
      setError('יש לבחור שורות עם מספר מקור ולאשר שבוצעה בדיקה מול המסמך.')
      return
    }

    try {
      saveOcrManualReviewHandoff(window.sessionStorage, handoff)
      window.location.assign('/review')
    } catch {
      setError('לא ניתן לשמור את טיוטת הבדיקה בדפדפן. עבור להזנה ידנית.')
    }
  }

  return (
    <div className="manual-review document-preflight" dir="rtl">
      <section className="manual-review__intro">
        <h1>קריאת מסמכים לביקורת</h1>
        <p>
          העלה תמונה אחת או יותר של טבלאות הזמנה. כל תמונה מעובדת בנפרד ובסדר
          שנבחר, ומוחזרת רק כטיוטת OCR לביקורת — ללא יצירת ליקוט, התאמת קטלוג או
          שמירת המסמך.
        </p>
      </section>

      <form className="manual-review__form" onSubmit={submit}>
        <label className="document-preflight__file-label">
          תמונות מסמך
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={isSubmitting}
            multiple
            onChange={selectFiles}
            type="file"
          />
        </label>
        {files.length > 0 && (
          <p className="document-preflight__selected">
            נבחרו {files.length} תמונות. שמות הקבצים אינם מוצגים או נשמרים
            בתוצאה.
          </p>
        )}
        {progress && (
          <p className="document-preflight__progress" role="status">
            מעבד תמונה {progress.current} מתוך {progress.total}…
          </p>
        )}
        <button
          className="manual-review__primary-button"
          type="submit"
          disabled={files.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'קורא את התמונות…' : 'צור טיוטות OCR'}
        </button>
      </form>

      {error && <p className="manual-review__error" role="alert">{error}</p>}

      {pages && (
        <section className="manual-review__result">
          <h2>טיוטות OCR — נדרשת בדיקה ידנית</h2>
          <p className="manual-review__notice">
            אין להשתמש בתוצאה זו כליקוט. בדוק את הברקוד, המק״ט ושלוש עמודות
            הכמות מול המסמך המקורי, ואז הזן במפורש מארזים ובודדים במסך הבדיקה
            הידנית. אות ה-OCR הוא סימן טכני בלבד ואינו מאשר נכונות של שדה כלשהו.
          </p>

          {failedPageNumbers.map((pageNumber) => (
            <p className="document-preflight__issue" key={pageNumber}>
              לא נוצרה טיוטת OCR לעמוד {pageNumber}. יש להזין אותו ידנית או לצלם
              תקריב חד יותר.
            </p>
          ))}

          {pages.map(({ page, sourceDocumentRef }) => (
            <div className="document-preflight__page" key={page.pageNumber}>
              <h3>עמוד {page.pageNumber}</h3>
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
                        <th>להעברה</th>
                        <th>עמוד</th>
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
                      {page.rows.map((row) => {
                        const key = rowKey(page.pageNumber, row)
                        const transferable = canTransferRow(row, sourceDocumentRef)

                        return (
                          <tr key={row.source.parserRowIndex}>
                            <td>
                              {transferable ? (
                                <input
                                  aria-label={`העבר עמוד ${page.pageNumber}, שורת מקור ${row.source.printedRowNumber}`}
                                  checked={selectedRowKeys[key] ?? false}
                                  onChange={(event) =>
                                    toggleRowSelection(key, event.target.checked)
                                  }
                                  type="checkbox"
                                />
                              ) : (
                                'חסר מספר שורת מקור'
                              )}
                            </td>
                            <td>{page.pageNumber}</td>
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <div className="document-preflight__handoff">
            <label>
              <input
                checked={hasConfirmedSourceCheck}
                disabled={selectedRows.length === 0 || isSubmitting}
                onChange={(event) => setHasConfirmedSourceCheck(event.target.checked)}
                type="checkbox"
              />
              בדקתי מול המסמך את המזהים ואת שלוש כמויות המקור בכל השורות שנבחרו.
            </label>
            <button
              className="manual-review__primary-button"
              disabled={
                isSubmitting || selectedRows.length === 0 || !hasConfirmedSourceCheck
              }
              onClick={transferToManualReview}
              type="button"
            >
              העבר {selectedRows.length} שורות לטיוטת בדיקה ידנית
            </button>
            <p>
              ההעברה זמנית בדפדפן בלבד. המארזים והבודדים יישארו ריקים במסך
              הבדיקה, ולא יישלחו אוטומטית לשירות.
            </p>
          </div>

          <Link className="manual-review__primary-button" href="/review">
            עבור להזנה ידנית ללא העברת טיוטה
          </Link>
        </section>
      )}
    </div>
  )
}
