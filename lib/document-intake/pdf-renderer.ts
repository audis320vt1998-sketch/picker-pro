import { execFile as execFileCallback } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { MAX_PREFLIGHT_PDF_PAGES } from './pdf-preflight-policy'

const execFile = promisify(execFileCallback)
const PDF_COMMAND_TIMEOUT_MS = 30_000
const PDF_RENDER_MAX_DIMENSION = 2_400

export type PdfRenderingFailureCode =
  | 'INVALID_PDF'
  | 'PDF_TOO_MANY_PAGES'
  | 'PDF_RENDERER_UNAVAILABLE'
  | 'PDF_RENDER_FAILED'

export class PdfRenderingError extends Error {
  constructor(readonly code: PdfRenderingFailureCode) {
    super(code)
    this.name = 'PdfRenderingError'
  }
}

function bundledPopplerExecutable(command: 'pdfinfo' | 'pdftoppm'): string | null {
  const executableName = process.platform === 'win32' ? `${command}.exe` : command
  const candidate = join(
    resolve(dirname(process.execPath), '..', '..'),
    'native',
    'poppler',
    'Library',
    'bin',
    executableName
  )
  return existsSync(candidate) ? candidate : null
}

function pdfInfoExecutable(): string {
  return (
    process.env.PICKER_PRO_PDFINFO_PATH ??
    bundledPopplerExecutable('pdfinfo') ??
    'pdfinfo'
  )
}

function pdfToPpmExecutable(): string {
  return (
    process.env.PICKER_PRO_PDFTOPPM_PATH ??
    bundledPopplerExecutable('pdftoppm') ??
    'pdftoppm'
  )
}

function isCommandMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}

async function runCommand(command: string, args: readonly string[]): Promise<string> {
  try {
    const { stdout } = await execFile(command, [...args], {
      windowsHide: true,
      timeout: PDF_COMMAND_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    })
    return String(stdout)
  } catch (error) {
    if (isCommandMissing(error)) {
      throw new PdfRenderingError('PDF_RENDERER_UNAVAILABLE')
    }
    throw new PdfRenderingError('PDF_RENDER_FAILED')
  }
}

function pageCountFromPdfInfo(output: string): number {
  const match = output.match(/^Pages:\s*(\d+)\s*$/m)
  if (!match) {
    throw new PdfRenderingError('INVALID_PDF')
  }

  const pageCount = Number(match[1])
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfRenderingError('INVALID_PDF')
  }
  if (pageCount > MAX_PREFLIGHT_PDF_PAGES) {
    throw new PdfRenderingError('PDF_TOO_MANY_PAGES')
  }

  return pageCount
}

function renderedPageNumber(fileName: string): number | null {
  const match = fileName.match(/^page-(\d+)\.png$/)
  if (!match) {
    return null
  }
  const value = Number(match[1])
  return Number.isInteger(value) && value > 0 ? value : null
}

/**
 * Renders a PDF into temporary PNG pages using locally installed Poppler.
 * The source and generated pages are removed before the promise resolves or
 * rejects. Deployment environments must provide pdfinfo and pdftoppm, or set
 * PICKER_PRO_PDFINFO_PATH and PICKER_PRO_PDFTOPPM_PATH.
 */
export async function renderPdfToPngPages(
  pdfBytes: Uint8Array
): Promise<readonly Uint8Array[]> {
  const directory = await mkdtemp(join(tmpdir(), 'picker-pro-pdf-'))
  const sourcePath = join(directory, 'source.pdf')
  const outputPrefix = join(directory, 'page')

  try {
    await writeFile(sourcePath, pdfBytes)
    const pageCount = pageCountFromPdfInfo(
      await runCommand(pdfInfoExecutable(), [sourcePath])
    )
    await runCommand(pdfToPpmExecutable(), [
      '-png',
      '-scale-to',
      String(PDF_RENDER_MAX_DIMENSION),
      '-f',
      '1',
      '-l',
      String(pageCount),
      sourcePath,
      outputPrefix,
    ])

    const renderedFiles = (await readdir(directory))
      .map((fileName) => ({ fileName, pageNumber: renderedPageNumber(fileName) }))
      .filter(
        (entry): entry is { fileName: string; pageNumber: number } =>
          entry.pageNumber !== null
      )
      .sort((left, right) => left.pageNumber - right.pageNumber)

    if (
      renderedFiles.length !== pageCount ||
      renderedFiles.some((entry, index) => entry.pageNumber !== index + 1)
    ) {
      throw new PdfRenderingError('PDF_RENDER_FAILED')
    }

    return Promise.all(
      renderedFiles.map(async ({ fileName }) =>
        new Uint8Array(await readFile(join(directory, fileName)))
      )
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
