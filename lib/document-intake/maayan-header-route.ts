import { OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD } from './field-confidence'
import type {
  BoundingBox,
  MaayanHeaderRouteDraft,
  MaayanHeaderRouteDraftReason,
  OcrPage,
  OcrWord,
} from './types'

export interface OcrRectangle {
  left: number
  top: number
  width: number
  height: number
}

const HEADER_ROUTE_BOUNDS = {
  xMin: 0.58,
  xMax: 0.97,
  yMin: 0.04,
  yMax: 0.34,
} as const
const MAX_ROUTE_CODE = 99
const ROUTE_CODE_CONFIDENCE_THRESHOLD = 85

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function centerX(word: OcrWord): number {
  return (word.boundingBox.x0 + word.boundingBox.x1) / 2
}

function centerY(word: OcrWord): number {
  return (word.boundingBox.y0 + word.boundingBox.y1) / 2
}

function wordHeight(word: OcrWord): number {
  return word.boundingBox.y1 - word.boundingBox.y0
}

function normalizedHeaderToken(value: string): string {
  return value
    .replace(/[\u0591-\u05c7]/g, '')
    .replace(/[\s:：]/g, '')
}

function isInHeaderRouteArea(
  page: Pick<OcrPage, 'width' | 'height'>,
  word: OcrWord
): boolean {
  const x = centerX(word)
  const y = centerY(word)
  return (
    x >= page.width * HEADER_ROUTE_BOUNDS.xMin &&
    x <= page.width * HEADER_ROUTE_BOUNDS.xMax &&
    y >= page.height * HEADER_ROUTE_BOUNDS.yMin &&
    y <= page.height * HEADER_ROUTE_BOUNDS.yMax
  )
}

function unionBounds(words: readonly OcrWord[]): BoundingBox {
  return {
    x0: Math.min(...words.map((word) => word.boundingBox.x0)),
    y0: Math.min(...words.map((word) => word.boundingBox.y0)),
    x1: Math.max(...words.map((word) => word.boundingBox.x1)),
    y1: Math.max(...words.map((word) => word.boundingBox.y1)),
  }
}

interface RouteLabelAnchor {
  words: readonly OcrWord[]
  bounds: BoundingBox
}

function routeLabelAnchors(
  page: Pick<OcrPage, 'width' | 'height' | 'words'>
): RouteLabelAnchor[] {
  const headerWords = page.words.filter((word) => isInHeaderRouteArea(page, word))
  const exactLabels = headerWords
    .filter((word) => normalizedHeaderToken(word.text) === 'קוחלוקה')
    .map((word) => ({ words: [word], bounds: word.boundingBox }))

  if (exactLabels.length > 0) {
    return exactLabels
  }

  const labels: RouteLabelAnchor[] = []
  const routeWordCandidates = headerWords.filter(
    (word) => normalizedHeaderToken(word.text) === 'קו'
  )
  const divisionWordCandidates = headerWords.filter(
    (word) => normalizedHeaderToken(word.text) === 'חלוקה'
  )
  for (const routeWord of routeWordCandidates) {
    for (const divisionWord of divisionWordCandidates) {
      const sameLineTolerance = Math.max(
        page.height * 0.02,
        Math.max(wordHeight(routeWord), wordHeight(divisionWord)) * 1.25
      )
      const horizontalGap = Math.max(
        routeWord.boundingBox.x0,
        divisionWord.boundingBox.x0
      ) - Math.min(routeWord.boundingBox.x1, divisionWord.boundingBox.x1)
      if (
        Math.abs(centerY(routeWord) - centerY(divisionWord)) <=
          sameLineTolerance &&
        horizontalGap <= page.width * 0.15
      ) {
        labels.push({
          words: [routeWord, divisionWord],
          bounds: unionBounds([routeWord, divisionWord]),
        })
      }
    }
  }

  return labels
}

function numericRouteCode(word: OcrWord): string | null {
  const normalized = word.text.replace(/\s/g, '')
  return isMaayanHeaderRouteCode(normalized) ? normalized : null
}

function needsReview(reason: MaayanHeaderRouteDraftReason): MaayanHeaderRouteDraft {
  return { status: 'NEEDS_REVIEW', routeCode: null, reason }
}

/**
 * Returns a 1–99 route code without coercion, preserving a displayed leading
 * zero. The bounded format prevents a nearby order/customer/phone number from
 * entering the narrow page-level route draft.
 */
export function isMaayanHeaderRouteCode(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{1,2}$/.test(value)) {
    return false
  }

  const numericValue = Number(value)
  return (
    Number.isInteger(numericValue) &&
    numericValue >= 1 &&
    numericValue <= MAX_ROUTE_CODE
  )
}

/**
 * Converts an already-bounded header route to its numeric identity for review
 * grouping. OCR display may preserve `01`, but route 01 and route 1 are the
 * same operational line and must never produce separate review groups.
 */
export function canonicalMaayanHeaderRouteCode(value: unknown): string | null {
  return isMaayanHeaderRouteCode(value) ? String(Number(value)) : null
}

export function unavailableMaayanHeaderRouteDraft(): MaayanHeaderRouteDraft {
  return needsReview('ROUTE_OCR_UNAVAILABLE')
}

/**
 * The crop is deliberately limited to the upper-right header band shown on
 * Maayan offers. It is used only to read the fixed "קו חלוקה" field; no raw
 * header OCR text is retained or returned.
 */
export function maayanHeaderRouteRectangle(
  page: Pick<OcrPage, 'width' | 'height'>
): OcrRectangle {
  const left = Math.floor(page.width * HEADER_ROUTE_BOUNDS.xMin)
  const right = Math.ceil(page.width * HEADER_ROUTE_BOUNDS.xMax)
  const top = Math.floor(page.height * HEADER_ROUTE_BOUNDS.yMin)
  const bottom = Math.ceil(page.height * HEADER_ROUTE_BOUNDS.yMax)

  return {
    left: clamp(left, 0, Math.max(0, page.width - 1)),
    top: clamp(top, 0, Math.max(0, page.height - 1)),
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

/**
 * Extracts only a high-confidence numeric value physically to the left of a
 * "קו חלוקה" label (RTL layout). Missing, low-confidence, distant, or
 * competing candidates stay out of the response instead of being guessed.
 */
export function extractMaayanHeaderRouteDraft(
  page: Pick<OcrPage, 'width' | 'height' | 'words'>
): MaayanHeaderRouteDraft {
  const labels = routeLabelAnchors(page)
  if (labels.length === 0) {
    return needsReview('ROUTE_LABEL_NOT_FOUND')
  }
  if (labels.length > 1) {
    return needsReview('ROUTE_CODE_AMBIGUOUS')
  }

  const label = labels[0]
  const labelCenterY = (label.bounds.y0 + label.bounds.y1) / 2
  const verticalTolerance = Math.max(
    page.height * 0.02,
    Math.max(...label.words.map(wordHeight)) * 1.25
  )
  const lineNumericWords = page.words.filter(
    (word) =>
      isInHeaderRouteArea(page, word) &&
      numericRouteCode(word) !== null &&
      Math.abs(centerY(word) - labelCenterY) <= verticalTolerance
  )
  const candidates = lineNumericWords.filter(
    (word) =>
      word.boundingBox.x1 <= label.bounds.x0 &&
      label.bounds.x0 - word.boundingBox.x1 <= page.width * 0.15
  )

  if (candidates.length > 1) {
    return needsReview('ROUTE_CODE_AMBIGUOUS')
  }
  if (candidates.length === 0) {
    return needsReview(
      lineNumericWords.length > 0
        ? 'ROUTE_CODE_OUT_OF_POSITION'
        : 'ROUTE_CODE_MISSING'
    )
  }

  const candidate = candidates[0]
  const routeCode = numericRouteCode(candidate)
  if (routeCode === null) {
    return needsReview('ROUTE_CODE_MISSING')
  }

  const confidence = Math.min(
    candidate.confidence,
    ...label.words.map((word) => word.confidence)
  )
  if (
    candidate.confidence < ROUTE_CODE_CONFIDENCE_THRESHOLD ||
    label.words.some(
      (word) => word.confidence < OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD
    )
  ) {
    return needsReview('ROUTE_CODE_LOW_CONFIDENCE')
  }

  return { status: 'SUGGESTED', routeCode, confidence }
}
