import { randomBytes } from 'crypto'

export function randomCryptoString(stringLength: number, alphabet: string) {
  if (alphabet.length > 256) {
    throw new Error("Argument 'alphabet' can't have more than 256 characters")
  }

  const bytes = randomBytes(stringLength)
  const result = new Array(stringLength)

  let cursor = 0
  for (let i = 0; i < stringLength; i++) {
    cursor += bytes[i]
    result[i] = alphabet[cursor % alphabet.length]
  }

  return result.join('')
}
