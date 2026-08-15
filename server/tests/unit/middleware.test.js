const { z } = require('zod')
const asyncHandler = require('../../src/middleware/asyncHandler')
const validate = require('../../src/middleware/validate')

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

test('asyncHandler forwards rejected promise to next', async () => {
  const err = new Error('boom')
  const next = jest.fn()
  await asyncHandler(async () => { throw err })({}, mockRes(), next)
  expect(next).toHaveBeenCalledWith(err)
})

test('validate rejects bad body with 400', () => {
  const req = { body: {} }
  const res = mockRes()
  const next = jest.fn()
  validate(z.object({ email: z.string().email() }))(req, res, next)
  expect(res.statusCode).toBe(400)
  expect(next).not.toHaveBeenCalled()
})

test('validate passes good body and replaces req.body with parsed data', () => {
  const req = { body: { email: 'a@b.com', extra: 'stripped' } }
  const res = mockRes()
  const next = jest.fn()
  validate(z.object({ email: z.string().email() }))(req, res, next)
  expect(next).toHaveBeenCalled()
  expect(req.body).toEqual({ email: 'a@b.com' })
})
