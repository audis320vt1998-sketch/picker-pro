jest.mock('tesseract.js', () => ({
  __esModule: true,
  default: {
    createWorker: jest.fn(),
    PSM: {
      SPARSE_TEXT: 11,
      SINGLE_BLOCK: 6,
      SINGLE_LINE: 7,
    },
  },
}))

import Tesseract from 'tesseract.js'
import { recognizeTesseractImage } from '../../lib/document-intake/tesseract-adapter'

interface MockWorker {
  recognize: jest.Mock
  reinitialize: jest.Mock
  setParameters: jest.Mock
  terminate: jest.Mock
}

const createWorkerMock = Tesseract.createWorker as jest.MockedFunction<
  typeof Tesseract.createWorker
>

function word(text: string, x: number, y: number, confidence = 90) {
  return {
    text,
    confidence,
    bbox: { x0: x, y0: y, x1: x + 20, y1: y + 20 },
  }
}

function result(words: ReturnType<typeof word>[]) {
  return { data: { words } }
}

function shortNumericRows(rowCount: 2 | 3) {
  const ys = [600, 780, 1100].slice(0, rowCount)
  return {
    ys,
    skus: ys.slice(0, 2).map((y, index) => word(`93${100 + index}`, 850, y)),
    barcodes: ys.slice(0, 2).map((y, index) => [
      word(`0729002053100${index + 1}`, 700, y),
    ]),
    printedRows: ys.map((y, index) => word(String(index + 1), 950, y)),
    caseQuantities: ys.map((y) => word('2.00', 275, y)),
    unitsPerCase: ys.map((y) => word('10.00', 205, y)),
    totalUnits: ys.map((y) => word('20.00', 115, y)),
  }
}

function queueShortRecognition(worker: MockWorker, detectedRows: 2 | 3): void {
  const rows = shortNumericRows(detectedRows)
  const quantityScout = rows.ys.flatMap((_, index) => [
    rows.totalUnits[index],
    rows.unitsPerCase[index],
    rows.caseQuantities[index],
  ])

  worker.recognize
    .mockResolvedValueOnce(result(rows.skus))
    .mockResolvedValueOnce(result(rows.barcodes[0]))
    .mockResolvedValueOnce(result(rows.barcodes[1]))
    .mockResolvedValueOnce(result(rows.printedRows))
    .mockResolvedValueOnce(result(quantityScout))
    .mockResolvedValueOnce(result(rows.caseQuantities))
    .mockResolvedValueOnce(result(rows.unitsPerCase))
    .mockResolvedValueOnce(result(rows.totalUnits))
    .mockResolvedValueOnce(result([]))
    .mockResolvedValueOnce(result([]))
}

function mockWorker(): MockWorker {
  return {
    recognize: jest.fn(),
    reinitialize: jest.fn().mockResolvedValue(undefined),
    setParameters: jest.fn().mockResolvedValue(undefined),
    terminate: jest.fn().mockResolvedValue(undefined),
  }
}

describe('Tesseract targeted short-table integration', () => {
  beforeEach(() => {
    createWorkerMock.mockReset()
  })

  it('returns a fully corroborated two-row targeted draft without full-page OCR', async () => {
    const worker = mockWorker()
    queueShortRecognition(worker, 2)
    createWorkerMock.mockResolvedValue(worker as never)

    const page = await recognizeTesseractImage(new Uint8Array([1]), {
      width: 1000,
      height: 2000,
    })

    expect(page.words).toEqual([])
    expect(page.recoveredRows).toHaveLength(2)
    expect(worker.recognize).toHaveBeenCalledTimes(10)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('falls back to full-page OCR when the full numeric band reveals another row', async () => {
    const worker = mockWorker()
    queueShortRecognition(worker, 3)
    worker.recognize.mockResolvedValueOnce(
      result([word('full-page-result', 100, 100)])
    )
    createWorkerMock.mockResolvedValue(worker as never)

    const page = await recognizeTesseractImage(new Uint8Array([1]), {
      width: 1000,
      height: 2000,
    })

    expect(page.recoveredRows).toBeUndefined()
    expect(page.words.map((candidate) => candidate.text)).toEqual([
      'full-page-result',
    ])
    expect(worker.recognize).toHaveBeenCalledTimes(11)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})
