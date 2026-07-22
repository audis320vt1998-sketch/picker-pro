interface SummaryCardsProps {
  totalProducts: number
  totalCases: number
  totalUnits: number
  excludedRowCount: number
  warningCount: number
}

export default function SummaryCards({
  totalProducts,
  totalCases,
  totalUnits,
  excludedRowCount,
  warningCount,
}: SummaryCardsProps) {
  return (
    <div className="summary-cards">
      <div className="card">
        <h4>פריטים</h4>
        <p className="value">{totalProducts}</p>
      </div>
      <div className="card">
        <h4>מארזים</h4>
        <p className="value">{totalCases}</p>
      </div>
      <div className="card">
        <h4>בודדים</h4>
        <p className="value">{totalUnits}</p>
      </div>
      <div className="card">
        <h4>שורות מחוץ לסיכום</h4>
        <p className="value">{excludedRowCount}</p>
      </div>
      <div className="card">
        <h4>אזהרות</h4>
        <p className="value">{warningCount}</p>
      </div>
    </div>
  )
}
