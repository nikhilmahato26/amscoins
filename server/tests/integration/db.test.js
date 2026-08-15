process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const mongoose = require('mongoose')
const { setupDb, teardownDb } = require('../helpers/db')

beforeAll(setupDb)
afterAll(teardownDb)

test('in-memory mongo connects', () => {
  expect(mongoose.connection.readyState).toBe(1)
})
