import memoize from 'fast-memoize'
import { secretbox, randomBytes } from 'tweetnacl'
import * as utf8 from '@stablelib/utf8'
import * as base64 from '@stablelib/base64'
import scrypt from 'scryptsy'

export const encrypt = (plaintext: string, password: string) => {
  const key = deriveKey(password)
  const keyUint8Array = base64.decode(key)

  const nonce = randomBytes(secretbox.nonceLength)
  const message = utf8.encode(plaintext)
  const box = secretbox(message, nonce, keyUint8Array)

  const fullMessage = new Uint8Array(nonce.length + box.length)
  fullMessage.set(nonce)
  fullMessage.set(box, nonce.length)

  return base64.encode(fullMessage)
}

export const decrypt = (cipher: string, password: string) => {
  const key = deriveKey(password)
  const keyUint8Array = base64.decode(key)

  const cipherbytes = base64.decode(cipher)
  const nonce = cipherbytes.slice(0, secretbox.nonceLength)
  const message = cipherbytes.slice(secretbox.nonceLength, cipher.length)

  const decrypted = secretbox.open(message, nonce, keyUint8Array)

  if (!decrypted) throw new Error('Could not decrypt message')

  return utf8.decode(decrypted)
}

const deriveKey = memoize((password: string) => {
  const salt = 'Sõdìüm ÇhLôrɩdé'
  const blockSizeFactor = 8
  const costFactor = 2 ** 11 // <100ms execution time on my box
  const parallelizationFactor = 1
  const key = scrypt(
    password,
    salt,
    costFactor,
    blockSizeFactor,
    parallelizationFactor,
    secretbox.keyLength
  )
  return base64.encode(key)
})
