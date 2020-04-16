import { encrypt, decrypt } from './crypto'

describe('crypto', () => {
  describe('encrypt/decrypt', () => {
    it('encrypts', () => {
      const plaintext = 'Hello, world!'
      const password = 'hello123'
      const cipher = encrypt(plaintext, password)
      expect(cipher).toHaveLength(24 + 48) // IV + ciphertext
    })

    it('decrypts', () => {
      const password = 'hello123'
      const cipher = 'y+Aig0DS8P+bn2DLY3fdUWGTQ5P7iZC1EUeBO+baAgUELfQ4JMjzjBokO2p+Ua5of7ECeGI='
      const decrypted = decrypt(cipher, password)
      expect(decrypted).toEqual('Hello, world!')
    })

    it(`throws an error when trying to decrypt with the wrong password`, () => {
      const password = 'dontpwnmebro'
      const cipher = 'y+Aig0DS8P+bn2DLY3fdUWGTQ5P7iZC1EUeBO+baAgUELfQ4JMjzjBokO2p+Ua5of7ECeGI='
      expect(() => decrypt(cipher, password)).toThrow()
    })

    it('decrypts what it encrypts', () => {
      const plaintext = 'Hello, world!'
      const password = 'hello123'

      // encrypt
      const cipher = encrypt(plaintext, password)

      // decrypt
      const decrypted = decrypt(cipher, password)
      expect(decrypted).toEqual(plaintext)
    })
  })
})
