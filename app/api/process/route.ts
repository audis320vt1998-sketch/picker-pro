import { NextRequest, NextResponse } from 'next/server'
import { extractText } from '@/lib/ocr/processor'
import { parseTable } from '@/lib/parser/table'
import { summarize } from '@/lib/parser/index'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const files = form.getAll('files') as File[]

  let rows = []

  for (const file of files) {
    const text = await extractText(file)
    rows.push(...parseTable(text.text))
  }

  const summary = summarize(rows)

  return NextResponse.json({
    rows,
    summary,
  })
}
