import { encrypt, decrypt } from './crypto'

describe('crypto', () => {
  describe('encrypt/decrypt', () => {
    test('round trip', async () => {
      const plaintext = 'Hello, world!'
      const password = 'hello123'

      // encrypt
      const cipher = await encrypt(plaintext, password)
      expect(cipher).toHaveProperty('encrypted')
      expect(cipher).toHaveProperty('iv')

      // decrypt
      const decrypted = await decrypt(cipher, password)
      expect(decrypted).toEqual(plaintext)
    })
  })
})
