'use client'

import { type FormEvent, useState } from 'react'
import ResultsTable from '@/components/ResultsTable'
import SummaryCards from '@/components/SummaryCards'
import type {
  ManualReviewResult,
  ManualReviewRowInput,
} from '@/lib/manual-review'

interface EditableRow {
  id: number
  sourceFileName: string
  pageNumber: string
  rowNumber: string
  rawText: string
  productName: string
  barcode: string
  sku: string
  cases: string
  units: string
}

function createEditableRow(id: number, rowNumber = '1'): EditableRow {
  return {
    id,
    sourceFileName: '',
    pageNumber: '1',
    rowNumber,
    rawText: '',
    productName: '',
    barcode: '',
    sku: '',
    cases: '0',
    units: '0',
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

function errorFromResponse(value: unknown): string | null {
  return isRecord(value) && typeof value.error === 'string' ? value.error : null
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
    ...(row.sourceFileName.trim()
      ? { sourceFileName: row.sourceFileName }
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

  const updateRow = <Field extends keyof EditableRow>(
    id: number,
    field: Field,
    value: EditableRow[Field]
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const addRow = () => {
    setRows((currentRows) => [
      ...currentRows,
      createEditableRow(nextRowId, String(currentRows.length + 1)),
    ])
    setNextRowId((current) => current + 1)
  }

  const removeRow = (id: number) => {
    setRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((row) => row.id !== id)
        : currentRows
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/manual-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: convertedRows }),
      })
      const body: unknown = await response.json()

      if (!response.ok) {
        throw new Error(errorFromResponse(body) ?? 'הבדיקה לא הושלמה.')
      }

      if (!isManualReviewResult(body)) {
        throw new Error('התקבלה תשובה לא תקינה מהשירות.')
      }

      setResult(body)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'אירעה שגיאה לא צפויה בעת הבדיקה.'
      )
    } finally {
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

      <form className="manual-review__form" onSubmit={submit}>
        {rows.map((row, index) => (
          <fieldset className="manual-review__row" key={row.id}>
            <legend>שורת מקור {index + 1}</legend>
            <div className="manual-review__grid">
              <label>
                קובץ מקור (אופציונלי)
                <input
                  value={row.sourceFileName}
                  onChange={(event) =>
                    updateRow(row.id, 'sourceFileName', event.target.value)
                  }
                />
              </label>
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
                    {result.issues.map((issue, index) => (
                      <tr key={`${issue.code}-${index}`}>
                        <td>{issue.source?.page.pageNumber ?? '—'}</td>
                        <td>{issue.source?.row.rowNumber ?? '—'}</td>
                        <td>{issue.code}</td>
                        <td>{issue.message}</td>
                      </tr>
                    ))}
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
