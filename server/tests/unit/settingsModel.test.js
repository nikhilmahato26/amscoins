'use strict'

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Settings = require('../../src/models/Settings')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

describe('Settings model', () => {
  test('getSingleton creates one document and reuses it', async () => {
    const a = await Settings.getSingleton()
    const b = await Settings.getSingleton()
    expect(a._id.toString()).toBe(b._id.toString())
    expect(await Settings.countDocuments()).toBe(1)
  })

  test('defaults are sensible', async () => {
    const s = await Settings.getSingleton()
    expect(s.inrThresholdPaise).toBe(200000)
    expect(s.methods.usdtCrypto).toBe(true)
    expect(s.methods.inrQr).toBe(true)
  })

  test('toPublic returns the public shape with all keys', async () => {
    const s = await Settings.getSingleton()
    const pub = s.toPublic()
    expect(Object.keys(pub).sort()).toEqual(
      [
        'inrQrUrl', 'inrThresholdPaise', 'methods',
        'telegramUsername', 'usdtBep20Address', 'usdtBep20QrUrl',
        'usdtTrc20Address', 'usdtTrc20QrUrl', 'whatsappNumber',
      ].sort()
    )
    expect(pub.methods).toEqual({
      usdtCrypto: true, whatsapp: true, telegram: true, inrQr: true,
    })
  })
})
