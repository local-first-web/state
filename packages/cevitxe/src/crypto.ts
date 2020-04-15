import { subtle as crypto, getRandomValues } from 'isomorphic-webcrypto'
import { encode } from 'isomorphic-textencoder'

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

export const importKey = (jwk: JsonWebKey) => {
  const extractable = true
  return crypto.importKey(JWK, jwk, AES_GCM_256, extractable, ENCRYPT_DECRYPT)
}

export const encrypt = async (plaintext: string, key: CryptoKey): Promise<Cipher> => {
  const encoded = encode(plaintext)
  const iv = getRandomValues(new Uint8Array(12))
  const algorithm = { name: AES_GCM, iv }
  const encryptedBytes = await crypto.encrypt(algorithm, key, encoded)
  const cyphertext = encryptedBytes.toString()
  return { cyphertext, iv }
}

export const decrypt = async ({ cyphertext, iv }: Cipher, key: CryptoKey): Promise<string> => {
  const encoded = encode(cyphertext)
  const algorithm = { name: AES_GCM, iv }
  const decrypted = await crypto.decrypt(algorithm, key, encoded)
  return decrypted.toString()
}

export const deriveKey = async (password: string) => {
  const passphrase = encode(password.repeat(12 - password.length))
  const key = await crypto.importKey('raw', passphrase, PBKDF2_256, false, BITS_KEY)
  const saltText = await sha256('285a' + password + 'a9e2f694' + password.length)
  const salt = encode(saltText)
  const hash = SHA256
  const iterations = 100000 + password.length
  const algorithm = { name: PBKDF2, salt, iterations, hash }

  return crypto.deriveKey(algorithm, key, AES_GCM_256, true, ENCRYPT_DECRYPT)
}

export const sha256 = async (str: string) => {
  const encoded = encode(str)
  const digest = await crypto.digest(SHA256, encoded)
  console.log({ digest })
  return Array.from(new Uint8Array(digest))
    .map(b => ('00' + b.toString(16)).slice(-2))
    .join('')
}

type Cipher = {
  cyphertext: string
  iv: Uint8Array
}
