export const validateKeys = (key?: string, secretKey?: string) => {
  if (!key || !secretKey || key.length !== 64 || secretKey.length !== 128) return false
  try {
    // confirm that they're valid hex numbers
    BigInt(`0x${key}`)
    BigInt(`0x${secretKey}`)
  } catch (e) {
    return false
  }
  return true
}
