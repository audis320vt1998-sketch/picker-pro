'use client'

import React, { useState } from 'react'

interface UploadBoxProps {
  onFileSelect?: (files: File[]) => void
  onProcessComplete?: (result: unknown) => void
}

interface ProcessResult {
  success: boolean
  message: string
  data?: unknown
  errors?: string[]
}

interface ProcessErrorResponse {
  error: string
  code?: string
}

function isProcessResult(value: unknown): value is ProcessResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'message' in value
  )
}

function isProcessErrorResponse(value: unknown): value is ProcessErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  )
}

export default function UploadBox({
  onFileSelect,
  onProcessComplete,
}: UploadBoxProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
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

    setFiles((previousFiles) => {
      const updatedFiles = [...previousFiles, ...validFiles]
      onFileSelect?.(updatedFiles)
      return updatedFiles
    })
  }

  const removeFile = (index: number) => {
    setFiles((previousFiles) => {
      const updatedFiles = previousFiles.filter((_, fileIndex) => fileIndex !== index)
      onFileSelect?.(updatedFiles)
      return updatedFiles
    })
  }

  const clearFiles = () => {
    setFiles([])
    onFileSelect?.([])
    setError(null)
  }

  const startProcess = async () => {
    if (files.length === 0) {
      setError('Please select files to process')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const form = new FormData()
      files.forEach((file) => {
        form.append('files', file)
      })

      const res = await fetch('/api/process', {
        method: 'POST',
        body: form,
      })

      const result: unknown = await res.json()

      if (!res.ok) {
        if (isProcessErrorResponse(result)) {
          throw new Error(result.error)
        }
        throw new Error(`API error: ${res.statusText}`)
      }

      if (isProcessResult(result) && result.success) {
        onProcessComplete?.(result.data)
        setTimeout(() => {
          clearFiles()
        }, 1500)
      } else {
        setError('The processing service returned an unexpected response.')
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

      {/* Request status: no OCR progress is shown until a real job API exists. */}
      {isProcessing && (
        <p className="mt-6 text-sm text-gray-600" role="status">
          שולח את הבקשה לעיבוד…
        </p>
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
