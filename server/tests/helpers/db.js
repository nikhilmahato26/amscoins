const { MongoMemoryReplSet } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongod

async function setupDb() {
  // A single-node replica set so MongoDB transactions (used by wallet /
  // referral / withdrawal services) are available in tests.
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(mongod.getUri())
}

async function clearDb() {
  for (const c of Object.values(mongoose.connection.collections)) {
    await c.deleteMany({})
  }
}

async function teardownDb() {
  await mongoose.disconnect()
  if (mongod) await mongod.stop()
}

module.exports = { setupDb, clearDb, teardownDb }
