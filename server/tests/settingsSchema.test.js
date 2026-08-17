'use strict'

const { updateSettingsSchema } = require('../src/validation/schemas')

describe('updateSettingsSchema', () => {
  test('normalizes whatsapp digits and telegram @', () => {
    const parsed = updateSettingsSchema.parse({
      whatsappNumber: '+91 98765-43210',
      telegramUsername: '@iamhim_bss',
    })
    expect(parsed.whatsappNumber).toBe('919876543210')
    expect(parsed.telegramUsername).toBe('iamhim_bss')
  })

  test('rejects a negative threshold', () => {
    expect(() => updateSettingsSchema.parse({ inrThresholdPaise: -5 })).toThrow()
  })

  test('accepts a partial methods object', () => {
    const parsed = updateSettingsSchema.parse({ methods: { inrQr: false } })
    expect(parsed.methods.inrQr).toBe(false)
  })

  test('rejects an empty body', () => {
    expect(() => updateSettingsSchema.parse({})).toThrow()
  })
})
