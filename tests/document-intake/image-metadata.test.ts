import { readImageDimensions } from '../../lib/document-intake'

function jpeg(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
  ])
}

function png(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    width >>> 24,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    height >>> 24,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  ])
}

function webpVp8x(width: number, height: number): Uint8Array {
  const widthMinusOne = width - 1
  const heightMinusOne = height - 1
  return Uint8Array.from([
    82,
    73,
    70,
    70,
    22,
    0,
    0,
    0,
    87,
    69,
    66,
    80,
    86,
    80,
    56,
    88,
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    widthMinusOne & 0xff,
    (widthMinusOne >>> 8) & 0xff,
    (widthMinusOne >>> 16) & 0xff,
    heightMinusOne & 0xff,
    (heightMinusOne >>> 8) & 0xff,
    (heightMinusOne >>> 16) & 0xff,
  ])
}

describe('readImageDimensions', () => {
  it.each([
    ['JPEG', jpeg(2880, 3840)],
    ['PNG', png(2880, 3840)],
    ['WebP VP8X', webpVp8x(2880, 3840)],
  ])('reads %s dimensions without decoding the image', (_format, bytes) => {
    expect(readImageDimensions(bytes)).toEqual({ width: 2880, height: 3840 })
  })

  it('rejects malformed bytes', () => {
    expect(readImageDimensions(Uint8Array.from([1, 2, 3]))).toBeNull()
  })
})
