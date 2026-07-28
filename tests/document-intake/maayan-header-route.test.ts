import {
  extractMaayanHeaderRouteDraft,
  isMaayanHeaderRouteCode,
  maayanHeaderRouteRectangle,
  type OcrWord,
} from '@/lib/document-intake'

const width = 2880
const height = 3840

function word(text: string, x: number, y: number, confidence = 92): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 32, y1: y + 32 },
  }
}

function routeHeaderWords(routeCode = '12', confidence = 92): OcrWord[] {
  return [
    // Physical RTL order: the code is left of "קו חלוקה".
    word(routeCode, 2170, 600, confidence),
    word('חלוקה:', 2290, 600, confidence),
    word('קו', 2450, 600, confidence),
  ]
}

describe('Maayan header route draft', () => {
  it('uses only the narrow upper-right header crop', () => {
    expect(maayanHeaderRouteRectangle({ width, height })).toEqual({
      left: 1670,
      top: 153,
      width: 1124,
      height: 1153,
    })
  })

  it('detects the marked "קו חלוקה: 12" field as a review-only draft', () => {
    expect(
      extractMaayanHeaderRouteDraft({ width, height, words: routeHeaderWords() })
    ).toEqual({
      status: 'SUGGESTED',
      routeCode: '12',
      confidence: 92,
    })
  })

  it('preserves a displayed leading zero and accepts a joined label token', () => {
    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: [word('01', 2170, 600), word('קוחלוקה:', 2320, 600)],
      })
    ).toEqual({
      status: 'SUGGESTED',
      routeCode: '01',
      confidence: 92,
    })
  })

  it.each(['', '00', '100', '12345', '12A', ' 12'])(
    'rejects an unsafe route-code shape: %p',
    (value) => {
      expect(isMaayanHeaderRouteCode(value)).toBe(false)
    }
  )

  it('does not treat a number outside the fixed header field as a route', () => {
    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: [
          word('12', 2170, 1500),
          word('חלוקה:', 2290, 1500),
          word('קו', 2450, 1500),
        ],
      })
    ).toEqual({
      status: 'NEEDS_REVIEW',
      routeCode: null,
      reason: 'ROUTE_LABEL_NOT_FOUND',
    })
  })

  it('withholds a route when the label, code, or placement is not reliable', () => {
    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: [word('12', 2170, 600)],
      })
    ).toMatchObject({
      status: 'NEEDS_REVIEW',
      reason: 'ROUTE_LABEL_NOT_FOUND',
    })

    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: [...routeHeaderWords(), word('13', 2100, 600)],
      })
    ).toMatchObject({
      status: 'NEEDS_REVIEW',
      reason: 'ROUTE_CODE_AMBIGUOUS',
    })

    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: [
          word('חלוקה:', 2290, 600),
          word('קו', 2450, 600),
          word('12', 2550, 600),
        ],
      })
    ).toMatchObject({
      status: 'NEEDS_REVIEW',
      reason: 'ROUTE_CODE_OUT_OF_POSITION',
    })

    expect(
      extractMaayanHeaderRouteDraft({
        width,
        height,
        words: routeHeaderWords('12', 84),
      })
    ).toEqual({
      status: 'NEEDS_REVIEW',
      routeCode: null,
      reason: 'ROUTE_CODE_LOW_CONFIDENCE',
    })
  })
})
