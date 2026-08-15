process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('register then fetch me', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: 'a@b.com', password: 'secret1' })
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
  await request(app).post('/api/auth/register').send({ name: 'A', email: 'l@b.com', password: 'secret1' })
  const res = await request(app).post('/api/auth/login').send({ email: 'l@b.com', password: 'secret1' })
  expect(res.status).toBe(200)
  expect(res.body.token).toBeTruthy()
})
