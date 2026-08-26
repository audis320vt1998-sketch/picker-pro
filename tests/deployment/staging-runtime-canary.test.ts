import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { createSyntheticPdf } = require('../../scripts/staging-runtime-canary.cjs') as {
  createSyntheticPdf: () => Buffer
}

function repositoryFile(file: string): string {
  return readFileSync(resolve(process.cwd(), file), 'utf8')
}

describe('staging runtime canary', () => {
  it('creates a structurally indexed, customer-free PDF fixture', () => {
    const pdf = createSyntheticPdf()
    const document = pdf.toString('ascii')
    const startReference = /startxref\n(\d+)\n%%EOF/.exec(document)

    expect(document.startsWith('%PDF-1.4\n')).toBe(true)
    expect(document).toContain('(PICKER 123) Tj')
    expect(startReference).not.toBeNull()
    expect(document.slice(Number(startReference?.[1])).startsWith('xref\n')).toBe(
      true
    )

    const objectOffsets = [...document.matchAll(/^(\d{10}) 00000 n $/gm)].map(
      (match) => Number(match[1])
    )
    expect(objectOffsets).toHaveLength(5)
    objectOffsets.forEach((offset, index) => {
      expect(document.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(
        true
      )
    })
  })

  it('packages and runs the canary inside the staging image', () => {
    expect(repositoryFile('Dockerfile')).toContain(
      '/app/scripts/staging-runtime-canary.cjs'
    )
    expect(repositoryFile('.github/workflows/quality.yml')).toContain(
      'timeout --kill-after=10s 180s node /app/scripts/staging-runtime-canary.cjs'
    )
  })
})
