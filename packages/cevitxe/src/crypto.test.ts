import { symmetric, deriveKey, signatures, asymmetric, SignedMessage } from './crypto'

const plaintext = 'The leopard pounces at noon'
const zalgoText = 'ẓ̴̇a̷̰̚l̶̥͑g̶̼͂o̴̅͜ ̸̻̏í̴͜s̵̜͠ ̴̦̃u̸̼̎p̵̘̔o̵̦͑ǹ̵̰ ̶̢͘u̵̇ͅș̷̏'
const poop = '💩'
const json = JSON.stringify(require('../package.json'))

describe('crypto', () => {
  describe('deriveKey', () => {
    test('returns a 32-byte key', () => {
      const password = 'hello123'
      const key = deriveKey(password)
      expect(key).toHaveLength(32)
    })
  })

  describe('symmetric encrypt/decrypt', () => {
    const password = 'hello123'
    const longPassword =
      'eRPpBTwwa6gruOTq03AXGRFuR4WxBS6l6pGIiVlQPydVzEoWT2ST6Xqlyr1+XqYmmFEr4lFJ/u7l43RWd1Pxmaw2uG9pCCjw2JLnaRYcuy5XcwHRSEI4Cdcq+faT3GTvBtQGjWBmt7zPutPQIMB7Ii4fQyiB3mt67z2F68Y0Eph0/9JIwXeGfOVVQt347PCPCA6hgXe7+i4W6ylyIIuEQzJMQYGzu+l/2ktYOHxgY3pF0AL8yHuRPG30HFd6aSncAPyOBUyTI4qZ4S1IXJNLyBOq8pwNHdsxnxKw3QZarHniyoUEpvI+wMUpSRxZMHQOgaKBWH/wNFi3DgX3wfZdZTaPCD0G/1msL/e9ZtvXN9PApgULXJQmrWUO2chw5ptB8/xGd6h0Q3yDt8vcN/muWyoCSn91VlDIvSh1NOoEX08JEI1x8HJ7OE9TwrYJFFfgDAeV1D53IEcVkKe+5rtfjjwQBgfx+DA13DEee/ODaghvhX/venLSrFYWRk55gCc2BIyKATjYjLmLSHZ16Z98j09Ii93V7+E7XbzSuRqRQykzCRLRB0NoF7mQL46gRLF2gNXiqVqIUiY1u9rouxWZhSFDBeqWxWBjo3WJ7hZaaUTKSeInW6FTQuVqu4Tdn0/I3rwIhAAebVCftbakaWcjVsFsdyS8CLoiQBXg50VyriiFc2ckfyFs+AJBpndXkGOlg99EtXvRPzAR9NunGQxupCiRO3bnZG1xuKV3Y2iNc17O/WPDwqTIx/0CCUkZuDuJoiqhX+HJ6uyE6tS/7WBLCuVURirMkjBKNanWRe0KVopZgYVw2IEWbvO+PG7TO227llOSlI7mLwRb+QUSYtHKihp5xedTYAfq3l4Mdvt2D/6+lehhL/ijvieWs/RR9TMZE7eZcLwj8powELqMDYaL9H7pNZN0ha1AhOX+LTVWwmGS8K7f/s7XCgT+bl93SBRVfXbPA7LLkEy2PMHk3Xel0fn8zbGi+Z5I0QiNRFF0RTIXwBTZexV187Mkbv9J9ophj6vGs9TdeU5ByzWAVEgxwWhycBeamrKVoSypjowrftqAElL9OVdTAt6YMf/SuFW+dLm6acYcuzCWXs3kIEzDEJJc8TzLX2+CLk9yRmv1KGGicgDLvEE3mMbrtX18aaR6JP1j1zdwmfs5VgqA+Z93KR0m3OrXy4sYNVlI3ciTcU4jFO29FlzNTjre1Bl96apbX4ZJ6dY0c5GPFJastjgE9KY6/L5OD5NN2TaWWgAVh/Rv0wBLsu0vTWBMgLBoml0Tv4txtFDJKYKxflsNKLk053be0WQP10aOsEacuLxleP7eshDL/SmGk0vro3Np75bmLuybchS5Ns472y/5tRqZum3xekYi8DkAmVFCPzBkmq4TFUu9IxcjUapqIxFP6WqEI5vSOW6cgrENh983E5nQ8+wvAKoBFbzd6/aLmIyWqocGZvBl2/vs+XUvkOP3+aXHt/EJQrB0t6CdHyyMzUqGsCZoa/5JNFVH'
    const knownCipher =
      'drV+sao1EbVPG8S/Z+Z3gfaYBXoBiOYWIVVElGDtoNcZlWKtJsIq2AWBmjz3uZZgIExMAR+r8qqxfnsy40BPwM9zZQ=='

    test('alice encrypts using a password they both know', () => {
      const cipher = symmetric.encrypt(plaintext, password)
      expect(cipher).toHaveLength(24 + 68) // IV + ciphertext
      expect(cipher).not.toEqual(knownCipher) // each encryption is different
    })

    test('bob decrypts using the password they both know', () => {
      expect(symmetric.decrypt(knownCipher, password)).toEqual(plaintext)
    })

    test(`eve tries to decrypt but gets an error because she doesn't know the password`, () => {
      const wrongPassword = 'nachopassword'
      expect(() => symmetric.decrypt(knownCipher, wrongPassword)).toThrow()
    })

    test.each`
      label                 | message      | password
      ${'plain text'}       | ${plaintext} | ${password}
      ${'empty string'}     | ${''}        | ${password}
      ${'emoji message'}    | ${poop}      | ${password}
      ${'stringified json'} | ${json}      | ${password}
      ${'zalgo text'}       | ${zalgoText} | ${password}
      ${'empty password'}   | ${plaintext} | ${''}
      ${'emoji password'}   | ${plaintext} | ${poop}
      ${'long password'}    | ${plaintext} | ${longPassword}
      ${'zalgo password'}   | ${plaintext} | ${zalgoText}
    `('round trip: $label', ({ message, password }) => {
      const cipher = symmetric.encrypt(message, password)
      expect(symmetric.decrypt(cipher, password)).toEqual(message)
    })
  })

  describe('asymmetric encrypt/decrypt', () => {
    const alice = {
      publicKey: 'uUcxiVUXq8LnLVS5yjmfIdd2ZAuWIWfM4IVeuXqSyUY=',
      secretKey: 'wOyhsgjAdHPo8oPew31wyMJo+1ckA0zQoebgtN8hK9U=',
    }

    const bob = {
      publicKey: 'QwqgJTVqB1hxdMxgY42lQT9gss1SUrUtfh45wZzc33g=',
      secretKey: 'paGP2tYzpV8kYzeD5dJtcmB1o16N1uh9eBadkvHktnY=',
    }

    const eve = {
      publicKey: 'jVj8N4+zpxIoVLlpu0KA7Ai8OR8I4QhnS64WMhQk4R0=',
      secretKey: 'qiSxzj2NgUt5YUj6PccfiEjYQI8wIlPgWqs9HeaBEbs=',
    }

    const knownCipher =
      '0UllJr2FBwolmAGHg0FUuAfpweLyUSgYT74U/RH6FeEiDw64zFxvFeLJd6LX0D/YMYxj1aNwRmy5LapQIyh1QnKLuQ=='

    test(`alice encrypts using her secret key and bob's public key`, () => {
      const cipherFromAlice = asymmetric.encrypt(plaintext, bob.publicKey, alice.secretKey)
      expect(cipherFromAlice).toHaveLength(24 + 68) // IV + ciphertext
      expect(cipherFromAlice).not.toEqual(knownCipher) // each encryption is different
    })

    test(`bob decrypts using his secret key and alice's public key`, () => {
      const cipherFromAlice = knownCipher
      expect(asymmetric.decrypt(cipherFromAlice, alice.publicKey, bob.secretKey)).toEqual(plaintext)
    })

    test(`eve can't decrypt with her secret key`, () => {
      const cipherFromAlice = knownCipher
      expect(() => asymmetric.decrypt(cipherFromAlice, alice.publicKey, eve.secretKey)).toThrow()
    })

    test(`can't decrypt with the wrong public key`, () => {
      const cipherFromAlice = knownCipher
      expect(() => asymmetric.decrypt(cipherFromAlice, eve.publicKey, bob.secretKey)).toThrow()
    })

    test.each`
      label                 | message
      ${'plain text'}       | ${plaintext}
      ${'empty string'}     | ${''}
      ${'emoji message'}    | ${poop}
      ${'stringified json'} | ${json}
      ${'zalgo text'}       | ${zalgoText}
    `('round trip: $label', ({ message }) => {
      const encrypted = asymmetric.encrypt(message, bob.publicKey, alice.secretKey)
      const decrypted = asymmetric.decrypt(encrypted, alice.publicKey, bob.secretKey)
      expect(decrypted).toEqual(message)
    })

    test('fwiw: cannot use signature keys to encrypt', () => {
      const a = signatures.keyPair()
      const b = signatures.keyPair()
      expect(() => asymmetric.encrypt(plaintext, b.publicKey, a.secretKey)).toThrow()
    })
  })

  describe('signatures', () => {
    const alice = {
      publicKey: 'OH8olQvUFfxqjd+A4FkPQZq0mSb9GGKIOfuCFLDd0B0=',
      secretKey:
        'TVTqqajwDkAMlztAJEkgcnEd1KzWheaDQE6sxPGlUlY4fyiVC9QV/GqN34DgWQ9BmrSZJv0YYog5+4IUsN3QHQ==',
    }

    const signedMessage: SignedMessage = {
      content: 'one if by day, two if by night',
      signature:
        'Qd9f/Xgk9QFG9nVNb/QkHqKTNF0JQCEy848m4w8UmxSRwnuomBZz6Bi8wDopz//iKwHq3ipMvA2AGAw8Oo19Dw==',
      publicKey: alice.publicKey,
    }

    test('alice signs with her secret key', () => {
      const { content, signature: knownSignature } = signedMessage
      const signature = signatures.sign(content, alice.secretKey)
      expect(signature).toEqual(knownSignature)
    })

    test(`bob verifies using alice's public key`, () => {
      const isLegit = signatures.verify(signedMessage)
      expect(isLegit).toBe(true)
    })

    test(`eve tampers with the message, but bob is not fooled`, () => {
      const tamperedContents = signedMessage.content
        .replace('one', 'forty-two')
        .replace('two', 'seventy-twelve')
      const tamperedMessage = {
        ...signedMessage,
        contents: tamperedContents,
      }
      const isLegit = signatures.verify(tamperedMessage)
      expect(isLegit).toBe(false)
    })

    test(`fails verification if signature is wrong`, () => {
      const badSignature =
        'Iamabadbadsignature+JlhN8veVIBQ/SO4d59oLiCkEG57ZubXLsMaaNzk91ujZjXkS9doP2vCAFimKvKdgjy=='
      const badMessage = {
        ...signedMessage,
        signature: badSignature,
      }
      const isLegit = signatures.verify(badMessage)
      expect(isLegit).toBe(false)
    })

    test(`fails verification if public key is wrong`, () => {
      const badKey = 'NachoKeySb9GGKIOfuCFLDd0B0OH8olQvUFfxqjd+A4='
      const badMessage = {
        ...signedMessage,
        publicKey: badKey,
      }
      const isLegit = signatures.verify(badMessage)
      expect(isLegit).toBe(false)
    })

    test('fwiw: cannot use encryption keys to sign', () => {
      const a = asymmetric.keyPair()
      expect(() => signatures.sign(plaintext, a.secretKey)).toThrow()
    })
  })
})
