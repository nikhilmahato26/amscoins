const mongoose = require('mongoose')
const env = require('./env')

async function connectDb(uri = env.MONGO_URI) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  return mongoose.connection
}

async function disconnectDb() {
  await mongoose.disconnect()
}

module.exports = { connectDb, disconnectDb }
