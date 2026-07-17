'use client'

import { useState } from 'react'
import UploadBox from '@/components/UploadBox'

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  return (
    <main>
      <h1>העלאת מסמכים</h1>
      <UploadBox onFileSelect={setSelectedFiles} />

      {selectedFiles.length > 0 && (
        <p style={{ marginTop: '2rem' }}>
          נבחרו {selectedFiles.length} קבצים לעיבוד.
        </p>
      )}
    </main>
  )
}
