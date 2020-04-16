import * as base64 from '@stablelib/base64'
import * as utf8 from '@stablelib/utf8'
import memoize from 'fast-memoize'
import scrypt from 'scryptsy'
import crypto from 'tweetnacl'

// These are straightforward implementations of NaCl crypto functions, accepting and returning
// base64 strings rather than byte arrays. The symmetric `encrypt` and `decrypt` functions take a
// passwords and expand them to 32-byte keys using the [scrypt](https://en.wikipedia.org/wiki/Scrypt) algorithm.

/**
 *
 * @param plaintext The string to encrypt
 * @param password The password to
 */
export const encrypt = (plaintext: string, password: string) => {
  const key = deriveKey(password)

  const nonce = crypto.randomBytes(crypto.secretbox.nonceLength)
  const message = utf8.encode(plaintext)
  const box = crypto.secretbox(message, nonce, key)

  const fullMessage = new Uint8Array(nonce.length + box.length)
  fullMessage.set(nonce)
  fullMessage.set(box, nonce.length)

  return base64.encode(fullMessage)
}

export const decrypt = (cipher: string, password: string) => {
  const key = deriveKey(password)

  const cipherbytes = base64.decode(cipher)
  const nonce = cipherbytes.slice(0, crypto.secretbox.nonceLength)
  const message = cipherbytes.slice(crypto.secretbox.nonceLength, cipher.length)

  const decrypted = crypto.secretbox.open(message, nonce, key)
  if (!decrypted) throw new Error('Could not decrypt message')

  return utf8.decode(decrypted)
}

/**
 * Uses `scrypt` to derive a 32-byte key from
 */
export const deriveKey = memoize((password: string) => {
  const salt = 'Sõdìüm ÇhLôrɩdé'
  const blockSizeFactor = 8
  const costFactor = 2 ** 11 // <100ms execution time on my box
  const parallelizationFactor = 1
  return scrypt(
    password,
    salt,
    costFactor,
    blockSizeFactor,
    parallelizationFactor,
    crypto.secretbox.keyLength // 32
  )
})

export const keyPair = () => {
  const keys = crypto.sign.keyPair()
  return {
    publicKey: base64.encode(keys.publicKey),
    secretKey: base64.encode(keys.secretKey),
  }
}
export const sign = (message: string, privateKey: string) =>
  base64.encode(
    crypto.sign.detached(
      utf8.encode(message), //
      base64.decode(privateKey)
    )
  )

export const verify = (message: string, signature: string, publicKey: string) =>
  crypto.sign.detached.verify(
    utf8.encode(message),
    base64.decode(signature),
    base64.decode(publicKey)
  )
