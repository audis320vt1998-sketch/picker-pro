import { correct, correctProductName, correctSKU } from '../../lib/ai/corrector'

describe('OCR correction safeguards', () => {
  it.each([
    ['general text', () => correct('קינדר בואנו')],
    ['SKU', () => correctSKU('12O45')],
    ['product name', () => correctProductName('פרנואי', ['פראנוי'])],
  ])('does not silently change %s', (_label, runCorrection) => {
    const result = runCorrection()

    expect(result).toMatchObject({
      confidence: 0,
      status: 'needs_review',
      corrections: [],
    })
  })

  it('preserves the raw candidate even when a verified-looking candidate is supplied', () => {
    expect(correctProductName('פרנואי', ['פראנוי']).text).toBe('פרנואי')
  })
})
