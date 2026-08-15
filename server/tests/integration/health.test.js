const request = require('supertest')
process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const app = require('../../src/app')

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})
