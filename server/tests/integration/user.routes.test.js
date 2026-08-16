process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function registerUser(email = 'u@b.com') {
  const reg = await request(app).post('/api/auth/register').send({ name: 'U', email, password: 'secret1' })
  return { token: reg.body.token, user: reg.body.user }
}

test('registration assigns a friendly ASM- public id', async () => {
  const { user } = await registerUser()
  expect(user.publicId).toMatch(/^ASM-[A-Z0-9]{6}$/)
})

test('PATCH /api/users/me updates name and phone', async () => {
  const { token } = await registerUser()
  const res = await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'New Name', phone: '+91 98765 43210' })
  expect(res.status).toBe(200)
  expect(res.body.user.name).toBe('New Name')
  expect(res.body.user.phone).toBe('+91 98765 43210')
})

test('PATCH /api/users/me rejects an invalid phone', async () => {
  const { token } = await registerUser()
  const res = await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ phone: 'not-a-phone!!' })
  expect(res.status).toBe(400)
})

test('PATCH /api/users/me without a token is 401', async () => {
  const res = await request(app).patch('/api/users/me').send({ name: 'X' })
  expect(res.status).toBe(401)
})

test('POST /api/users/me/avatar without a file is 400', async () => {
  const { token } = await registerUser()
  const res = await request(app).post('/api/users/me/avatar').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(400)
})

test('add UPI then bank payout method; first is default', async () => {
  const { token } = await registerUser()
  const auth = { Authorization: `Bearer ${token}` }

  const upi = await request(app)
    .post('/api/users/me/payout-methods')
    .set(auth)
    .send({ type: 'upi', upiId: 'me@okicici' })
  expect(upi.status).toBe(201)
  expect(upi.body.user.payoutMethods).toHaveLength(1)
  expect(upi.body.user.payoutMethods[0].isDefault).toBe(true)

  const bank = await request(app)
    .post('/api/users/me/payout-methods')
    .set(auth)
    .send({ type: 'bank', accountName: 'Me', accountNumber: '123456789', ifsc: 'HDFC0001234' })
  expect(bank.status).toBe(201)
  expect(bank.body.user.payoutMethods).toHaveLength(2)
  // First method stays default until explicitly changed.
  const bankMethod = bank.body.user.payoutMethods.find((m) => m.type === 'bank')
  expect(bankMethod.isDefault).toBe(false)

  const setDefault = await request(app)
    .patch(`/api/users/me/payout-methods/${bankMethod.id}/default`)
    .set(auth)
  expect(setDefault.status).toBe(200)
  expect(setDefault.body.user.payoutMethods.find((m) => m.type === 'bank').isDefault).toBe(true)
  expect(setDefault.body.user.payoutMethods.find((m) => m.type === 'upi').isDefault).toBe(false)
})

test('reject a bank payout method with an invalid IFSC', async () => {
  const { token } = await registerUser()
  const res = await request(app)
    .post('/api/users/me/payout-methods')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'bank', accountName: 'Me', accountNumber: '123456789', ifsc: 'BAD' })
  expect(res.status).toBe(400)
})

test('reject a UPI payout method missing the upiId', async () => {
  const { token } = await registerUser()
  const res = await request(app)
    .post('/api/users/me/payout-methods')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'upi' })
  expect(res.status).toBe(400)
})

test('delete a payout method reassigns the default', async () => {
  const { token } = await registerUser()
  const auth = { Authorization: `Bearer ${token}` }
  await request(app).post('/api/users/me/payout-methods').set(auth).send({ type: 'upi', upiId: 'a@okicici' })
  const second = await request(app)
    .post('/api/users/me/payout-methods')
    .set(auth)
    .send({ type: 'upi', upiId: 'b@okicici' })
  const firstId = second.body.user.payoutMethods.find((m) => m.upiId === 'a@okicici').id

  const del = await request(app).delete(`/api/users/me/payout-methods/${firstId}`).set(auth)
  expect(del.status).toBe(200)
  expect(del.body.user.payoutMethods).toHaveLength(1)
  expect(del.body.user.payoutMethods[0].isDefault).toBe(true)
})
