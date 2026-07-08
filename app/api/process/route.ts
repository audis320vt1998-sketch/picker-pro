import { NextRequest, NextResponse } from 'next/server'
import { extractText } from '@/lib/ocr/processor'
import { parseTable } from '@/lib/parser/table'
import { summarize } from '@/lib/parser/index'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const files = form.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No files provided',
          errors: ['Please upload at least one file'],
        },
        { status: 400 }
      )
    }

    let rows = []

    // Process each file
    for (const file of files) {
      try {
        const ocrResult = await extractText(file)
        const parsedRows = parseTable(ocrResult.text)
        rows.push(...parsedRows)
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        // Continue processing other files on error
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid data extracted from files',
          errors: ['Could not parse any valid product rows from the uploaded files'],
        },
        { status: 400 }
      )
    }

    // Summarize the parsed rows
    const summary = summarize(rows)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${files.length} file(s)`,
      data: {
        filesProcessed: files.length,
        rowsParsed: rows.length,
        productsSummarized: summary.length,
        rows,
        summary,
      },
    })
  } catch (error) {
    console.error('Error processing files:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing files',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    )
  }
}
