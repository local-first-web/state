import { secretbox, randomBytes } from 'tweetnacl'
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util'
import scrypt from 'scryptsy'

export const encrypt = (plaintext: string, password: string) => {
  const key = deriveKey(password)
  const keyUint8Array = decodeBase64(key)

  const nonce = randomBytes(secretbox.nonceLength)
  const message = decodeUTF8(plaintext)
  const box = secretbox(message, nonce, keyUint8Array)

  const fullMessage = new Uint8Array(nonce.length + box.length)
  fullMessage.set(nonce)
  fullMessage.set(box, nonce.length)

  return encodeBase64(fullMessage)
}

export const decrypt = (cipher: string, password: string) => {
  const key = deriveKey(password)
  const keyUint8Array = decodeBase64(key)

  const cipherbytes = decodeBase64(cipher)
  const nonce = cipherbytes.slice(0, secretbox.nonceLength)
  const message = cipherbytes.slice(secretbox.nonceLength, cipher.length)

  const decrypted = secretbox.open(message, nonce, keyUint8Array)

  if (!decrypted) throw new Error('Could not decrypt message')

  return encodeUTF8(decrypted)
}

function deriveKey(password: string) {
  const salt = 'Sõdìüm ÇhLôrɩdé'
  const key = scrypt(password, salt, 16384, 8, 1, secretbox.keyLength)
  return encodeBase64(key)
}
