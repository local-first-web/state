import { Keychain, KeyPair } from './types'
import hypercoreCrypto from 'hypercore-crypto'
import { MSG_INVALID_KEYS } from './constants'

const KEYCHAIN_ID = 'cevitxe/keychain'

// Retrieves the keys for a given discovery key from local storage,
// or generates new ones and stores them.
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

const getKeychain = (): Keychain => {
  const keychain = localStorage.getItem(KEYCHAIN_ID)
  return keychain ? JSON.parse(keychain) : {}
}

const saveKeychain = (keychain: Keychain) => {
  localStorage.setItem(KEYCHAIN_ID, JSON.stringify(keychain))
}

const validateKeys = ({ key, secretKey }: Partial<KeyPair>) =>
  key && secretKey && key.length === 64 && secretKey.length === 128

const keyPair = (): KeyPair => {
  const { publicKey, secretKey } = hypercoreCrypto.keyPair()
  return {
    key: publicKey.toString('hex'),
    secretKey: secretKey.toString('hex'),
  }
}
