import type { ProductTotals } from '@/lib/domain/types'
import { sourceReferencePresentations } from '@/lib/traceability/source-presentation'

interface ResultsTableProps {
  totals?: readonly ProductTotals[]
}

interface SourceReferencesProps {
  label: string
  sources: ProductTotals['cases']['sources']
}

function SourceReferences({ label, sources }: SourceReferencesProps) {
  const presentations = sourceReferencePresentations(sources)

  return (
    <section className="results-table__source-group">
      <strong>
        {label} ({presentations.length})
      </strong>
      {presentations.length > 0 ? (
        <ol>
          {presentations.map((source, index) => (
            <li key={`${source.pageNumber}-${source.rowNumber}-${index}`}>{source.label}</li>
          ))}
        </ol>
      ) : (
        <p>אין הפניית מקור תקינה להצגה.</p>
      )}
    </section>
  )
}

export default function ResultsTable({ totals = [] }: ResultsTableProps) {
  if (totals.length === 0) {
    return <div className="results-table">אין תוצאות מאומתות להצגה.</div>
  }

  return (
    <div className="results-table">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>ברקוד</th>
            <th>שם פריט</th>
            <th>מארזים</th>
            <th>בודדים</th>
            <th>פירוט מקורות</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((total) => (
            <tr key={total.product.productKey}>
              <td>{total.product.sku ?? '—'}</td>
              <td>{total.product.barcode ?? '—'}</td>
              <td>{total.product.name}</td>
              <td>{total.cases.value}</td>
              <td>{total.units.value}</td>
              <td>
                <details className="results-table__source-details">
                  <summary>הצג מקורות מארזים ובודדים</summary>
                  <SourceReferences label="מארזים" sources={total.cases.sources} />
                  <SourceReferences label="בודדים" sources={total.units.sources} />
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
