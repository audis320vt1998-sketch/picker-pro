import { readImageMetadata } from './image-metadata'
import { hasMinimumMaayanImageResolution } from './maayan-layout'
import { MAX_PREFLIGHT_IMAGE_PIXELS } from './preflight-upload-policy'
import { preflightMaayanOcrPage } from './preflight-service'
import type {
  DocumentPreflightPage,
  DocumentPreflightResult,
  OcrPage,
} from './types'
import type { ImageDimensions } from './image-metadata'

export type PdfPageRecognizer = (
  image: Uint8Array,
  dimensions: ImageDimensions
) => Promise<OcrPage>

function isOcrImageDecodeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'OcrImageDecodeError'
}

function issuePage(
  pageNumber: number,
  code: 'PDF_PAGE_RENDER_INVALID' | 'PDF_PAGE_DIMENSIONS_TOO_LARGE' | 'PDF_PAGE_UNREADABLE'
): DocumentPreflightPage {
  const message = {
    PDF_PAGE_RENDER_INVALID:
      'The PDF page could not be rendered as a supported raster image.',
    PDF_PAGE_DIMENSIONS_TOO_LARGE:
      'The rendered PDF page exceeds the supported image dimensions.',
    PDF_PAGE_UNREADABLE:
      'The rendered PDF page could not be decoded by OCR.',
  }[code]

  return {
    pageNumber,
    rows: [],
    issues: [{ code, message }],
  }
}

function reassignPageNumber(
  page: DocumentPreflightPage,
  pageNumber: number
): DocumentPreflightPage {
  return {
    ...page,
    pageNumber,
    rows: page.rows.map((row) => ({
      ...row,
      source: { ...row.source, pageNumber },
    })),
  }
}

/**
 * Processes already-rendered PDF pages in sequence. It returns OCR drafts only
 * and never maps source quantities into operational cases or units.
 */
export async function preflightPdfRasterPages(
  rasterPages: readonly Uint8Array[],
  recognize: PdfPageRecognizer
): Promise<DocumentPreflightResult> {
  const pages: DocumentPreflightPage[] = []

  for (const [index, image] of rasterPages.entries()) {
    const pageNumber = index + 1
    const metadata = readImageMetadata(image)
    if (!metadata || metadata.mediaType !== 'image/png') {
      pages.push(issuePage(pageNumber, 'PDF_PAGE_RENDER_INVALID'))
      continue
    }
    if (
      metadata.dimensions.width * metadata.dimensions.height >
      MAX_PREFLIGHT_IMAGE_PIXELS
    ) {
      pages.push(issuePage(pageNumber, 'PDF_PAGE_DIMENSIONS_TOO_LARGE'))
      continue
    }
    if (!hasMinimumMaayanImageResolution(metadata.dimensions)) {
      pages.push(
        reassignPageNumber(
          preflightMaayanOcrPage({ ...metadata.dimensions, words: [] }).pages[0],
          pageNumber
        )
      )
      continue
    }

    try {
      const recognized = await recognize(image, metadata.dimensions)
      pages.push(
        reassignPageNumber(preflightMaayanOcrPage(recognized).pages[0], pageNumber)
      )
    } catch (error) {
      if (isOcrImageDecodeError(error)) {
        pages.push(issuePage(pageNumber, 'PDF_PAGE_UNREADABLE'))
        continue
      }
      throw error
    }
  }

  return {
    kind: 'DOCUMENT_PREFLIGHT',
    status: 'NEEDS_REVIEW',
    profile: 'MAAYAN_PRICE_OFFER_V1',
    pages,
  }
}
