'use client'

import React from 'react'

interface SummaryCardsProps {
  totalItems?: number
  processedItems?: number
  failedItems?: number
}

export default function SummaryCards({
  totalItems = 0,
  processedItems = 0,
  failedItems = 0,
}: SummaryCardsProps) {
  return (
    <div className="summary-cards">
      <div className="card">
        <h4>Total Items</h4>
        <p className="value">{totalItems}</p>
      </div>
      <div className="card">
        <h4>Processed</h4>
        <p className="value success">{processedItems}</p>
      </div>
      <div className="card">
        <h4>Failed</h4>
        <p className="value error">{failedItems}</p>
      </div>
      <div className="card">
        <h4>Success Rate</h4>
        <p className="value">
          {totalItems > 0
            ? ((processedItems / totalItems) * 100).toFixed(1)
            : 0}
          %
        </p>
      </div>
    </div>
  )
}