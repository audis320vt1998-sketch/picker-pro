'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ResultsTable from '@/components/ResultsTable'
import RouteReviewSummary from '@/components/RouteReviewSummary'
import SummaryCards from '@/components/SummaryCards'
import type { ProductTotals } from '@/lib/domain/types'
import {
  createVerifiedResultCsv,
  createVerifiedResultCsvFilename,
  readSavedReviewJobs,
  removeSavedReviewJob,
  SAVED_REVIEW_JOB_TTL_MS,
  type ManualReviewRouteSummary,
  type SavedReviewJobV1,
  type SavedReviewProductTotal,
  type SavedReviewSourceReference,
} from '@/lib/manual-review'
import type { SourceReference } from '@/lib/traceability/types'

interface SavedReviewResultsWorkspaceProps {
  jobId?: string
  initialDeleted?: boolean
}

const DELETION_STATUS_MESSAGE = 'התוצאה השמורה נמחקה מהמכשיר הזה.'

function sourceReferenceFromSaved(
  source: SavedReviewSourceReference
): SourceReference {
  return {
    page: {
      jobId: 'saved-review',
      ...(source.documentOrdinal ? { documentOrdinal: source.documentOrdinal } : {}),
      pageNumber: source.pageNumber,
    },
    row: { rowNumber: source.rowNumber },
  }
}

function totalsFromSaved(
  totals: readonly SavedReviewProductTotal[]
): ProductTotals[] {
  return totals.map((total, index) => ({
    product: {
      productKey: `saved-review-product-${index + 1}`,
      ...(total.barcode ? { barcode: total.barcode } : {}),
      ...(total.sku ? { sku: total.sku } : {}),
      name: total.productName,
      resolvedBy: 'name',
    },
    cases: {
      value: total.cases,
      sources: total.caseSources.map(sourceReferenceFromSaved),
    },
    units: {
      value: total.units,
      sources: total.unitSources.map(sourceReferenceFromSaved),
    },
  }))
}

function routeSummariesFromSaved(
  job: SavedReviewJobV1
): ManualReviewRouteSummary[] {
  return job.routeSummaries.map((summary) => ({
    routeCode: summary.routeCode,
    totals: totalsFromSaved(summary.totals),
    acceptedRowCount: summary.acceptedRowCount,
    totalRowCount: summary.totalRowCount,
  }))
}

function savedAtText(savedAtMs: number): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(savedAtMs))
  } catch {
    return 'זמן שמירה מקומי'
  }
}

function reviewTotals(job: SavedReviewJobV1) {
  return job.totals.reduce(
    (summary, total) => ({
      cases: summary.cases + total.cases,
      units: summary.units + total.units,
    }),
    { cases: 0, units: 0 }
  )
}

function SavedReviewDeleteAction({
  jobId,
  pendingDeleteId,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  jobId: string
  pendingDeleteId: string | null
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
  onConfirmDelete: (id: string) => void
}) {
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const deleteConfirmationRef = useRef<HTMLButtonElement>(null)
  const isDeleteConfirmationOpen = pendingDeleteId === jobId
  const confirmationId = `delete-confirmation-${jobId}`
  const descriptionId = `${confirmationId}-description`

  useEffect(() => {
    if (isDeleteConfirmationOpen) {
      deleteConfirmationRef.current?.focus()
    }
  }, [isDeleteConfirmationOpen])

  const cancelDelete = () => {
    onCancelDelete()
    window.requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }

  if (!isDeleteConfirmationOpen) {
    return (
      <button
        ref={deleteTriggerRef}
        aria-controls={confirmationId}
        aria-expanded={false}
        className="manual-review__secondary-button"
        onClick={() => onRequestDelete(jobId)}
        type="button"
      >
        מחק תוצאה שמורה
      </button>
    )
  }

  return (
    <div
      id={confirmationId}
      className="saved-results__delete-confirmation"
      role="group"
      aria-describedby={descriptionId}
    >
      <p id={descriptionId}>
        המחיקה תסיר את התוצאה רק מהדפדפן והמכשיר הנוכחיים.
      </p>
      <button
        ref={deleteConfirmationRef}
        aria-describedby={descriptionId}
        className="manual-review__primary-button"
        onClick={() => onConfirmDelete(jobId)}
        type="button"
      >
        אשר מחיקה
      </button>
      <button
        className="manual-review__secondary-button"
        onClick={cancelDelete}
        type="button"
      >
        ביטול
      </button>
    </div>
  )
}

export default function SavedReviewResultsWorkspace({
  jobId,
  initialDeleted = false,
}: SavedReviewResultsWorkspaceProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<readonly SavedReviewJobV1[] | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [deletionStatus, setDeletionStatus] = useState<string | null>(
    initialDeleted ? DELETION_STATUS_MESSAGE : null
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
  const focusResultsHeadingAfterDelete = useRef(initialDeleted)

  const reloadJobs = useCallback(() => {
    try {
      const loaded = readSavedReviewJobs(window.localStorage)
      if (loaded.status !== 'LOADED') {
        setJobs([])
        setStorageUnavailable(true)
        return
      }

      setJobs(loaded.jobs)
      setStorageUnavailable(false)
    } catch {
      setJobs([])
      setStorageUnavailable(true)
    }
  }, [])

  useEffect(() => {
    if (!jobId && initialDeleted) {
      focusResultsHeadingAfterDelete.current = true
      const url = new URL(window.location.href)
      if (url.searchParams.get('deleted') === '1') {
        url.searchParams.delete('deleted')
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Saved jobs are client-only localStorage state and cannot be read during SSR.
    reloadJobs()
  }, [initialDeleted, jobId, reloadJobs])

  useEffect(() => {
    if (focusResultsHeadingAfterDelete.current && jobs !== null) {
      focusResultsHeadingAfterDelete.current = false
      resultsHeadingRef.current?.focus()
    }
  }, [jobs])

  const selectedJob = useMemo(
    () => (jobId && jobs ? jobs.find((job) => job.id === jobId) ?? null : null),
    [jobId, jobs]
  )

  const confirmDelete = (id: string) => {
    try {
      if (!removeSavedReviewJob(window.localStorage, id)) {
        setError('לא ניתן למחוק את התוצאה השמורה. נסה שוב.')
        return
      }

      setPendingDeleteId(null)
      setError(null)
      if (jobId === id) {
        router.replace('/results?deleted=1')
        return
      }

      setDeletionStatus(DELETION_STATUS_MESSAGE)
      focusResultsHeadingAfterDelete.current = true
      reloadJobs()
    } catch {
      setError('לא ניתן למחוק את התוצאה השמורה. נסה שוב.')
    }
  }

  const requestDelete = (id: string) => {
    setError(null)
    setDeletionStatus(null)
    setPendingDeleteId(id)
  }

  const cancelDelete = () => {
    setPendingDeleteId(null)
  }

  const exportSavedResult = (id: string) => {
    setIsExporting(true)
    setExportError(null)
    setExportStatus(null)

    try {
      const loaded = readSavedReviewJobs(window.localStorage)
      if (loaded.status !== 'LOADED') {
        setExportError('לא ניתן לקרוא את התוצאה השמורה לצורך הורדה.')
        return
      }

      const currentJob = loaded.jobs.find((job) => job.id === id)
      if (!currentJob) {
        setExportError('התוצאה השמורה אינה זמינה עוד לצורך הורדה.')
        return
      }

      const csv = createVerifiedResultCsv(currentJob)
      if (!csv) {
        setExportError('לא ניתן להכין קובץ תקין מהתוצאה השמורה.')
        return
      }

      const urlApi = typeof URL === 'undefined' ? null : URL
      if (
        typeof Blob === 'undefined' ||
        !urlApi ||
        typeof urlApi.createObjectURL !== 'function' ||
        typeof urlApi.revokeObjectURL !== 'function'
      ) {
        setExportError('הדפדפן הזה אינו תומך בהורדת קובץ מקומי.')
        return
      }

      let url: string | null = null
      let link: HTMLAnchorElement | null = null
      try {
        url = urlApi.createObjectURL(
          new Blob([csv], { type: 'text/csv;charset=utf-8' })
        )
        link = document.createElement('a')
        link.href = url
        link.download = createVerifiedResultCsvFilename(currentJob.savedAtMs)
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        setExportStatus('הקובץ מוכן. אשר את הורדת הדפדפן אם התבקשת.')
      } finally {
        link?.remove()
        if (url) {
          const objectUrl = url
          window.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 1_000)
        }
      }
    } catch {
      setExportError('לא ניתן להכין את קובץ הסיכום. נסה שוב.')
    } finally {
      setIsExporting(false)
    }
  }

  if (jobs === null) {
    return (
      <main className="saved-results">
        <h1>תוצאות ליקוט שמורות</h1>
        <p role="status">טוען תוצאות שנשמרו במכשיר זה…</p>
      </main>
    )
  }

  if (jobId) {
    if (!selectedJob) {
      return (
        <main className="saved-results">
          <h1>התוצאה השמורה אינה זמינה</h1>
          <p role="status">
            {storageUnavailable
              ? 'לא ניתן לקרוא תוצאות שמורות בדפדפן זה.'
              : 'תוצאות נשמרות רק בדפדפן ובמכשיר שבו אושרה השמירה, ולמשך זמן מוגבל.'}
          </p>
          <div className="saved-results__actions">
            <Link className="manual-review__primary-button" href="/results">
              עבור לתוצאות שמורות
            </Link>
            <Link className="manual-review__secondary-button" href="/review">
              עבור לבדיקה ידנית
            </Link>
          </div>
        </main>
      )
    }

    const totals = totalsFromSaved(selectedJob.totals)
    const routes = routeSummariesFromSaved(selectedJob)
    const totalsSummary = reviewTotals(selectedJob)

    return (
      <main className="saved-results">
        <Link className="saved-results__back" href="/results">
          חזרה לכל התוצאות השמורות
        </Link>
        <h1>סיכום מאומת שמור</h1>
        <p>
          נשמרה ב־{savedAtText(selectedJob.savedAtMs)} בדפדפן זה בלבד. זו תצוגת
          סיכום מאומתת, לא רשימת ליקוט תפעולית ולא מקור להגשה חוזרת.
        </p>
        <p>
          קטלוג גרסה {selectedJob.catalog.version}: {selectedJob.catalog.verifiedProducts}{' '}
          מתוך {selectedJob.catalog.totalProducts} פריטים מאומתים בזמן השמירה.
        </p>
        <div className="manual-review__outcome" role="status">
          <strong>
            {selectedJob.acceptedRowCount} מתוך {selectedJob.totalRowCount} שורות
            נכנסו לסיכום התפעולי בזמן הבדיקה.
          </strong>
          <span>
            {selectedJob.totalRowCount - selectedJob.acceptedRowCount} שורות לא נכנסו
            לסיכום.
          </span>
          {selectedJob.warningCount > 0 && (
            <span>{selectedJob.warningCount} אזהרות נרשמו בזמן הבדיקה.</span>
          )}
        </div>
        <SummaryCards
          totalProducts={selectedJob.totals.length}
          totalCases={totalsSummary.cases}
          totalUnits={totalsSummary.units}
          excludedRowCount={selectedJob.totalRowCount - selectedJob.acceptedRowCount}
          warningCount={selectedJob.warningCount}
        />
        <section
          className="saved-results__export"
          aria-busy={isExporting}
          aria-labelledby="verified-result-export-title"
        >
          <h2 id="verified-result-export-title">הורדת CSV של סיכום מאומת</h2>
          <p id="verified-result-export-description">
            הקובץ יורד במכשיר זה בלבד ומכיל מק״ט, ברקוד, שם פריט, מארזים מאומתים
            ובודדים מאומתים. הוא אינו רשימת ליקוט ואינו כולל קווי חלוקה, שיוך
            לעיר, מקורות או פרטי לקוח.
          </p>
          <button
            aria-describedby="verified-result-export-description"
            className="manual-review__primary-button"
            disabled={isExporting}
            onClick={() => exportSavedResult(selectedJob.id)}
            type="button"
          >
            {isExporting ? 'מכין קובץ…' : 'הורד CSV של סיכום מאומת'}
          </button>
          {exportStatus && <p role="status">{exportStatus}</p>}
          {exportError && (
            <p className="manual-review__error" role="alert">
              {exportError}
            </p>
          )}
        </section>
        <section className="saved-results__privacy-note">
          <h2>מה נשמר</h2>
          <p>
            נשמרו רק פריטים מאומתים, מארזים, בודדים ומיקומי עמוד/שורה. לא נשמרו
            תמונות, קובצי מקור, טקסט OCR, כותרות מסמך או מזהים פנימיים.
          </p>
        </section>
        <ResultsTable totals={totals} />
        <RouteReviewSummary
          routeSummaries={routes}
          unassignedRouteAcceptedRowCount={
            selectedJob.unassignedRouteAcceptedRowCount
          }
          unassignedRouteRowCount={selectedJob.unassignedRouteRowCount}
        />
        <SavedReviewDeleteAction
          jobId={selectedJob.id}
          pendingDeleteId={pendingDeleteId}
          onCancelDelete={cancelDelete}
          onConfirmDelete={confirmDelete}
          onRequestDelete={requestDelete}
        />
        {error && (
          <p className="manual-review__error" role="alert">
            {error}
          </p>
        )}
      </main>
    )
  }

  return (
    <main className="saved-results">
      <h1 ref={resultsHeadingRef} tabIndex={-1}>
        תוצאות ליקוט שמורות
      </h1>
      <p>
        אלו תוצאות שנשמרו במפורש בדפדפן ובמכשיר הזה בלבד, למשך עד{' '}
        {Math.round(SAVED_REVIEW_JOB_TTL_MS / (60 * 60 * 1000))} שעות. אין כאן
        תמונות, קובצי מקור או טקסט OCR.
      </p>
      {deletionStatus && <p role="status">{deletionStatus}</p>}
      {storageUnavailable ? (
        <section className="saved-results__empty" role="status">
          <p>לא ניתן לקרוא תוצאות שמורות בדפדפן זה.</p>
          <Link className="manual-review__primary-button" href="/review">
            עבור לבדיקה ידנית
          </Link>
        </section>
      ) : jobs.length === 0 ? (
        <section className="saved-results__empty" role="status">
          <p>אין תוצאות שמורות זמינות במכשיר זה.</p>
          <Link className="manual-review__primary-button" href="/review">
            עבור לבדיקה ידנית
          </Link>
        </section>
      ) : (
        <div className="saved-results__list">
          {jobs.map((job) => {
            const totals = reviewTotals(job)
            return (
              <article className="saved-results__card" key={job.id}>
                <h2>תוצאה מ־{savedAtText(job.savedAtMs)}</h2>
                <p>
                  {job.acceptedRowCount} מתוך {job.totalRowCount} שורות נכנסו לסיכום
                  המאומת.
                </p>
                <dl>
                  <div>
                    <dt>פריטים</dt>
                    <dd>{job.totals.length}</dd>
                  </div>
                  <div>
                    <dt>מארזים</dt>
                    <dd>{totals.cases}</dd>
                  </div>
                  <div>
                    <dt>בודדים</dt>
                    <dd>{totals.units}</dd>
                  </div>
                  <div>
                    <dt>גרסת קטלוג</dt>
                    <dd>{job.catalog.version}</dd>
                  </div>
                </dl>
                <div className="saved-results__actions">
                  <Link className="manual-review__primary-button" href={`/results/${job.id}`}>
                    פתח תוצאה
                  </Link>
                  <SavedReviewDeleteAction
                    jobId={job.id}
                    pendingDeleteId={pendingDeleteId}
                    onCancelDelete={cancelDelete}
                    onConfirmDelete={confirmDelete}
                    onRequestDelete={requestDelete}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
      {error && (
        <p className="manual-review__error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
