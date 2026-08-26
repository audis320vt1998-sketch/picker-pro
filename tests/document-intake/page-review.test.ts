import {
  createOcrPreflightPageReviewConfirmation,
  getOcrPreflightPageReviewState,
} from '@/lib/document-intake/page-review'

describe('OCR preflight page review confirmation', () => {
  it('does not treat an OCR route suggestion as an approval', () => {
    expect(
      getOcrPreflightPageReviewState({
        routeCode: '12',
        selectedRowKeys: ['1:4'],
      })
    ).toEqual({
      kind: 'PENDING',
      routeCode: '12',
      selectedRowCount: 1,
    })
  })

  it('requires both selected source rows and a route from 1 through 99', () => {
    expect(
      createOcrPreflightPageReviewConfirmation({
        routeCode: '12',
        selectedRowKeys: [],
      })
    ).toBeNull()

    expect(
      createOcrPreflightPageReviewConfirmation({
        routeCode: '100',
        selectedRowKeys: ['1:4'],
      })
    ).toBeNull()

    expect(
      createOcrPreflightPageReviewConfirmation({
        routeCode: '00',
        selectedRowKeys: ['1:4'],
      })
    ).toBeNull()
  })

  it('recognizes only an explicit confirmation for the current page state', () => {
    const confirmation = createOcrPreflightPageReviewConfirmation({
      routeCode: '12',
      selectedRowKeys: ['1:5', '1:4'],
    })

    expect(confirmation).toEqual({
      routeCode: '12',
      selectedRowKeys: ['1:4', '1:5'],
    })
    expect(
      getOcrPreflightPageReviewState({
        routeCode: '12',
        selectedRowKeys: ['1:4', '1:5'],
        confirmation: confirmation ?? undefined,
      })
    ).toEqual({
      kind: 'CONFIRMED',
      routeCode: '12',
      selectedRowCount: 2,
    })
  })

  it('invalidates a confirmation when the route or row selection changes', () => {
    const confirmation = createOcrPreflightPageReviewConfirmation({
      routeCode: '12',
      selectedRowKeys: ['1:4'],
    })

    expect(
      getOcrPreflightPageReviewState({
        routeCode: '13',
        selectedRowKeys: ['1:4'],
        confirmation: confirmation ?? undefined,
      })
    ).toMatchObject({ kind: 'PENDING', routeCode: '13' })
    expect(
      getOcrPreflightPageReviewState({
        routeCode: '12',
        selectedRowKeys: ['1:4', '1:5'],
        confirmation: confirmation ?? undefined,
      })
    ).toMatchObject({ kind: 'PENDING', routeCode: '12', selectedRowCount: 2 })
  })
})
