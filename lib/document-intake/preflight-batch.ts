import type { DocumentPreflightPage } from './types'

const OCR_SOURCE_DOCUMENT_REF_PATTERN =
  /^doc_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * A page stays in browser memory only, but it needs an opaque source identity
 * so that the handoff and manual-review API can distinguish two documents
 * that both contain (for example) page 1, row 4. It intentionally contains
 * no filename, header, customer information, or document text.
 */
export interface OcrPreflightBatchPage {
  sourceDocumentRef: string
  page: DocumentPreflightPage
}

export function isOcrSourceDocumentRef(value: unknown): value is string {
  return typeof value === 'string' && OCR_SOURCE_DOCUMENT_REF_PATTERN.test(value)
}

/**
 * Formats 128 bits supplied by the browser Web Crypto API as an opaque
 * document reference. Keeping randomness outside this module makes the
 * construction deterministic and straightforward to test.
 */
export function createOcrSourceDocumentRef(randomBytes: Uint8Array): string {
  if (randomBytes.length !== 16) {
    throw new RangeError('An OCR source document reference requires 16 random bytes.')
  }

  const uuidBytes = Uint8Array.from(randomBytes)
  uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40
  uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80
  const hex = Array.from(uuidBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `doc_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * The single-image endpoint always labels its returned page as page 1. The
 * browser assigns a stable, user-visible page number while it processes a
 * chosen batch sequentially. File names never enter this result.
 */
export function reassignPreflightPageNumber(
  page: DocumentPreflightPage,
  pageNumber: number
): DocumentPreflightPage {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new RangeError('A batch page number must be a positive integer.')
  }

  return {
    ...page,
    pageNumber,
    rows: page.rows.map((row) => ({
      ...row,
      source: {
        ...row.source,
        pageNumber,
      },
    })),
  }
}

export function createOcrPreflightBatchPage(
  page: DocumentPreflightPage,
  pageNumber: number,
  sourceDocumentRef: string
): OcrPreflightBatchPage {
  if (!isOcrSourceDocumentRef(sourceDocumentRef)) {
    throw new TypeError('The OCR source document reference is invalid.')
  }

  return {
    sourceDocumentRef,
    page: reassignPreflightPageNumber(page, pageNumber),
  }
}

/**
 * Replaces a draft by its opaque source reference and keeps the selected-file
 * order stable. This is used when a user explicitly retries a failed image;
 * it never creates another identity or another page for that image.
 */
export function upsertOcrPreflightBatchPage(
  pages: readonly OcrPreflightBatchPage[],
  nextPage: OcrPreflightBatchPage
): readonly OcrPreflightBatchPage[] {
  return [
    ...pages.filter(
      ({ sourceDocumentRef }) => sourceDocumentRef !== nextPage.sourceDocumentRef
    ),
    nextPage,
  ].sort(
    (left, right) =>
      left.page.pageNumber - right.page.pageNumber ||
      left.sourceDocumentRef.localeCompare(right.sourceDocumentRef)
  )
}
