import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const files = form.getAll('files').filter((value): value is File => value instanceof File)

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'At least one PDF or image file is required.' },
      { status: 400 }
    )
  }

  const unsupportedFile = files.find((file) => !SUPPORTED_TYPES.has(file.type))
  if (unsupportedFile) {
    return NextResponse.json(
      { error: `Unsupported file type: ${unsupportedFile.type || unsupportedFile.name}` },
      { status: 415 }
    )
  }

  // Returning a successful empty summary would be unsafe: the current OCR adapter
  // is only a placeholder and cannot produce traceable picking data yet.
  return NextResponse.json(
    {
      error: 'Document processing is not available yet.',
      code: 'OCR_NOT_IMPLEMENTED',
    },
    { status: 501 }
  )
}
