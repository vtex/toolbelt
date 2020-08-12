import { randomCryptoString } from './randomCryptoString'

it('Creates a string of length specified and only uses characters from alphabet', () => {
  const alph = ['a', 'b', 'c', 'd', 'e', '_', '~', '-']
  const str = randomCryptoString(60, alph.join(''))
  expect(str.length).toEqual(60)
  for (let i = 0; i < str.length; i++) {
    expect(alph).toContain(str.charAt(i))
  }
})
