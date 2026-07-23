'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import ResultsTable from '@/components/ResultsTable'
import SummaryCards from '@/components/SummaryCards'
import type { VerifiedCatalogReadiness } from '@/lib/catalog'
import { sourceReferencePresentation } from '@/lib/traceability/source-presentation'
import type {
  ManualReviewResult,
  ManualReviewRowInput,
} from '@/lib/manual-review'
import {
  consumeOcrManualReviewHandoff,
  findDuplicateSourceRows,
  getManualReviewCatalogReadinessState,
  getManualReviewRowReadiness,
  manualReviewDuplicateSourceErrorFromResponse,
  manualReviewFailureCodeFromResponse,
  manualReviewIssuePresentation,
  manualReviewResultFromResponse,
  packingSuggestionFailureCodeFromResponse,
  packingSuggestionFromResponse,
  summarizeManualReviewResult,
  toManualReviewOcrDraft,
  type ManualReviewOcrDraft,
  type ManualReviewDuplicateSourceError,
  type ManualReviewFailureCode,
  type PackingSuggestionFailureCode,
  type PackingSuggestionResponse,
  type PackingSuggestionReviewCode,
  type PackingSuggestionRule,
} from '@/lib/manual-review'

interface ManualReviewWorkspaceProps {
  catalogReadiness: VerifiedCatalogReadiness
}

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

type AvailablePackingSuggestionResponse = Extract<
  PackingSuggestionResponse,
  { status: 'AVAILABLE' }
>

type ReviewRequiredPackingSuggestionResponse = Extract<
  PackingSuggestionResponse,
  { status: 'REVIEW_REQUIRED' }
>

type PackingSuggestionState =
  | { kind: 'IDLE' }
  | { kind: 'LOADING' }
  | {
      kind: 'AVAILABLE'
      suggestion: AvailablePackingSuggestionResponse
      applied: boolean
    }
  | {
      kind: 'REVIEW_REQUIRED'
      suggestion: ReviewRequiredPackingSuggestionResponse
    }
  | { kind: 'FAILED'; code: PackingSuggestionFailureCode }

const MANUAL_REVIEW_FAILURE_TEXT: Record<ManualReviewFailureCode, string> = {
  INVALID_MANUAL_REVIEW_INPUT:
    'לא ניתן לבדוק את השורות שנשלחו. יש לבדוק את השדות ולנסות שוב.',
  CATALOG_UNAVAILABLE:
    'קטלוג המוצרים המאומת אינו זמין כרגע. נסה שוב מאוחר יותר.',
  UNKNOWN:
    'לא ניתן להשלים את הבדיקה כרגע. נסה שוב מאוחר יותר.',
}

const PACKING_SUGGESTION_FAILURE_TEXT: Record<
  PackingSuggestionFailureCode,
  string
> = {
  INVALID_PACKING_SUGGESTION_INPUT:
    'לא ניתן לחשב הצעת אריזה עבור השורה. בדוק את מזהי הפריט ואת כמויות המקור.',
  PACKING_SUGGESTION_UNAVAILABLE:
    'שירות הצעת האריזה אינו זמין כרגע. אפשר להמשיך בהזנה ידנית.',
  UNKNOWN: 'לא ניתן לחשב הצעת אריזה כרגע. אפשר להמשיך בהזנה ידנית.',
}

const PACKING_SUGGESTION_REVIEW_TEXT: Record<
  PackingSuggestionReviewCode,
  string
> = {
  SOURCE_PRODUCT_NAME_MISSING:
    'חסר שם פריט ממקור ה־OCR, ולכן אין אפשרות לבדוק סימון אריזה.',
  SOURCE_MARKER_MISSING:
    'לא נמצא בשם הפריט סימון אריזה מאושר. יש למלא את הכמויות ידנית מול המקור.',
  SOURCE_MARKER_AMBIGUOUS:
    'נמצאו יותר מסימון אריזה אחד. יש למלא את הכמויות ידנית מול המקור.',
  SOURCE_QUANTITIES_INCOMPLETE:
    'שלוש כמויות המקור אינן שלמות וברורות. יש למלא את הכמויות ידנית.',
  SOURCE_QUANTITIES_INCONSISTENT:
    'שלוש כמויות המקור אינן מתאימות זו לזו. יש לבדוק את המסמך ידנית.',
  PRODUCT_UNRESOLVED:
    'לא נמצאה התאמה יחידה לפריט בקטלוג המאומת.',
  PRODUCT_CONFLICT:
    'מזהי הפריט מצביעים על יותר ממוצר אחד בקטלוג.',
  PRODUCT_UNVERIFIED: 'הפריט עדיין אינו מאומת לשימוש תפעולי.',
  CATALOG_PACK_SIZE_MISSING: 'חסר גודל מארז מאומת בקטלוג עבור הפריט.',
  CATALOG_PACK_SIZE_CONFLICT:
    'גודל האריזה בשם הפריט שונה מגודל המארז בקטלוג. אין להמיר אוטומטית.',
  CATALOG_PICKING_POLICY_CONFLICT:
    'סימון האריזה אינו תואם את מדיניות הליקוט המאומתת בקטלוג.',
}

const PACKING_SUGGESTION_RULE_TEXT: Record<PackingSuggestionRule, string> = {
  CASE_ONLY_FRACTION: 'סימון 1/N — מארזים בלבד',
  INDIVIDUAL_PICKING_PARENTHESES: 'מספר בסוגריים — ליקוט בודדים',
}

const CATALOG_READINESS_TEXT = {
  NO_VERIFIED_PRODUCTS: {
    title: 'אין עדיין פריטים מאומתים בקטלוג.',
    message:
      'אפשר למלא ולבדוק את השורות, אך הן יישארו בחריגים ולא ייכנסו לסיכום תפעולי עד לעדכון קטלוג מבוקר.',
  },
  PARTIALLY_VERIFIED_PRODUCTS: {
    title: 'הקטלוג מאומת באופן חלקי.',
    message:
      'רק שורה עם התאמה ייחודית לפריט מאומת יכולה להיכנס לסיכום תפעולי. כל השאר יישארו לבדיקה.',
  },
  ALL_PRODUCTS_VERIFIED: {
    title: 'כל פריטי הקטלוג מסומנים כמאומתים.',
    message:
      'שורות עדיין דורשות התאמה ייחודית ובדיקת מקור לפני שהן נכנסות לסיכום תפעולי.',
  },
} as const

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

function duplicateSourceErrorText(
  duplicate: ManualReviewDuplicateSourceError
): string {
  return `אותה שורת מקור נכללה פעמיים (שורות טופס ${duplicate.duplicateOfRow} ו-${duplicate.row}). הסר או תקן אחת מהן.`
}

function displaySourceQuantity(value: number | null): string {
  return value === null ? 'לא זוהה' : String(value)
}

function hasExplicitManualQuantities(row: EditableRow): boolean {
  return row.cases.trim().length > 0 || row.units.trim().length > 0
}

export default function ManualReviewWorkspace({
  catalogReadiness,
}: ManualReviewWorkspaceProps) {
  const [rows, setRows] = useState<EditableRow[]>([createEditableRow(1)])
  const [nextRowId, setNextRowId] = useState(2)
  const [result, setResult] = useState<ManualReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importedOcrRowCount, setImportedOcrRowCount] = useState(0)
  const [packingSuggestionStates, setPackingSuggestionStates] = useState<
    Record<number, PackingSuggestionState>
  >({})
  const submitLock = useRef(false)
  const packingSuggestionRequestIds = useRef<Record<number, number>>({})

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
    if (
      field === 'productName' ||
      field === 'barcode' ||
      field === 'sku'
    ) {
      packingSuggestionRequestIds.current[id] =
        (packingSuggestionRequestIds.current[id] ?? 0) + 1
      setPackingSuggestionStates((current) => {
        const { [id]: _discarded, ...remaining } = current
        return remaining
      })
    }
    if (field === 'cases' || field === 'units') {
      setPackingSuggestionStates((current) => {
        const state = current[id]
        if (state?.kind !== 'AVAILABLE' || !state.applied) {
          return current
        }

        return {
          ...current,
          [id]: { ...state, applied: false },
        }
      })
    }
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
    packingSuggestionRequestIds.current[id] =
      (packingSuggestionRequestIds.current[id] ?? 0) + 1
    setPackingSuggestionStates((current) => {
      const { [id]: _discarded, ...remaining } = current
      return remaining
    })
    setRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((row) => row.id !== id)
        : currentRows
    )
  }

  const requestPackingSuggestion = async (row: EditableRow) => {
    if (isSubmitting || !row.ocrSourceQuantities) {
      return
    }

    const requestId = (packingSuggestionRequestIds.current[row.id] ?? 0) + 1
    packingSuggestionRequestIds.current[row.id] = requestId
    setPackingSuggestionStates((current) => ({
      ...current,
      [row.id]: { kind: 'LOADING' },
    }))

    try {
      const response = await fetch('/api/manual-review/packing-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: row.productName,
          barcode: row.barcode,
          sku: row.sku,
          sourceQuantities: row.ocrSourceQuantities,
        }),
      })
      const body: unknown = await response.json().catch(() => null)
      if (packingSuggestionRequestIds.current[row.id] !== requestId) {
        return
      }

      if (!response.ok) {
        setPackingSuggestionStates((current) => ({
          ...current,
          [row.id]: {
            kind: 'FAILED',
            code: packingSuggestionFailureCodeFromResponse(body, response.status),
          },
        }))
        return
      }

      const suggestion = packingSuggestionFromResponse(body)
      if (!suggestion) {
        setPackingSuggestionStates((current) => ({
          ...current,
          [row.id]: { kind: 'FAILED', code: 'UNKNOWN' },
        }))
        return
      }

      setPackingSuggestionStates((current) => ({
        ...current,
        [row.id]:
          suggestion.status === 'AVAILABLE'
            ? { kind: 'AVAILABLE', suggestion, applied: false }
            : { kind: 'REVIEW_REQUIRED', suggestion },
      }))
    } catch {
      if (packingSuggestionRequestIds.current[row.id] === requestId) {
        setPackingSuggestionStates((current) => ({
          ...current,
          [row.id]: { kind: 'FAILED', code: 'UNKNOWN' },
        }))
      }
    }
  }

  const applyPackingSuggestion = (
    row: EditableRow,
    suggestion: AvailablePackingSuggestionResponse
  ) => {
    if (isSubmitting || hasExplicitManualQuantities(row)) {
      return
    }

    setResult(null)
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.id === row.id
          ? {
              ...currentRow,
              cases: String(suggestion.cases),
              units: String(suggestion.units),
            }
          : currentRow
      )
    )
    setPackingSuggestionStates((current) => ({
      ...current,
      [row.id]: { kind: 'AVAILABLE', suggestion, applied: true },
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current) {
      return
    }

    setError(null)

    const convertedRows: ManualReviewRowInput[] = []
    for (const [index, row] of rows.entries()) {
      const readiness = getManualReviewRowReadiness(row)
      if (!readiness.input) {
        setError(`יש לתקן את שורת הטופס ${index + 1}: ${readiness.summary}.`)
        return
      }
      convertedRows.push(readiness.input)
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

      const parsedResult = manualReviewResultFromResponse(
        body,
        convertedRows.length
      )
      if (!parsedResult) {
        setError(MANUAL_REVIEW_FAILURE_TEXT.UNKNOWN)
        return
      }

      setResult(parsedResult)
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
  const resultSummary = result ? summarizeManualReviewResult(result) : null
  const rowReadiness = rows.map((row) => getManualReviewRowReadiness(row))
  const readyRowCount = rowReadiness.filter((readiness) => readiness.isReady).length
  const catalogReadinessState = getManualReviewCatalogReadinessState(
    catalogReadiness
  )
  const catalogReadinessText = CATALOG_READINESS_TEXT[catalogReadinessState]

  return (
    <div className="manual-review">
      <section className="manual-review__intro">
        <h1>הזנה ידנית ובדיקת ליקוט</h1>
        <p>
          הזן כל שורה כפי שנקראה מהמסמך. מארזים ובודדים נשמרים בשני שדות
          נפרדים, ללא חלוקה אוטומטית לפי גודל המארז.
        </p>
      </section>

      <aside
        className={
          catalogReadinessState === 'ALL_PRODUCTS_VERIFIED'
            ? 'manual-review__catalog-readiness manual-review__catalog-readiness--ready'
            : 'manual-review__catalog-readiness'
        }
        role="status"
      >
        <strong>{catalogReadinessText.title}</strong>
        <p>
          גרסת קטלוג {catalogReadiness.version}: {catalogReadiness.verifiedProducts}{' '}
          מאומתים מתוך {catalogReadiness.totalProducts} פריטים.{' '}
          {catalogReadinessText.message}
        </p>
        {catalogReadinessState === 'NO_VERIFIED_PRODUCTS' && (
          <Link className="manual-review__secondary-button" href="/settings">
            עבור להגדרות הקטלוג
          </Link>
        )}
      </aside>

      {importedOcrRowCount > 0 && (
        <p className="manual-review__notice" role="status">
          הועברו {importedOcrRowCount} טיוטות OCR לבדיקה. המזהים והטקסט ניתנים
          לעריכה; שלוש כמויות המקור מוצגות להשוואה בלבד. שדות המארזים והבודדים
          נשארו ריקים וחובה למלא אותם במפורש מול המסמך.
        </p>
      )}

      <form className="manual-review__form" onSubmit={submit}>
        <p className="manual-review__readiness-summary">
          מוכנות לבדיקה: {readyRowCount} מתוך {rows.length} שורות
        </p>
        {rows.map((row, index) => {
          const readiness = rowReadiness[index]
          const readinessId = `manual-review-row-${row.id}-readiness`
          const packingSuggestionState =
            packingSuggestionStates[row.id] ?? ({ kind: 'IDLE' } as const)
          const manualQuantitiesAlreadyEntered = hasExplicitManualQuantities(row)

          return (
            <fieldset
              aria-describedby={readinessId}
              className="manual-review__row"
              disabled={isSubmitting}
              key={row.id}
            >
              <legend>שורת מקור {index + 1}</legend>
              <p
                className={
                  readiness.isReady
                    ? 'manual-review__row-readiness manual-review__row-readiness--ready'
                    : 'manual-review__row-readiness'
                }
                id={readinessId}
              >
                {readiness.summary}
              </p>
              {row.ocrSourceQuantities && (
                <>
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
                      הערכים אינם נשלחים לבדיקת השורות. אפשר לבקש עבורם במפורש
                      הצעת אריזה בלבד, או לבדוק את המסמך ולהקליד מארזים ובודדים
                      בשדות שלמטה.
                    </p>
                  </aside>
                  <aside className="manual-review__packing-suggestion" aria-live="polite">
                    <strong>הצעת חישוב אריזה (אופציונלי)</strong>
                    <p>
                      החישוב משתמש רק בשלוש כמויות מקור נפרדות, בסימון האריזה
                      בשם הפריט ובקטלוג המאומת. הוא לא משנה את השורה עד ללחיצה
                      מפורשת על “החל הצעה”.
                    </p>
                    {packingSuggestionState.kind === 'LOADING' && (
                      <p className="manual-review__packing-suggestion-status">
                        מחשב הצעה לבדיקה…
                      </p>
                    )}
                    {packingSuggestionState.kind === 'AVAILABLE' && (
                      <p className="manual-review__packing-suggestion-status manual-review__packing-suggestion-status--available">
                        {packingSuggestionState.applied
                          ? 'ההצעה הוחלה על השדות. עדיין יש לאמת את הכמות מול המסמך לפני שליחת הבדיקה.'
                          : `הצעה: ${packingSuggestionState.suggestion.cases} מארזים ו־${packingSuggestionState.suggestion.units} בודדים (${PACKING_SUGGESTION_RULE_TEXT[packingSuggestionState.suggestion.rule]}, גודל מארז ${packingSuggestionState.suggestion.packSize}).`}
                      </p>
                    )}
                    {packingSuggestionState.kind === 'REVIEW_REQUIRED' && (
                      <p className="manual-review__packing-suggestion-status">
                        {PACKING_SUGGESTION_REVIEW_TEXT[
                          packingSuggestionState.suggestion.code
                        ]}
                      </p>
                    )}
                    {packingSuggestionState.kind === 'FAILED' && (
                      <p className="manual-review__packing-suggestion-status">
                        {PACKING_SUGGESTION_FAILURE_TEXT[
                          packingSuggestionState.code
                        ]}
                      </p>
                    )}
                    {manualQuantitiesAlreadyEntered &&
                      (packingSuggestionState.kind !== 'AVAILABLE' ||
                        !packingSuggestionState.applied) && (
                        <p className="manual-review__packing-suggestion-status">
                          כבר הוזנו מארזים או בודדים. ההצעה לא תדרוס ערכים ידניים.
                        </p>
                      )}
                    <div className="manual-review__packing-suggestion-actions">
                      <button
                        className="manual-review__secondary-button"
                        type="button"
                        disabled={
                          isSubmitting || packingSuggestionState.kind === 'LOADING'
                        }
                        onClick={() => requestPackingSuggestion(row)}
                      >
                        {packingSuggestionState.kind === 'LOADING'
                          ? 'מחשב…'
                          : 'חשב הצעת אריזה'}
                      </button>
                      {packingSuggestionState.kind === 'AVAILABLE' && (
                        <button
                          className="manual-review__primary-button"
                          type="button"
                          disabled={
                            isSubmitting ||
                            manualQuantitiesAlreadyEntered ||
                            packingSuggestionState.applied
                          }
                          onClick={() =>
                            applyPackingSuggestion(
                              row,
                              packingSuggestionState.suggestion
                            )
                          }
                        >
                          {packingSuggestionState.applied
                            ? 'ההצעה הוחלה'
                            : 'החל הצעה על השדות'}
                        </button>
                      )}
                    </div>
                  </aside>
                </>
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
          )
        })}

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

      {result && resultSummary && (
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
          <div className="manual-review__outcome" role="status">
            <strong>
              {resultSummary.acceptedRowCount} מתוך {resultSummary.totalRowCount}{' '}
              שורות נכנסו לסיכום התפעולי.
            </strong>
            {resultSummary.excludedRowCount > 0 ? (
              <span>
                {resultSummary.excludedRowCount} שורות לא נכנסו לסיכום ומופיעות
                לבדיקה.
              </span>
            ) : (
              <span>כל השורות שנשלחו נכנסו לסיכום התפעולי.</span>
            )}
            {resultSummary.warningCount > 0 && (
              <span>
                {resultSummary.warningCount} אזהרות אינן מוציאות שורה מהסיכום;
                יש לבדוק אותן מול המקור.
              </span>
            )}
          </div>
          <SummaryCards
            totalProducts={result.totals.length}
            totalCases={totalCases}
            totalUnits={totalUnits}
            excludedRowCount={resultSummary.excludedRowCount}
            warningCount={resultSummary.warningCount}
          />
          <ResultsTable totals={result.totals} />

          {result.issues.length > 0 && (
            <div className="manual-review__issues">
              <h3>חריגים ואזהרות לבדיקה</h3>
              <div className="manual-review__table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>מסמך</th>
                      <th>עמוד</th>
                      <th>שורה</th>
                      <th>קוד</th>
                      <th>הסבר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.issues.map((issue, index) => {
                      const presentation = manualReviewIssuePresentation(issue.code)
                      const source = issue.source
                        ? sourceReferencePresentation(issue.source)
                        : null

                      return (
                        <tr key={index}>
                          <td>{source?.documentOrdinal ?? '—'}</td>
                          <td>{source?.pageNumber ?? '—'}</td>
                          <td>{source?.rowNumber ?? '—'}</td>
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
