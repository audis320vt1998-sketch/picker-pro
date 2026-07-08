'use client'

import React from 'react'
import SummaryCards from '@/components/SummaryCards'
import ResultsTable from '@/components/ResultsTable'

export default function ResultsPage() {
  // Sample data - replace with actual data
  const sampleData = [
    { id: 1, product: 'Item 1', price: 29.99, quantity: 2 },
    { id: 2, product: 'Item 2', price: 49.99, quantity: 1 },
    { id: 3, product: 'Item 3', price: 19.99, quantity: 3 },
  ]

  return (
    <main>
      <h1>Results</h1>
      <SummaryCards
        totalItems={3}
        processedItems={3}
        failedItems={0}
      />
      <hr style={{ margin: '2rem 0' }} />
      <h2>Extracted Data</h2>
      <ResultsTable data={sampleData} />
    </main>
  )
}