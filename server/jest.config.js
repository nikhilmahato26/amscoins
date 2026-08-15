// Workaround for Node 18 + mongodb-memory-server issue with crypto
Object.assign(globalThis, { crypto: require('crypto').webcrypto })

module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
}
