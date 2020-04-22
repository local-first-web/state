import * as base64 from '@stablelib/base64'
import * as utf8 from '@stablelib/utf8'
import memoize from 'fast-memoize'
import scrypt from 'scryptsy'
import nacl from 'tweetnacl'

// These are straightforward implementations of NaCl crypto functions, accepting and returning
// base64 strings rather than byte arrays. The symmetric `encrypt` and `decrypt` functions can take
// passwords instead of 32-byte keys; the password is expanded using the
// [scrypt](https://en.wikipedia.org/wiki/Scrypt) algorithm.

export const symmetric = {
  /**
   * Symmetrically encrypts a string of text.
   * @param plaintext The plaintext to encrypt
   * @param password The password to use as a seed for an encryption key
   * @returns The encrypted data, encoded as a base64 string. The first 24 characters are the nonce;
   * the rest of the string is the encrypted message.
   * @see symmetric.decrypt
   */
  encrypt: (plaintext: string, password: string) => {
    const key = deriveKey(password)

    const nonce = newNonce()
    const message = utf8.encode(plaintext)
    const box = nacl.secretbox(message, nonce, key)

    const cipherBytes = new Uint8Array(nonceLength + box.length)
    // the first 24 characters are the nonce
    cipherBytes.set(nonce)
    // the rest is the message
    cipherBytes.set(box, nonceLength)

    return base64.encode(cipherBytes)
  },

  /**
   * Symmetrically decrypts a message encrypted by `symmetric.encrypt`.
   * @param cipher The encrypted data, encoded as a base64 string (the first 24 characters are the nonce;
   * the rest of the string is the encrypted message)
   * @param password The password used as a seed for an encryption key
   * @returns The original plaintext
   * @see symmetric.encrypt
   */
  decrypt: (cipher: string, password: string) => {
    const key = deriveKey(password)
    const cipherBytes = base64.decode(cipher)

    // the first 24 characters are the nonce
    const nonce = cipherBytes.slice(0, nonceLength)
    // the rest is the message
    const message = cipherBytes.slice(nonceLength, cipher.length)

    const decrypted = nacl.secretbox.open(message, nonce, key)
    if (!decrypted) throw new Error('Could not decrypt message')

    return utf8.decode(decrypted)
  },
}

export const asymmetric = {
  /**
   * @returns A key pair consisting of a public key and a secret key, encoded as base64 strings, to
   * use for asymmetric encryption and decryption. (Note that asymmetric encryption keys cannot be
   * used for signatures, and vice versa.)
   */
  keyPair: () => {
    const keys = nacl.box.keyPair()
    return {
      publicKey: base64.encode(keys.publicKey),
      secretKey: base64.encode(keys.secretKey),
    }
  },

  /**
   * Asymmetrically encrypts a string of text.
   * @param plaintext The plaintext to encrypt
   * @param recipientPublicKey The public key of the intended recipient
   * @param senderSecretKey The secret key of the sender
   * @returns The encrypted data, encoded as a base64 string. The first 24 characters are the nonce;
   * the rest of the string is the encrypted message.
   * @see asymmetric.decrypt
   */
  encrypt: (plaintext: string, recipientPublicKey: string, senderSecretKey: string) => {
    const nonce = newNonce()
    const messageBytes = utf8.encode(plaintext)
    const encrypted = nacl.box(
      messageBytes,
      nonce,
      base64.decode(recipientPublicKey),
      base64.decode(senderSecretKey)
    )

    const cipherBytes = new Uint8Array(nonceLength + encrypted.length)
    // the first 24 characters are the nonce
    cipherBytes.set(nonce)
    // the rest is the message
    cipherBytes.set(encrypted, nonceLength)

    return base64.encode(cipherBytes)
  },

  /**
   * Asymmetrically decrypts a message encrypted by `asymmetric.encrypt`.
   * @param cipher The encrypted data, encoded as a base64 string (the first 24 characters are the nonce;
   * the rest of the string is the encrypted message)
   * @param senderPublicKey The public key of the sender
   * @param recipientSecretKey The secret key of the recipient
   * @returns The original plaintext
   * @see asymmetric.encrypt
   */
  decrypt: (cipher: string, senderPublicKey: string, recipientSecretKey: string) => {
    const cipherBytes = base64.decode(cipher)

    // the first 24 characters are the nonce
    const nonce = cipherBytes.slice(0, nonceLength)
    // the rest is the message
    const message = cipherBytes.slice(nonceLength, cipher.length)

    const decrypted = nacl.box.open(
      message,
      nonce,
      base64.decode(senderPublicKey),
      base64.decode(recipientSecretKey)
    )

    if (!decrypted) throw new Error('Could not decrypt message')

    return utf8.decode(decrypted)
  },
}

export const signatures = {
  /**
   * @returns A key pair consisting of a public key and a secret key, encoded as base64 strings, to
   * use for signing and verifying messages. (Note that signature keys cannot be used for asymmetric
   * encryption, and vice versa.)
   */
  keyPair: () => {
    const keys = nacl.sign.keyPair()
    return {
      publicKey: base64.encode(keys.publicKey),
      secretKey: base64.encode(keys.secretKey),
    }
  },

  /**
   * @param message The plaintext message to sign
   * @param secretKey The signer's secret key, encoded as a base64 string
   * @returns A signature, encoded as a base64 string
   */
  sign: (message: string, secretKey: string) =>
    base64.encode(
      nacl.sign.detached(
        utf8.encode(message), //
        base64.decode(secretKey)
      )
    ),

  /**
   * @param content The plaintext message to be verified
   * @param signature The signature provided along with the message, encoded as a base64 string
   * @param publicKey The signer's public key, encoded as a base64 string
   * @returns true if verification succeeds, false otherwise
   */
  verify: ({ content, signature, publicKey }: SignedMessage) =>
    nacl.sign.detached.verify(
      utf8.encode(content),
      base64.decode(signature),
      base64.decode(publicKey)
    ),
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
    nacl.secretbox.keyLength // = 32
  )
})

const nonceLength = nacl.box.nonceLength // = 24
const newNonce = () => nacl.randomBytes(nonceLength)

export type SignedMessage = {
  content: string
  signature: string
  publicKey: string
}
