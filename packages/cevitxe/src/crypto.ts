import * as base64 from '@stablelib/base64'
import * as utf8 from '@stablelib/utf8'
import memoize from 'fast-memoize'
import scrypt from 'scryptsy'
import nacl from 'tweetnacl'

// These are straightforward implementations of NaCl crypto functions, accepting and returning
// base64 strings rather than byte arrays. The symmetric `encrypt` and `decrypt` functions take
// passwords and expand them to 32-byte keys using the [scrypt](https://en.wikipedia.org/wiki/Scrypt) algorithm.

/**
 * Symmetrically encrypts a string of text.
 * @param plaintext The plaintext to encrypt
 * @param password The password to use as a seed for an encryption key
 * @returns The encrypted data, encoded as a base64 string. The first 24 characters are the nonce;
 * the rest of the string is the encrypted message.
 * @see decrypt
 */
export const encrypt = (plaintext: string, password: string) => {
  const key = deriveKey(password)

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const message = utf8.encode(plaintext)
  const box = nacl.secretbox(message, nonce, key)

  const fullMessage = new Uint8Array(nonce.length + box.length)
  fullMessage.set(nonce)
  fullMessage.set(box, nonce.length)

  return base64.encode(fullMessage)
}

/**
 * Symmetrically decrypts a message encrypted by `encrypt`.
 * @param cipher The encrypted data, encoded as a base64 string (the first 24 characters are the nonce;
 * the rest of the string is the encrypted message)
 * @param password The password used as a seed for an encryption key
 * @returns The original plaintext
 * @see encrypt
 */
export const decrypt = (cipher: string, password: string) => {
  const key = deriveKey(password)
  const cipherbytes = base64.decode(cipher)

  // the first 24 characters are the nonce
  const nonce = cipherbytes.slice(0, nacl.secretbox.nonceLength)
  // the rest is the message
  const message = cipherbytes.slice(nacl.secretbox.nonceLength, cipher.length)

  const decrypted = nacl.secretbox.open(message, nonce, key)
  if (!decrypted) throw new Error('Could not decrypt message')

  return utf8.decode(decrypted)
}

/**
 * Uses the `scrypt` algorithm to deterministically derive a 32-byte key from the password provided.
 * @password The password to use as a seed
 * @returns A 32-byte secret key to use for symmetric encryption
 */
export const deriveKey = memoize((password: string) => {
  const salt = 'Sõdìüm ÇhLôrɩdé'

  // `scrypt` is intended to be expensive not only in CPU time but in memory usage.
  // These parameters are calibrated to keep the derivation time around 100ms "on my box"
  // as per author recommendations. See http://tarsnap.com/scrypt/scrypt.pdf
  const blockSizeFactor = 8
  const costFactor = 2 ** 11
  const parallelizationFactor = 1

  return scrypt(
    password,
    salt,
    costFactor,
    blockSizeFactor,
    parallelizationFactor,
    nacl.secretbox.keyLength // 32
  )
})

/**
 * @returns A key pair consisting of a public key and a secret key to use for signing and verifying
 * messages, encoded as base64 strings
 */
export const keyPair = () => {
  const keys = nacl.sign.keyPair()
  return {
    publicKey: base64.encode(keys.publicKey),
    secretKey: base64.encode(keys.secretKey),
  }
}

/**
 * @param message The plaintext message to sign
 * @param secretKey The signer's secret key, encoded as a base64 string
 * @returns A signature, encoded as a base64 string
 */
export const sign = (message: string, secretKey: string) =>
  base64.encode(
    nacl.sign.detached(
      utf8.encode(message), //
      base64.decode(secretKey)
    )
  )

/**
 * @param message The plaintext message to verify
 * @param signature The signature provided along with the message, encoded as a base64 string
 * @param publicKey The signer's public key, encoded as a base64 string
 * @returns true if verification succeeds, false otherwise
 */
export const verify = (message: string, signature: string, publicKey: string) =>
  nacl.sign.detached.verify(
    utf8.encode(message),
    base64.decode(signature),
    base64.decode(publicKey)
  )
