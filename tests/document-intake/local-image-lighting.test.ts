import {
  assessLocalImageDetail,
  assessLocalImageLighting,
  summarizeLocalImageDetail,
  summarizeLocalImageLighting,
} from '@/lib/document-intake'

function grayscalePixels(
  width: number,
  height: number,
  values: readonly number[]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)

  values.forEach((value, index) => {
    const offset = index * 4
    data[offset] = value
    data[offset + 1] = value
    data[offset + 2] = value
    data[offset + 3] = 255
  })

  return data
}

function patternedDocumentPixels(width: number, height: number): Uint8ClampedArray {
  const values = Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    const isTableRule = x % 29 === 0 || y % 17 === 0
    const isTextStroke = y % 17 >= 4 && y % 17 <= 10 && x % 13 < 2
    return isTableRule || isTextStroke ? 20 : 235
  })

  return grayscalePixels(width, height, values)
}

describe('local image lighting advice', () => {
  it('flags only an extremely dark local raster and never turns it into a rejection', () => {
    const metrics = summarizeLocalImageLighting({
      width: 3,
      height: 3,
      data: grayscalePixels(3, 3, Array.from({ length: 9 }, () => 20)),
    })

    expect(metrics?.meanLuminance).toBeCloseTo(20)
    expect(metrics?.darkPixelRatio).toBe(1)
    expect(metrics?.darkestRegionLuminance).toBeCloseTo(20)
    expect(metrics?.brightestRegionLuminance).toBeCloseTo(20)
    expect(assessLocalImageLighting(metrics)).toEqual(['TOO_DARK'])
  })

  it('identifies a strong lighting imbalance without misclassifying a normal document as dark', () => {
    const values = Array.from({ length: 36 }, () => 230)
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        values[y * 6 + x] = 15
      }
    }
    const metrics = summarizeLocalImageLighting({
      width: 6,
      height: 6,
      data: grayscalePixels(6, 6, values),
    })

    expect(assessLocalImageLighting(metrics)).toEqual(['UNEVENT_LIGHTING'])
  })

  it('keeps an ordinary high-contrast document-like raster clear', () => {
    const values = Array.from({ length: 36 }, () => 235)
    for (const index of [7, 10, 13, 16, 19, 22, 25, 28]) {
      values[index] = 25
    }
    const metrics = summarizeLocalImageLighting({
      width: 6,
      height: 6,
      data: grayscalePixels(6, 6, values),
    })

    expect(assessLocalImageLighting(metrics)).toEqual([])
  })

  it('flattens transparent pixels onto a white document background', () => {
    const metrics = summarizeLocalImageLighting({
      width: 1,
      height: 1,
      data: Uint8ClampedArray.from([0, 0, 0, 0]),
    })

    expect(metrics?.meanLuminance).toBeCloseTo(255)
    expect(metrics?.darkPixelRatio).toBe(0)
  })

  it('returns no advice when local pixel data or metrics are invalid', () => {
    expect(
      summarizeLocalImageLighting({
        width: 2,
        height: 2,
        data: Uint8ClampedArray.from([0, 0, 0, 255]),
      })
    ).toBeNull()
    expect(
      assessLocalImageLighting({
        meanLuminance: Number.NaN,
        luminanceStandardDeviation: 0,
        darkPixelRatio: 0,
        darkestRegionLuminance: 0,
        brightestRegionLuminance: 0,
      })
    ).toEqual([])
  })

  it('advises when a large local raster has almost no central detail', () => {
    const metrics = summarizeLocalImageDetail({
      width: 120,
      height: 120,
      data: grayscalePixels(120, 120, Array.from({ length: 120 * 120 }, () => 245)),
    })

    expect(metrics?.interiorPixelCount).toBe(12_100)
    expect(metrics?.meanAbsoluteLaplacian).toBeCloseTo(0)
    expect(metrics?.strongLaplacianRatio).toBe(0)
    expect(assessLocalImageDetail(metrics)).toEqual(['LOW_EDGE_DETAIL'])
  })

  it('does not confuse a document-like table and text pattern with a blurred capture', () => {
    const metrics = summarizeLocalImageDetail({
      width: 120,
      height: 120,
      data: patternedDocumentPixels(120, 120),
    })

    expect(metrics?.meanAbsoluteLaplacian).toBeGreaterThan(1.25)
    expect(metrics?.strongLaplacianRatio).toBeGreaterThan(0.001)
    expect(assessLocalImageDetail(metrics)).toEqual([])
  })

  it('ignores detail that exists only on the outer page border', () => {
    const values = Array.from({ length: 120 * 120 }, (_, index) => {
      const x = index % 120
      const y = Math.floor(index / 120)
      return x < 4 || x >= 116 || y < 4 || y >= 116 ? 15 : 245
    })
    const metrics = summarizeLocalImageDetail({
      width: 120,
      height: 120,
      data: grayscalePixels(120, 120, values),
    })

    expect(assessLocalImageDetail(metrics)).toEqual(['LOW_EDGE_DETAIL'])
  })

  it('withholds detail advice when the sample is too small to be reliable', () => {
    const metrics = summarizeLocalImageDetail({
      width: 80,
      height: 80,
      data: patternedDocumentPixels(80, 80),
    })

    expect(metrics).toBeNull()
    expect(assessLocalImageDetail(metrics)).toEqual([])
  })

  it('withholds detail advice when its metrics are invalid', () => {
    expect(
      assessLocalImageDetail({
        meanAbsoluteLaplacian: Number.NaN,
        strongLaplacianRatio: 0,
        interiorPixelCount: 12_100,
      })
    ).toEqual([])
  })
})
