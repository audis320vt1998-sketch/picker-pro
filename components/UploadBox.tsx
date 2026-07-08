'use client'

import React, { useState } from 'react'
import ProgressBar from './ProgressBar'

interface UploadBoxProps {
  onFileSelect?: (files: File[]) => void
  onProcessComplete?: (result: any) => void
}

interface ProcessResult {
  success: boolean
  message: string
  data?: any
  errors?: string[]
}

export default function UploadBox({
  onFileSelect,
  onProcessComplete,
}: UploadBoxProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(Array.from(droppedFiles))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    handleFiles(Array.from(e.target.files))
  }

  const handleFiles = (newFiles: File[]) => {
    // Filter for valid file types
    const validFiles = newFiles.filter((file) =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
        file.type
      )
    )

    if (validFiles.length !== newFiles.length) {
      setError('Some files were skipped. Only PDF and image files are allowed.')
    }

    setFiles((prev) => [...prev, ...validFiles])
    onFileSelect?.(validFiles)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setFiles([])
    setError(null)
  }

  const startProcess = async () => {
    if (files.length === 0) {
      setError('Please select files to process')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const form = new FormData()
      files.forEach((file) => {
        form.append('files', file)
      })

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 20
        })
      }, 500)

      const res = await fetch('/api/process', {
        method: 'POST',
        body: form,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`)
      }

      const result: ProcessResult = await res.json()

      if (result.success) {
        setProgress(100)
        onProcessComplete?.(result.data)
        setTimeout(() => {
          clearFiles()
          setProgress(0)
        }, 1500)
      } else {
        setError(result.message || 'Processing failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept=".pdf,image/*"
          onChange={handleChange}
          disabled={isProcessing}
          hidden
        />
        <label
          htmlFor="file-input"
          className={`block text-center cursor-pointer ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="text-3xl mb-2">📄</div>
          <h3 className="font-semibold text-lg mb-1">
            Drop files here or click to upload
          </h3>
          <p className="text-sm text-gray-600">
            Supported formats: PDF, JPEG, PNG, WebP
          </p>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">
              Selected Files ({files.length})
            </h4>
            <button
              onClick={clearFiles}
              disabled={isProcessing}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {file.type === 'application/pdf' ? '📕' : '🖼️'}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isProcessing}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-6">
          <ProgressBar progress={progress} label="Processing Files" />
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={startProcess}
        disabled={files.length === 0 || isProcessing}
        className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing...' : 'חשב ליקוט'}
      </button>
    </div>
  )
}
