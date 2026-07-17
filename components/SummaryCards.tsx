interface SummaryCardsProps {
  totalProducts: number
  totalCases: number
  totalUnits: number
  pendingReviewCount: number
}

export default function SummaryCards({
  totalProducts,
  totalCases,
  totalUnits,
  pendingReviewCount,
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
        <h4>ממתינים לבדיקה</h4>
        <p className="value">{pendingReviewCount}</p>
      </div>
    </div>
  )
}
