import { encrypt, decrypt } from './crypto'

describe('crypto', () => {
  describe('encrypt/decrypt', () => {
    const plaintext = 'The leopard pounces at noon'
    const password = 'hello123'
    const knownCipher =
      'drV+sao1EbVPG8S/Z+Z3gfaYBXoBiOYWIVVElGDtoNcZlWKtJsIq2AWBmjz3uZZgIExMAR+r8qqxfnsy40BPwM9zZQ=='

    it('encrypts', () => {
      const cipher = encrypt(plaintext, password)
      expect(cipher).toHaveLength(24 + 68) // IV + ciphertext
      expect(cipher).not.toEqual(knownCipher) // each encryption is different
    })

    it('decrypts', () => {
      expect(decrypt(knownCipher, password)).toEqual(plaintext)
    })

    it(`throws an error when trying to decrypt with the wrong password`, () => {
      const wrongPassword = 'nachopassword'
      expect(() => decrypt(knownCipher, wrongPassword)).toThrow()
    })

    // prettier-ignore
    const cases = [
      { label: 'hello world'       },
      { label: 'empty string',     s: '' },
      { label: 'emoji message',    s: '💩' },
      { label: 'stringified json', s: JSON.stringify(require('../package.json')) },
      { label: 'zalgo text',       s: 'ẓ̴̇a̷̰̚l̶̥͑g̶̼͂o̴̅͜ ̸̻̏í̴͜s̵̜͠ ̴̦̃u̸̼̎p̵̘̔o̵̦͑ǹ̵̰ ̶̢͘u̵̇ͅș̷̏' },
      
      { label: 'empty password',   pw: '' },
      { label: 'emoji password',   pw: '⌚🤷‍♀️🙄😐🎈' },
      { label: 'long password',    pw: 'eRPpBTwwa6gruOTq03AXGRFuR4WxBS6l6pGIiVlQPydVzEoWT2ST6Xqlyr1+XqYmmFEr4lFJ/u7l43RWd1Pxmaw2uG9pCCjw2JLnaRYcuy5XcwHRSEI4Cdcq+faT3GTvBtQGjWBmt7zPutPQIMB7Ii4fQyiB3mt67z2F68Y0Eph0/9JIwXeGfOVVQt347PCPCA6hgXe7+i4W6ylyIIuEQzJMQYGzu+l/2ktYOHxgY3pF0AL8yHuRPG30HFd6aSncAPyOBUyTI4qZ4S1IXJNLyBOq8pwNHdsxnxKw3QZarHniyoUEpvI+wMUpSRxZMHQOgaKBWH/wNFi3DgX3wfZdZTaPCD0G/1msL/e9ZtvXN9PApgULXJQmrWUO2chw5ptB8/xGd6h0Q3yDt8vcN/muWyoCSn91VlDIvSh1NOoEX08JEI1x8HJ7OE9TwrYJFFfgDAeV1D53IEcVkKe+5rtfjjwQBgfx+DA13DEee/ODaghvhX/venLSrFYWRk55gCc2BIyKATjYjLmLSHZ16Z98j09Ii93V7+E7XbzSuRqRQykzCRLRB0NoF7mQL46gRLF2gNXiqVqIUiY1u9rouxWZhSFDBeqWxWBjo3WJ7hZaaUTKSeInW6FTQuVqu4Tdn0/I3rwIhAAebVCftbakaWcjVsFsdyS8CLoiQBXg50VyriiFc2ckfyFs+AJBpndXkGOlg99EtXvRPzAR9NunGQxupCiRO3bnZG1xuKV3Y2iNc17O/WPDwqTIx/0CCUkZuDuJoiqhX+HJ6uyE6tS/7WBLCuVURirMkjBKNanWRe0KVopZgYVw2IEWbvO+PG7TO227llOSlI7mLwRb+QUSYtHKihp5xedTYAfq3l4Mdvt2D/6+lehhL/ijvieWs/RR9TMZE7eZcLwj8powELqMDYaL9H7pNZN0ha1AhOX+LTVWwmGS8K7f/s7XCgT+bl93SBRVfXbPA7LLkEy2PMHk3Xel0fn8zbGi+Z5I0QiNRFF0RTIXwBTZexV187Mkbv9J9ophj6vGs9TdeU5ByzWAVEgxwWhycBeamrKVoSypjowrftqAElL9OVdTAt6YMf/SuFW+dLm6acYcuzCWXs3kIEzDEJJc8TzLX2+CLk9yRmv1KGGicgDLvEE3mMbrtX18aaR6JP1j1zdwmfs5VgqA+Z93KR0m3OrXy4sYNVlI3ciTcU4jFO29FlzNTjre1Bl96apbX4ZJ6dY0c5GPFJastjgE9KY6/L5OD5NN2TaWWgAVh/Rv0wBLsu0vTWBMgLBoml0Tv4txtFDJKYKxflsNKLk053be0WQP10aOsEacuLxleP7eshDL/SmGk0vro3Np75bmLuybchS5Ns472y/5tRqZum3xekYi8DkAmVFCPzBkmq4TFUu9IxcjUapqIxFP6WqEI5vSOW6cgrENh983E5nQ8+wvAKoBFbzd6/aLmIyWqocGZvBl2/vs+XUvkOP3+aXHt/EJQrB0t6CdHyyMzUqGsCZoa/5JNFVH' },
      { label: 'zalgo password',   pw: 'c̶̨͗ẗ̵̢́h̸͒ͅṳ̶͝l̵̲̓h̴̜̎u̸͕̒' },
    ] as Case[]

    cases.forEach(({ s = plaintext, pw = password, label }) => {
      it(`round trip: ${label}`, () => {
        const cipher = encrypt(s, pw)
        expect(decrypt(cipher, pw)).toEqual(s)
      })
    })
  })
})

type Case = {
  s?: string
  pw?: string
  label: string
}
