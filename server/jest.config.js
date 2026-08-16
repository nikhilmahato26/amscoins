// Node 18 has no global `crypto`, which mongodb-memory-server needs; polyfill
// it there. On Node 20+ `globalThis.crypto` already exists as a read-only
// getter, so only assign when it's missing (assigning would throw).
if (!globalThis.crypto) {
  Object.assign(globalThis, { crypto: require('crypto').webcrypto })
}

module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
}
