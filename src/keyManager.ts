import crypto from 'hypercore-crypto'

export const generateKeys = () => crypto.keyPair()

export const validateKeys = (key?: string, secretKey?: string) => {
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
