'use client'

import React from 'react'

interface ProgressBarProps {
  progress: number
  label?: string
}

export default function ProgressBar({
  progress,
  label = 'Progress',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(progress, 0), 100)

  return (
    <div className="progress-container">
      <div className="progress-label">
        <span>{label}</span>
        <span className="percentage">{percentage.toFixed(0)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}