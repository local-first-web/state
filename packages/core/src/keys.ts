import { Keychain, KeyPair } from './types'
import hypercoreCrypto from 'hypercore-crypto'
import { MSG_INVALID_KEYS } from './constants'

const keychainId = (databaseName: string) => `cevitxe/${databaseName}/keychain`

// Retrieves the keys for a given discovery key from local storage,
// or generates new ones and stores them.
export const getKeys = (databaseName: string, discoveryKey: string) => {
  const keychain = getKeychain(databaseName)
  // use existing keys or generate new pair
  const keys = keychain[discoveryKey] || keyPair()

  // make sure it's a good pair
  if (!validateKeys(keys)) throw new Error(MSG_INVALID_KEYS)

  // put whatever we ended up with back in local storage
  keychain[discoveryKey] = keys
  saveKeychain(databaseName, keychain)

  return keys
}

// Return all the discoveryKeys we know
export const getKnowndiscoveryKeys = (databaseName: string) => {
  const keychain = getKeychain(databaseName)
  return Object.keys(keychain)
}

const getKeychain = (databaseName: string): Keychain => {
  const keychain = localStorage.getItem(keychainId(databaseName))
  return keychain ? JSON.parse(keychain) : {}
}

const saveKeychain = (databaseName: string, keychain: Keychain) => {
  localStorage.setItem(keychainId(databaseName), JSON.stringify(keychain))
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
