export type LocalImageLightingIssue =
  | 'TOO_DARK'
  | 'UNEVENT_LIGHTING'

export interface LocalImageLightingMetrics {
  meanLuminance: number
  luminanceStandardDeviation: number
  darkPixelRatio: number
  darkestRegionLuminance: number
  brightestRegionLuminance: number
}

export interface LocalImageLuminancePixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

const DARK_LUMINANCE_LIMIT = 60
const REGION_GRID_SIZE = 3
const MAX_BROWSER_SAMPLE_EDGE = 420

function isFiniteUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

function isFiniteLuminance(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 255
}

function isValidMetrics(metrics: LocalImageLightingMetrics): boolean {
  return (
    isFiniteLuminance(metrics.meanLuminance) &&
    isFiniteLuminance(metrics.luminanceStandardDeviation) &&
    isFiniteUnitInterval(metrics.darkPixelRatio) &&
    isFiniteLuminance(metrics.darkestRegionLuminance) &&
    isFiniteLuminance(metrics.brightestRegionLuminance) &&
    metrics.darkestRegionLuminance <= metrics.brightestRegionLuminance
  )
}

function luminance(red: number, green: number, blue: number, alpha: number): number {
  // Transparent pixels are rendered onto the same white background a document
  // preview uses, rather than being incorrectly treated as black.
  const opacity = alpha / 255
  const flattenedRed = red * opacity + 255 * (1 - opacity)
  const flattenedGreen = green * opacity + 255 * (1 - opacity)
  const flattenedBlue = blue * opacity + 255 * (1 - opacity)

  return 0.2126 * flattenedRed + 0.7152 * flattenedGreen + 0.0722 * flattenedBlue
}

/**
 * Summarizes pixels from a deliberately down-scaled browser canvas. This is
 * not OCR and does not extract any document text; it only estimates whether
 * the lighting is extremely dark or uneven.
 */
export function summarizeLocalImageLighting(
  pixels: LocalImageLuminancePixels
): LocalImageLightingMetrics | null {
  const { width, height, data } = pixels
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    data.length < width * height * 4
  ) {
    return null
  }

  const regionCount = REGION_GRID_SIZE * REGION_GRID_SIZE
  const regionSums = Array.from({ length: regionCount }, () => 0)
  const regionPixelCounts = Array.from({ length: regionCount }, () => 0)
  let luminanceSum = 0
  let squaredLuminanceSum = 0
  let darkPixelCount = 0

  for (let y = 0; y < height; y += 1) {
    const regionY = Math.min(
      REGION_GRID_SIZE - 1,
      Math.floor((y * REGION_GRID_SIZE) / height)
    )

    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const value = luminance(
        data[offset] ?? 0,
        data[offset + 1] ?? 0,
        data[offset + 2] ?? 0,
        data[offset + 3] ?? 0
      )
      const regionX = Math.min(
        REGION_GRID_SIZE - 1,
        Math.floor((x * REGION_GRID_SIZE) / width)
      )
      const regionIndex = regionY * REGION_GRID_SIZE + regionX

      luminanceSum += value
      squaredLuminanceSum += value * value
      regionSums[regionIndex] += value
      regionPixelCounts[regionIndex] += 1
      if (value <= DARK_LUMINANCE_LIMIT) {
        darkPixelCount += 1
      }
    }
  }

  const pixelCount = width * height
  const meanLuminance = luminanceSum / pixelCount
  const variance = Math.max(0, squaredLuminanceSum / pixelCount - meanLuminance ** 2)
  const regionAverages = regionSums.map(
    (sum, index) => sum / (regionPixelCounts[index] || 1)
  )

  return {
    meanLuminance,
    luminanceStandardDeviation: Math.sqrt(variance),
    darkPixelRatio: darkPixelCount / pixelCount,
    darkestRegionLuminance: Math.min(...regionAverages),
    brightestRegionLuminance: Math.max(...regionAverages),
  }
}

/**
 * Returns conservative, advisory-only lighting flags. Thresholds deliberately
 * require strong signals so normal white paper and ordinary printed text do
 * not turn into a false rejection. The server remains the authoritative OCR
 * validation boundary.
 */
export function assessLocalImageLighting(
  metrics: LocalImageLightingMetrics | null
): readonly LocalImageLightingIssue[] {
  if (!metrics || !isValidMetrics(metrics)) {
    return []
  }

  const issues: LocalImageLightingIssue[] = []
  if (metrics.meanLuminance < 75 && metrics.darkPixelRatio > 0.45) {
    issues.push('TOO_DARK')
  }

  if (
    metrics.brightestRegionLuminance - metrics.darkestRegionLuminance >= 85 &&
    metrics.darkestRegionLuminance < 105 &&
    metrics.brightestRegionLuminance > 180
  ) {
    issues.push('UNEVENT_LIGHTING')
  }

  return issues
}

function scaledBrowserSampleDimensions(
  width: number,
  height: number
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  const scale = Math.min(1, MAX_BROWSER_SAMPLE_EDGE / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

interface LoadedLocalImage {
  image: HTMLImageElement
  release: () => void
}

function loadLocalImageElement(file: File): Promise<LoadedLocalImage> {
  return new Promise((resolve, reject) => {
    if (
      typeof Image === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      reject(new Error('Browser image decoding is unavailable.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    let released = false
    const release = () => {
      if (released) {
        return
      }

      released = true
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(objectUrl)
    }

    image.onload = () => {
      image.onload = null
      image.onerror = null
      resolve({ image, release })
    }
    image.onerror = () => {
      release()
      reject(new Error('Browser image decoding failed.'))
    }
    image.src = objectUrl
  })
}

/**
 * Reads a small in-memory canvas in the browser. It returns no data to the
 * server, performs no OCR, and deliberately yields `null` when a browser does
 * not support this optional advisory check.
 */
export async function inspectLocalImageLighting(
  file: File
): Promise<readonly LocalImageLightingIssue[] | null> {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const { image, release } = await loadLocalImageElement(file)
    try {
      const dimensions = scaledBrowserSampleDimensions(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height
      )
      if (!dimensions) {
        return null
      }

      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) {
        return null
      }

      context.drawImage(image, 0, 0, dimensions.width, dimensions.height)
      const imageData = context.getImageData(0, 0, dimensions.width, dimensions.height)
      return assessLocalImageLighting(
        summarizeLocalImageLighting({
          width: dimensions.width,
          height: dimensions.height,
          data: imageData.data,
        })
      )
    } finally {
      release()
    }
  } catch {
    return null
  }
}
