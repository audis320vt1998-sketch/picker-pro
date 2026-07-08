'use client'

import React, { useState } from 'react'
import UploadBox from '@/components/UploadBox'
import ProgressBar from '@/components/ProgressBar'

export default function UploadPage() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setIsProcessing(true)
    
    // Simulate processing
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += Math.random() * 30
      if (currentProgress >= 100) {
        setProgress(100)
        setIsProcessing(false)
        clearInterval(interval)
      } else {
        setProgress(currentProgress)
      }
    }, 500)
  }

  return (
    <main>
      <h1>Upload Document</h1>
      <UploadBox onFileSelect={handleFileSelect} />
      
      {selectedFile && (
        <div style={{ marginTop: '2rem' }}>
          <p>Selected file: {selectedFile.name}</p>
          {isProcessing && (
            <ProgressBar progress={progress} label="Processing" />
          )}
          {!isProcessing && progress === 100 && (
            <p style={{ color: 'green' }}>Processing complete!</p>
          )}
        </div>
      )}
    </main>
  )
}