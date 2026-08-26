import ResultsTable from '@/components/ResultsTable'
import type { ManualReviewResult } from '@/lib/manual-review'

interface RouteReviewSummaryProps {
  routeSummaries: ManualReviewResult['routeSummaries']
  unassignedRouteRowCount: number
  unassignedRouteAcceptedRowCount: number
}

/**
 * Displays a review-only breakdown after the server has evaluated the explicit
 * rows. It can also be rendered from a narrow local result snapshot, but is
 * never a delivery plan: no city mapping, route assignment, route export, or
 * saved pick list is created.
 */
export default function RouteReviewSummary({
  routeSummaries,
  unassignedRouteRowCount,
  unassignedRouteAcceptedRowCount,
}: RouteReviewSummaryProps) {
  return (
    <section className="route-review-summary">
      <h3>סיכום ביקורת לפי קווי חלוקה מאומתים</h3>
      <p>
        כל קבוצה מבוססת רק על קו שאושר בעמוד ה־OCR ועל שורות שעברו את הבדיקה
        הידנית. אין כאן שיוך לעיר, יצוא של קווי החלוקה או יצירת רשימת ליקוט שמורה.
      </p>

      {unassignedRouteRowCount > 0 && (
        <p className="route-review-summary__unassigned">
          {unassignedRouteRowCount} שורות נשלחו ללא קו חלוקה מאומת.{' '}
          {unassignedRouteAcceptedRowCount} מהן נכנסו לסיכום הכולל בלבד ולא
          משויכות לקו כלשהו.
        </p>
      )}

      {routeSummaries.length === 0 ? (
        <p className="route-review-summary__empty">
          לא נשלחו שורות עם קו חלוקה מאומת. הסיכום הכולל למעלה נשאר התוצאה
          המלאה של הבדיקה.
        </p>
      ) : (
        <div className="route-review-summary__groups">
          {routeSummaries.map((summary) => (
            <section className="route-review-summary__group" key={summary.routeCode}>
              <h4>
                קו חלוקה <span dir="ltr">{summary.routeCode}</span>
              </h4>
              <p>
                {summary.acceptedRowCount} מתוך {summary.totalRowCount} שורות בקו
                נכנסו לסיכום המאומת.
              </p>
              <ResultsTable totals={summary.totals} />
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
