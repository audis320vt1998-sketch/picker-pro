'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import ResultsTable from '@/components/ResultsTable'
import SummaryCards from '@/components/SummaryCards'
import type {
  ManualReviewResult,
  ManualReviewRowInput,
} from '@/lib/manual-review'
import {
  consumeOcrManualReviewHandoff,
  findDuplicateSourceRows,
  manualReviewDuplicateSourceErrorFromResponse,
  manualReviewFailureCodeFromResponse,
  manualReviewIssuePresentation,
  toManualReviewOcrDraft,
  type ManualReviewOcrDraft,
  type ManualReviewDuplicateSourceError,
  type ManualReviewFailureCode,
} from '@/lib/manual-review'

interface EditableRow {
  id: number
  sourceDocumentRef: string | null
  pageNumber: string
  rowNumber: string
  rawText: string
  productName: string
  barcode: string
  sku: string
  cases: string
  units: string
  ocrSourceQuantities: ManualReviewOcrDraft['sourceQuantities'] | null
}

const MANUAL_REVIEW_FAILURE_TEXT: Record<ManualReviewFailureCode, string> = {
  INVALID_MANUAL_REVIEW_INPUT:
    'לא ניתן לבדוק את השורות שנשלחו. יש לבדוק את השדות ולנסות שוב.',
  CATALOG_UNAVAILABLE:
    'קטלוג המוצרים המאומת אינו זמין כרגע. נסה שוב מאוחר יותר.',
  UNKNOWN:
    'לא ניתן להשלים את הבדיקה כרגע. נסה שוב מאוחר יותר.',
}

function createEditableRow(
  id: number,
  rowNumber = '1',
  ocrDraft?: ManualReviewOcrDraft
): EditableRow {
  return {
    id,
    sourceDocumentRef: ocrDraft?.sourceDocumentRef ?? null,
    pageNumber: ocrDraft ? String(ocrDraft.pageNumber) : '1',
    rowNumber: ocrDraft ? String(ocrDraft.rowNumber) : rowNumber,
    rawText: ocrDraft?.rawText ?? '',
    productName: ocrDraft?.productName ?? '',
    barcode: ocrDraft?.barcode ?? '',
    sku: ocrDraft?.sku ?? '',
    cases: '',
    units: '',
    ocrSourceQuantities: ocrDraft?.sourceQuantities ?? null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isManualReviewResult(value: unknown): value is ManualReviewResult {
  return (
    isRecord(value) &&
    typeof value.reviewId === 'string' &&
    isRecord(value.catalog) &&
    Array.isArray(value.totals) &&
    Array.isArray(value.issues) &&
    typeof value.acceptedRowCount === 'number' &&
    typeof value.totalRowCount === 'number'
  )
}

function duplicateSourceErrorText(
  duplicate: ManualReviewDuplicateSourceError
): string {
  return `אותה שורת מקור נכללה פעמיים (שורות טופס ${duplicate.duplicateOfRow} ו-${duplicate.row}). הסר או תקן אחת מהן.`
}

function displaySourceQuantity(value: number | null): string {
  return value === null ? 'לא זוהה' : String(value)
}

function validateAndConvertRow(row: EditableRow): ManualReviewRowInput | string {
  if (!row.rawText.trim()) {
    return `יש להזין את הטקסט המקורי בשורה ${row.rowNumber || row.id}.`
  }

  if (!row.productName.trim() && !row.barcode.trim() && !row.sku.trim()) {
    return `יש להזין שם פריט, ברקוד או SKU בשורה ${row.rowNumber || row.id}.`
  }

  if (!row.pageNumber.trim() || !row.rowNumber.trim()) {
    return `יש להזין מספר עמוד ומספר שורה בשורה ${row.id}.`
  }

  if (!row.cases.trim() || !row.units.trim()) {
    return `יש להזין במפורש גם מארזים וגם בודדים בשורה ${row.rowNumber || row.id}.`
  }

  const pageNumber = Number(row.pageNumber)
  const rowNumber = Number(row.rowNumber)
  const cases = Number(row.cases)
  const units = Number(row.units)

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return `מספר העמוד בשורה ${row.rowNumber || row.id} חייב להיות מספר שלם חיובי.`
  }

  if (!Number.isInteger(rowNumber) || rowNumber < 1) {
    return `מספר השורה בשורה ${row.id} חייב להיות מספר שלם חיובי.`
  }

  if (
    !Number.isFinite(cases) ||
    cases < 0 ||
    !Number.isFinite(units) ||
    units < 0
  ) {
    return `מארזים ובודדים בשורה ${rowNumber} חייבים להיות מספרים לא שליליים.`
  }

  return {
    ...(row.sourceDocumentRef
      ? { sourceDocumentRef: row.sourceDocumentRef }
      : {}),
    pageNumber,
    rowNumber,
    rawText: row.rawText,
    ...(row.productName.trim() ? { productName: row.productName } : {}),
    ...(row.barcode.trim() ? { barcode: row.barcode } : {}),
    ...(row.sku.trim() ? { sku: row.sku } : {}),
    cases,
    units,
  }
}

export default function ManualReviewWorkspace() {
  const [rows, setRows] = useState<EditableRow[]>([createEditableRow(1)])
  const [nextRowId, setNextRowId] = useState(2)
  const [result, setResult] = useState<ManualReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importedOcrRowCount, setImportedOcrRowCount] = useState(0)
  const submitLock = useRef(false)

  useEffect(() => {
    try {
      const handoff = consumeOcrManualReviewHandoff(window.sessionStorage)
      if (!handoff) {
        return
      }

      const drafts = handoff.rows.map(toManualReviewOcrDraft)
      if (drafts.length === 0) {
        return
      }

      setRows(
        drafts.map((draft, index) =>
          createEditableRow(index + 1, String(draft.rowNumber), draft)
        )
      )
      setNextRowId(drafts.length + 1)
      setImportedOcrRowCount(drafts.length)
    } catch {
      // Session storage is optional. The manual workflow remains available.
    }
  }, [])

  const updateRow = <Field extends keyof EditableRow>(
    id: number,
    field: Field,
    value: EditableRow[Field]
  ) => {
    if (isSubmitting) {
      return
    }

    setResult(null)
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const addRow = () => {
    if (isSubmitting) {
      return
    }

    setResult(null)
    setRows((currentRows) => [
      ...currentRows,
      createEditableRow(nextRowId, String(currentRows.length + 1)),
    ])
    setNextRowId((current) => current + 1)
  }

  const removeRow = (id: number) => {
    if (isSubmitting) {
      return
    }

    setResult(null)
    setRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((row) => row.id !== id)
        : currentRows
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current) {
      return
    }

    setError(null)

    const convertedRows: ManualReviewRowInput[] = []
    for (const row of rows) {
      const converted = validateAndConvertRow(row)
      if (typeof converted === 'string') {
        setError(converted)
        return
      }
      convertedRows.push(converted)
    }

    const [duplicateSourceRow] = findDuplicateSourceRows(convertedRows)
    if (duplicateSourceRow) {
      setError(
        `אותה שורת מקור נכללה פעמיים (שורות טופס ${duplicateSourceRow.firstInputIndex + 1} ו-${duplicateSourceRow.duplicateInputIndex + 1}). הסר או תקן אחת מהן.`
      )
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    setResult(null)
    try {
      const response = await fetch('/api/manual-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: convertedRows }),
      })
      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const duplicate = manualReviewDuplicateSourceErrorFromResponse(
          body,
          convertedRows.length,
          response.status
        )
        setError(
          duplicate
            ? duplicateSourceErrorText(duplicate)
            : MANUAL_REVIEW_FAILURE_TEXT[
                manualReviewFailureCodeFromResponse(body, response.status)
              ]
        )
        return
      }

      if (!isManualReviewResult(body)) {
        setError(MANUAL_REVIEW_FAILURE_TEXT.UNKNOWN)
        return
      }

      setResult(body)
    } catch {
      setError(MANUAL_REVIEW_FAILURE_TEXT.UNKNOWN)
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  const totalCases = result
    ? result.totals.reduce((sum, total) => sum + total.cases.value, 0)
    : 0
  const totalUnits = result
    ? result.totals.reduce((sum, total) => sum + total.units.value, 0)
    : 0

  return (
    <div className="manual-review">
      <section className="manual-review__intro">
        <h1>הזנה ידנית ובדיקת ליקוט</h1>
        <p>
          הזן כל שורה כפי שנקראה מהמסמך. מארזים ובודדים נשמרים בשני שדות
          נפרדים, ללא חלוקה אוטומטית לפי גודל המארז.
        </p>
      </section>

      {importedOcrRowCount > 0 && (
        <p className="manual-review__notice" role="status">
          הועברו {importedOcrRowCount} טיוטות OCR לבדיקה. המזהים והטקסט ניתנים
          לעריכה; שלוש כמויות המקור מוצגות להשוואה בלבד. שדות המארזים והבודדים
          נשארו ריקים וחובה למלא אותם במפורש מול המסמך.
        </p>
      )}

      <form className="manual-review__form" onSubmit={submit}>
        {rows.map((row, index) => (
          <fieldset
            className="manual-review__row"
            disabled={isSubmitting}
            key={row.id}
          >
            <legend>שורת מקור {index + 1}</legend>
            {row.ocrSourceQuantities && (
              <aside className="manual-review__ocr-draft">
                <strong>טיוטת OCR להשוואה בלבד</strong>
                <p>
                  מארזים במסמך:{' '}
                  {displaySourceQuantity(row.ocrSourceQuantities.caseQuantity)} ·
                  יחידות באריזה:{' '}
                  {displaySourceQuantity(row.ocrSourceQuantities.unitsPerCase)} ·
                  כמות כוללת במסמך:{' '}
                  {displaySourceQuantity(row.ocrSourceQuantities.totalUnits)}
                </p>
                <p>
                  הערכים האלה אינם מוזנים לשירות. בדוק את המסמך והקלד מארזים
                  ובודדים במפורש בשדות שלמטה.
                </p>
              </aside>
            )}
            <div className="manual-review__grid">
              <label>
                עמוד
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.pageNumber}
                  onChange={(event) =>
                    updateRow(row.id, 'pageNumber', event.target.value)
                  }
                  required
                />
              </label>
              <label>
                שורה
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.rowNumber}
                  onChange={(event) =>
                    updateRow(row.id, 'rowNumber', event.target.value)
                  }
                  required
                />
              </label>
              <label>
                שם פריט
                <input
                  value={row.productName}
                  onChange={(event) =>
                    updateRow(row.id, 'productName', event.target.value)
                  }
                />
              </label>
              <label>
                ברקוד
                <input
                  inputMode="numeric"
                  value={row.barcode}
                  onChange={(event) =>
                    updateRow(row.id, 'barcode', event.target.value)
                  }
                />
              </label>
              <label>
                SKU
                <input
                  value={row.sku}
                  onChange={(event) => updateRow(row.id, 'sku', event.target.value)}
                />
              </label>
              <label>
                מארזים
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={row.cases}
                  onChange={(event) => updateRow(row.id, 'cases', event.target.value)}
                  required
                />
              </label>
              <label>
                בודדים
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={row.units}
                  onChange={(event) => updateRow(row.id, 'units', event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="manual-review__raw-text">
              טקסט מקור
              <textarea
                value={row.rawText}
                onChange={(event) => updateRow(row.id, 'rawText', event.target.value)}
                required
              />
            </label>
            <button
              className="manual-review__secondary-button"
              type="button"
              disabled={rows.length === 1 || isSubmitting}
              onClick={() => removeRow(row.id)}
            >
              הסר שורה
            </button>
          </fieldset>
        ))}

        {error && (
          <p className="manual-review__error" role="alert">
            {error}
          </p>
        )}

        <div className="manual-review__actions">
          <button
            className="manual-review__secondary-button"
            type="button"
            onClick={addRow}
            disabled={isSubmitting}
          >
            הוסף שורה
          </button>
          <button className="manual-review__primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'בודק…' : 'בדוק שורות'}
          </button>
        </div>
      </form>

      {result && (
        <section className="manual-review__result" aria-live="polite">
          <h2>תוצאת הבדיקה</h2>
          <p>
            קטלוג גרסה {result.catalog.version}: {result.catalog.verifiedProducts}{' '}
            מתוך {result.catalog.totalProducts} פריטים מאומתים.
          </p>
          {result.catalog.verifiedProducts === 0 && (
            <p className="manual-review__notice">
              הקטלוג אינו מאומת עדיין, לכן לא תופק רשימת ליקוט תפעולית עד
              לאימות הרשומות.
            </p>
          )}
          <SummaryCards
            totalProducts={result.totals.length}
            totalCases={totalCases}
            totalUnits={totalUnits}
            pendingReviewCount={result.issues.length}
          />
          <ResultsTable totals={result.totals} />

          {result.issues.length > 0 && (
            <div className="manual-review__issues">
              <h3>שורות לבדיקה</h3>
              <div className="manual-review__table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>עמוד</th>
                      <th>שורה</th>
                      <th>קוד</th>
                      <th>הסבר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.issues.map((issue, index) => {
                      const presentation = manualReviewIssuePresentation(issue.code)

                      return (
                        <tr key={index}>
                          <td>{issue.source?.page.pageNumber ?? '—'}</td>
                          <td>{issue.source?.row.rowNumber ?? '—'}</td>
                          <td>{presentation.label}</td>
                          <td>{presentation.message}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
