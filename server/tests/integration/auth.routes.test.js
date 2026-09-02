process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
// This suite exercises the un-configured Google path. dotenv does not override
// keys already present in process.env, so setting these empty before app load
// keeps isGoogleConfigured false even when a local .env carries real creds.
process.env.GOOGLE_CLIENT_ID = ''
process.env.GOOGLE_CLIENT_SECRET = ''
process.env.GOOGLE_CALLBACK_URL = ''
const request = require('supertest')
const jwt = require('jsonwebtoken')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('register then fetch me', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: 'a@b.com', password: 'secret12' })
  expect(reg.status).toBe(201)
  expect(reg.body.token).toBeTruthy()
  expect(reg.body.user.referralCode).toHaveLength(6)
  expect(reg.body.user.passwordHash).toBeUndefined()

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`)
  expect(me.status).toBe(200)
  expect(me.body.user.email).toBe('a@b.com')
})

test('me without token is 401', async () => {
  const res = await request(app).get('/api/auth/me')
  expect(res.status).toBe(401)
})

test('register with invalid body is 400', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'x' })
  expect(res.status).toBe(400)
})

test('login works after register', async () => {
  await request(app).post('/api/auth/register').send({ name: 'A', email: 'l@b.com', password: 'secret12' })
  const res = await request(app).post('/api/auth/login').send({ email: 'l@b.com', password: 'secret12' })
  expect(res.status).toBe(200)
  expect(res.body.token).toBeTruthy()
})

test('pwreset token rejected as session token (401)', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'P', email: 'p@b.com', password: 'secret12' })
  const pwresetToken = jwt.sign(
    { id: reg.body.user._id, purpose: 'pwreset' },
    process.env.JWT_SECRET
  )
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${pwresetToken}`)
  expect(res.status).toBe(401)
})

test('GET /api/auth/google returns 503 when Google is not configured', async () => {
  const res = await request(app).get('/api/auth/google')
  expect(res.status).toBe(503)
})
