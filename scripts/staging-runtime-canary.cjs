'use strict'

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function createSyntheticPdf() {
  const pageContent = [
    'BT',
    '/F1 48 Tf',
    '72 650 Td',
    '(PICKER 123) Tj',
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    [
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]',
      '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    ].join(' '),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(pageContent, 'ascii')} >>\nstream\n${pageContent}\nendstream`,
  ]

  let document = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets[index + 1] = Buffer.byteLength(document, 'ascii')
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const crossReferenceOffset = Buffer.byteLength(document, 'ascii')
  document += `xref\n0 ${objects.length + 1}\n`
  document += '0000000000 65535 f \n'
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  document += [
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(crossReferenceOffset),
    '%%EOF',
    '',
  ].join('\n')

  return Buffer.from(document, 'ascii')
}

async function verifyStagingRuntime() {
  const Tesseract = require('tesseract.js')
  const cachePath = process.env.PICKER_PRO_OCR_CACHE
  if (!cachePath) {
    throw new Error('PICKER_PRO_OCR_CACHE must be configured for the canary')
  }

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'picker-pro-runtime-canary-')
  )
  const pdfPath = path.join(temporaryDirectory, 'synthetic-order.pdf')
  const rasterPrefix = path.join(temporaryDirectory, 'synthetic-order')
  const rasterPath = `${rasterPrefix}.png`
  let worker

  try {
    fs.writeFileSync(pdfPath, createSyntheticPdf(), { flag: 'wx' })
    execFileSync(process.env.PICKER_PRO_PDFINFO_PATH || 'pdfinfo', [pdfPath], {
      stdio: 'pipe',
    })
    execFileSync(
      process.env.PICKER_PRO_PDFTOPPM_PATH || 'pdftoppm',
      ['-png', '-singlefile', '-r', '150', pdfPath, rasterPrefix],
      { stdio: 'pipe' }
    )

    worker = await Tesseract.createWorker('eng+heb', 1, {
      cachePath,
      logger: () => {},
    })
    const recognition = await worker.recognize(fs.readFileSync(rasterPath))
    if (!recognition.data.text.includes('123')) {
      throw new Error('OCR canary did not recover the fixed synthetic digits')
    }

    process.stdout.write('Synthetic PDF and eng+heb OCR canary passed.\n')
  } finally {
    try {
      if (worker) {
        await worker.terminate()
      }
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  }
}

if (require.main === module) {
  verifyStagingRuntime().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { createSyntheticPdf, verifyStagingRuntime }
