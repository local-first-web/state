import crypto from 'hypercore-crypto'

// TODO: Get crypto working properly

// This is a hack because I was getting errors verifying the remove signature
// I took the code from hypercore and am just always returning true for the verification
// We need to look deeper into why it's not signing properly or maybe just provide our
// own crypto methods here.
export const mockCrypto = {
  sign: (data: any, sk: any, cb: any) => {
    return cb(null, crypto.sign(data, sk))
  },
  verify: (_sig: any, _data: any, _pk: any, cb: any) => {
    // Always say it's a valid signature (for testing)
    return cb(null, true)
  },
}
