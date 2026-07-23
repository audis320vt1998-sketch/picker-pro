const DEFAULT_OCR_TIMEOUT_MS = 90_000
let activeOcrJob = false

export class OcrPreflightBusyError extends Error {
  constructor() {
    super('An OCR preflight job is already active.')
    this.name = 'OcrPreflightBusyError'
  }
}

export class OcrPreflightTimeoutError extends Error {
  constructor() {
    super('The OCR preflight job exceeded its time limit.')
    this.name = 'OcrPreflightTimeoutError'
  }
}

/**
 * Tesseract is CPU-intensive. Limit one active job per Node process and keep a
 * timed-out worker counted as active until it really settles, rather than
 * starting another costly worker in parallel.
 */
export async function runOcrPreflight<T>(
  operation: () => Promise<T>,
  timeoutMs = DEFAULT_OCR_TIMEOUT_MS
): Promise<T> {
  if (activeOcrJob) {
    throw new OcrPreflightBusyError()
  }

  activeOcrJob = true
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const operationPromise = Promise.resolve().then(operation)
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      reject(new OcrPreflightTimeoutError())
    }, timeoutMs)
  })

  try {
    return await Promise.race([operationPromise, timeoutPromise])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    if (timedOut) {
      void operationPromise.then(
        () => {
          activeOcrJob = false
        },
        () => {
          activeOcrJob = false
        }
      )
    } else {
      activeOcrJob = false
    }
  }
}
