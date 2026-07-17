import {
  OcrPreflightBusyError,
  OcrPreflightTimeoutError,
  runOcrPreflight,
} from '../../lib/document-intake/ocr-capacity'

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

describe('runOcrPreflight', () => {
  it('allows only one active OCR operation at a time', async () => {
    let resolveFirst: ((value: string) => void) | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const first = runOcrPreflight(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve
          markStarted?.()
        }),
      1_000
    )

    await started
    await expect(
      runOcrPreflight(() => Promise.resolve('second'), 1_000)
    ).rejects.toBeInstanceOf(OcrPreflightBusyError)

    resolveFirst?.('first')
    await expect(first).resolves.toBe('first')
  })

  it('keeps the slot occupied until a timed-out operation settles', async () => {
    const lateOperation = runOcrPreflight(async () => {
      await wait(30)
      return 'late'
    }, 1)

    await expect(lateOperation).rejects.toBeInstanceOf(OcrPreflightTimeoutError)
    await expect(
      runOcrPreflight(() => Promise.resolve('blocked'), 1_000)
    ).rejects.toBeInstanceOf(OcrPreflightBusyError)

    await wait(40)
    await expect(
      runOcrPreflight(() => Promise.resolve('available'), 1_000)
    ).resolves.toBe('available')
  })
})
