'use client'

import React from 'react'

interface ResultsTableProps {
  data?: Array<Record<string, any>>
}

export default function ResultsTable({ data = [] }: ResultsTableProps) {
  if (data.length === 0) {
    return <div className="results-table">No results to display</div>
  }

  const columns = Object.keys(data[0])

  return (
    <div className="results-table">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={`${idx}-${col}`}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}