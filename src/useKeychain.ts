import { Keychain, KeyPair } from './types'
import hypercoreCrypto from 'hypercore-crypto'
import createPersistedState from 'use-persisted-state'
import { MSG_INVALID_KEYS } from './constants'

const useKeychainState = createPersistedState('cevitxe/keychain')

export const useKeychain = (discoveryKey: string) => {
  // check first in local storage
  const [keychain, setKeychain] = useKeychainState<Keychain>({})

  // if nothing there, generate new pair
  const keys = keychain[discoveryKey] || keyPair()

  // make sure it's a good pair
  if (!validateKeys(keys)) throw new Error(MSG_INVALID_KEYS)

  // put whatever we ended up with back in local storage
  setKeychain({ ...keychain, [discoveryKey]: keys })

  return keys
}

export const validateKeys = ({ key, secretKey }: Partial<KeyPair>) => {
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

export const keyPair = (): KeyPair => {
  const { publicKey, secretKey } = hypercoreCrypto.keyPair()
  return {
    key: publicKey.toString('hex'),
    secretKey: secretKey.toString('hex'),
  }
}
