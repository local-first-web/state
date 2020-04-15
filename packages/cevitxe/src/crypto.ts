import { subtle as crypto, getRandomValues } from 'isomorphic-webcrypto'
import { encode, decode } from 'isomorphic-textencoder'

const JWK = 'jwk'
const AES_GCM = 'AES-GCM'
const AES_GCM_256 = { name: AES_GCM, length: 256 }
const PBKDF2 = 'PBKDF2'
const PBKDF2_256 = { name: PBKDF2, length: 256 }
const ENCRYPT_DECRYPT = ['encrypt', 'decrypt']
const BITS_KEY = ['deriveBits', 'deriveKey']
const SHA256 = 'SHA-256'

export const generateKey = () => crypto.generateKey(AES_GCM_256, true, ENCRYPT_DECRYPT)

export const exportKey = (key: CryptoKey) => crypto.exportKey(JWK, key)

export const importKey = (jwk: JsonWebKey) =>
  crypto.importKey(JWK, jwk, AES_GCM_256, true, ENCRYPT_DECRYPT)

export const encrypt = async (plaintext: string, key: CryptoKey): Promise<Cipher> => {
  const iv = getRandomValues(new Uint8Array(12))
  const algo = { name: AES_GCM, iv }
  const encryptedBytes = await crypto.encrypt(algo, key, encode(plaintext))
  const encrypted = decode(encryptedBytes)
  console.log({ encrypted })
  return { encrypted, iv }
}

export const decrypt = async ({ encrypted, iv }: Cipher, key: CryptoKey): Promise<string> => {
  console.log({ encrypted, iv, key })
  const algo = { name: AES_GCM, iv }
  const decrypted = await crypto.decrypt(algo, key, encode(encrypted))
  return decrypted.toString()
}

export const deriveKey = async (password: string) => {
  const passphrase = encode(password.repeat(12 - password.length))
  const key = await crypto.importKey('raw', passphrase, PBKDF2_256, false, BITS_KEY)
  const saltText = await sha256('285a' + password + 'a9e2f694' + password.length)
  const salt = encode(saltText)
  const iterations = 100000 + password.length
  const algo = { name: PBKDF2, salt, iterations, hash: SHA256 }

  return crypto.deriveKey(algo, key, AES_GCM_256, true, ENCRYPT_DECRYPT)
}

export const sha256 = async (str: string) => {
  const encoded = encode(str)
  const digest = await crypto.digest(SHA256, encoded)
  return hashBufferToHex(digest)
}

const hashBufferToHex = (hashBuffer: ArrayBuffer) =>
  Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

type Cipher = {
  encrypted: string
  iv: Uint8Array
}
