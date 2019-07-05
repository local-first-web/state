import { Keychain, KeyPair } from './types'
import hypercoreCrypto from 'hypercore-crypto'
import { MSG_INVALID_KEYS } from './constants'

const KEYCHAIN_ID = 'cevitxe/keychain'
// TODO: Should there just be a Keychain class that has these methods?

// Retrieve the keys for a given discovery key
export const getKeys = (documentId: string) => {
  const keychain = getKeychain()
  // use existing keys or generate new pair
  const keys = keychain[documentId] || keyPair()

  // make sure it's a good pair
  if (!validateKeys(keys)) throw new Error(MSG_INVALID_KEYS)

  // put whatever we ended up with back in local storage
  keychain[documentId] = keys
  saveKeychain(keychain)

  return keys
}

// Remove all stored keys
export const clearKeychain = () => {
  localStorage.removeItem(KEYCHAIN_ID)
}

// Remove keys for given discovery key
export const removeKeys = (documentId: string) => {
  const keychain = getKeychain()
  delete keychain[documentId]
  saveKeychain(keychain)
}

const getKeychain = (): Keychain => {
  const _storedKeychain = localStorage.getItem(KEYCHAIN_ID)
  return _storedKeychain ? JSON.parse(_storedKeychain) : {}
}

const saveKeychain = (keychain: Keychain) => {
  localStorage.setItem(KEYCHAIN_ID, JSON.stringify(keychain))
}

const validateKeys = ({ key, secretKey }: Partial<KeyPair>) => {
  if (!key || !secretKey || key.length !== 64 || secretKey.length !== 128) return false
  // TODO: Figure out why Jest is choking on BigInt
  // try {
  //   // confirm that they're valid hex numbers
  //   BigInt(`0x${key}`)
  //   BigInt(`0x${secretKey}`)
  // } catch (e) {
  //   return false
  // }
  return true
}

const keyPair = (): KeyPair => {
  const { publicKey, secretKey } = hypercoreCrypto.keyPair()
  return {
    key: publicKey.toString('hex'),
    secretKey: secretKey.toString('hex'),
  }
}
