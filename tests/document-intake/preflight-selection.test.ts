import {
  moveOcrPreflightSelectionItem,
  removeOcrPreflightSelectionItem,
} from '@/lib/document-intake/preflight-selection'

describe('browser OCR preflight selection helpers', () => {
  it('moves one selected item without mutating the original order', () => {
    const original = ['first', 'second', 'third']

    const reordered = moveOcrPreflightSelectionItem(original, 2, 0)

    expect(reordered).toEqual(['third', 'first', 'second'])
    expect(original).toEqual(['first', 'second', 'third'])
  })

  it('keeps the existing selection for an invalid or no-op move', () => {
    const original = ['first', 'second']

    expect(moveOcrPreflightSelectionItem(original, 0, 0)).toBe(original)
    expect(moveOcrPreflightSelectionItem(original, -1, 1)).toBe(original)
    expect(moveOcrPreflightSelectionItem(original, 0, 2)).toBe(original)
  })

  it('removes an item without mutating the original order', () => {
    const original = ['first', 'second', 'third']

    const remaining = removeOcrPreflightSelectionItem(original, 1)

    expect(remaining).toEqual(['first', 'third'])
    expect(original).toEqual(['first', 'second', 'third'])
  })

  it('keeps the existing selection when an invalid item is removed', () => {
    const original = ['first']

    expect(removeOcrPreflightSelectionItem(original, -1)).toBe(original)
    expect(removeOcrPreflightSelectionItem(original, 1)).toBe(original)
  })
})
