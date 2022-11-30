import { isUtf8 } from './utf8'

const positives = [
  [...Buffer.from('Gino is a black cat 😸')],
  [...Buffer.from('\uD800\uDC00\u0021\u0021')],
  [0b11000011, 0b10001000], // 2-bit
  [0b11100011, 0b10001000, 0b10001000] // 3-bit
]

const negatives = [
  [0b11101111, 0b11001111],
  [0b00000111, 0b11111111]
]

describe('utf8', () => {
  it('should detect UTF8 bytes', () => {
    for (let i = 0; i < positives.length; i++) {
      const arr = positives[i]
      expect(isUtf8(arr, 0, arr.length))
        .toBe(true)
    }
  })

  it('should detect non-UTF8 bytes', () => {
    for (let i = 0; i < negatives.length; i++) {
      const arr = negatives[i]
      expect(isUtf8(arr, 0, arr.length))
        .toBe(false)
    }
  })
})
