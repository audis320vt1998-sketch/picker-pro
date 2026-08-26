import { setOcrPreflightVisibleRowSelections } from '@/lib/document-intake'

describe('OCR preflight visible row selection', () => {
  it('selects only visible transferable rows and preserves other-page selections', () => {
    const current = {
      '1:1': false,
      '1:2': true,
      '2:1': true,
    }

    expect(
      setOcrPreflightVisibleRowSelections(
        current,
        ['1:1', '1:2', '1:1', ''],
        true
      )
    ).toEqual({
      '1:1': true,
      '1:2': true,
      '2:1': true,
    })
    expect(current).toEqual({
      '1:1': false,
      '1:2': true,
      '2:1': true,
    })
  })

  it('clears only the visible transferable rows and retains hidden rows', () => {
    expect(
      setOcrPreflightVisibleRowSelections(
        {
          '1:1': true,
          '1:2': true,
          '1:3': true,
          '2:1': true,
        },
        ['1:1', '1:2'],
        false
      )
    ).toEqual({
      '1:3': true,
      '2:1': true,
    })
  })

  it('leaves selections equivalent when there are no visible transferable rows', () => {
    const current = { '2:1': true }

    expect(setOcrPreflightVisibleRowSelections(current, [], true)).toBe(current)
    expect(
      setOcrPreflightVisibleRowSelections(current, ['2:1'], true)
    ).toBe(current)
  })
})
