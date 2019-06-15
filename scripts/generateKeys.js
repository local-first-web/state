const crypto = require('hypercore-crypto')

const { publicKey, secretKey } = crypto.keyPair()

const output = {
  publicKey: publicKey.toString('hex'),
  secretKey: secretKey.toString('hex'),
}

console.log(JSON.stringify(output))
