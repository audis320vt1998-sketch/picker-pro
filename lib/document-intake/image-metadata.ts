export interface ImageDimensions {
  width: number
  height: number
}

function equalsAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  if (offset < 0 || offset + value.length > bytes.length) {
    return false
  }

  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0))
}

function uint16be(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null
  }

  return (bytes[offset] << 8) | bytes[offset + 1]
}

function uint16le(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null
  }

  return bytes[offset] | (bytes[offset + 1] << 8)
}

function uint24le(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 3 > bytes.length) {
    return null
  }

  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function uint32be(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null
  }

  return (
    bytes[offset] * 2 ** 24 +
    bytes[offset + 1] * 2 ** 16 +
    bytes[offset + 2] * 2 ** 8 +
    bytes[offset + 3]
  )
}

function toDimensions(
  width: number | null,
  height: number | null
): ImageDimensions | null {
  if (
    width !== null &&
    height !== null &&
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
  ) {
    return { width, height }
  }

  return null
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null
  }

  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (bytes[offset] === 0xff) {
      offset += 1
    }
    const marker = bytes[offset]
    offset += 1

    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      return null
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }

    const segmentLength = uint16be(bytes, offset)
    if (segmentLength === null || segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null
    }

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    if (isStartOfFrame) {
      const height = uint16be(bytes, offset + 3)
      const width = uint16be(bytes, offset + 5)
      return toDimensions(width, height)
    }

    offset += segmentLength
  }

  return null
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (signature.some((value, index) => bytes[index] !== value) || !equalsAscii(bytes, 12, 'IHDR')) {
    return null
  }

  const width = uint32be(bytes, 16)
  const height = uint32be(bytes, 20)
  return toDimensions(width, height)
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (!equalsAscii(bytes, 0, 'RIFF') || !equalsAscii(bytes, 8, 'WEBP')) {
    return null
  }

  if (equalsAscii(bytes, 12, 'VP8X')) {
    const widthMinusOne = uint24le(bytes, 24)
    const heightMinusOne = uint24le(bytes, 27)
    return toDimensions(
      widthMinusOne === null ? null : widthMinusOne + 1,
      heightMinusOne === null ? null : heightMinusOne + 1
    )
  }

  if (equalsAscii(bytes, 12, 'VP8 ')) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null
    }
    const rawWidth = uint16le(bytes, 26)
    const rawHeight = uint16le(bytes, 28)
    const width = rawWidth === null ? null : rawWidth & 0x3fff
    const height = rawHeight === null ? null : rawHeight & 0x3fff
    return toDimensions(width, height)
  }

  if (equalsAscii(bytes, 12, 'VP8L') && bytes[20] === 0x2f) {
    if (bytes.length < 25) {
      return null
    }
    const packed =
      bytes[21] |
      (bytes[22] << 8) |
      (bytes[23] << 16) |
      (bytes[24] << 24)
    const width = (packed & 0x3fff) + 1
    const height = ((packed >>> 14) & 0x3fff) + 1
    return toDimensions(width, height)
  }

  return null
}

/** Reads only a raster header; it never persists the image bytes. */
export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  return jpegDimensions(bytes) ?? pngDimensions(bytes) ?? webpDimensions(bytes)
}
