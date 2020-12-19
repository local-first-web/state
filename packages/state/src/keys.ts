// ignore file coverage

import { Keychain } from 'types'

const keychainId = (databaseName: string) => `@localfirst/state/${databaseName}/keychain`

// Retrieves the keys for a given discovery key from local storage,
// or generates new ones and stores them.
export const getKeys = (databaseName: string, discoveryKey: string) => {
  const keychain = getKeychain(databaseName)
  // use existing keys or generate new pair
  const keys = keychain[discoveryKey] || {} // keyPair()

  // put whatever we ended up with back in local storage
  keychain[discoveryKey] = keys
  saveKeychain(databaseName, keychain)

  return keys
}

// Return all the discoveryKeys we know
export const getKnownDiscoveryKeys = (databaseName: string) => {
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
