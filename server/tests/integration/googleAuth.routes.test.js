process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
process.env.GOOGLE_CLIENT_ID = 'dummy-id'
process.env.GOOGLE_CLIENT_SECRET = 'dummy-secret'
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/auth/google/callback'
process.env.FRONTEND_URL = 'http://localhost:5173'

const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('GET /api/auth/google redirects to Google consent', async () => {
  const res = await request(app).get('/api/auth/google')
  expect(res.status).toBe(302)
  expect(res.headers.location).toMatch(/accounts\.google\.com/)
})
