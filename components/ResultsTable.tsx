import type { ProductTotals } from '@/lib/domain/types'

interface ResultsTableProps {
  totals?: readonly ProductTotals[]
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
            <th>מקורות</th>
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
              <td>{total.cases.sources.length + total.units.sources.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
