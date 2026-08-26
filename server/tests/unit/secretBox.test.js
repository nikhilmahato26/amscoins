'use strict'

const secretBox = require('../../src/lib/secretBox')

describe('secretBox (reversible password encryption)', () => {
  const prev = process.env.PASSWORD_ENC_KEY

  afterEach(() => {
    if (prev === undefined) delete process.env.PASSWORD_ENC_KEY
    else process.env.PASSWORD_ENC_KEY = prev
  })

  test('seal → open round-trips the plaintext when a key is set', () => {
    process.env.PASSWORD_ENC_KEY = 'test-key-abc'
    const sealed = secretBox.seal('hunter2')
    expect(typeof sealed).toBe('string')
    expect(sealed).not.toContain('hunter2') // ciphertext, not plaintext
    expect(secretBox.open(sealed)).toBe('hunter2')
  })

  test('two seals of the same value differ (random IV) but both open', () => {
    process.env.PASSWORD_ENC_KEY = 'test-key-abc'
    const a = secretBox.seal('samepass')
    const b = secretBox.seal('samepass')
    expect(a).not.toBe(b)
    expect(secretBox.open(a)).toBe('samepass')
    expect(secretBox.open(b)).toBe('samepass')
  })

  test('degrades to no-op when no key is configured', () => {
    delete process.env.PASSWORD_ENC_KEY
    expect(secretBox.isEnabled()).toBe(false)
    expect(secretBox.seal('x')).toBeNull()
    expect(secretBox.open('v1:whatever')).toBeNull()
  })

  test('open returns null for tampered or wrong-key ciphertext', () => {
    process.env.PASSWORD_ENC_KEY = 'key-one'
    const sealed = secretBox.seal('secret')
    process.env.PASSWORD_ENC_KEY = 'key-two' // different key
    expect(secretBox.open(sealed)).toBeNull()
    process.env.PASSWORD_ENC_KEY = 'key-one'
    expect(secretBox.open(sealed.slice(0, -4) + 'AAAA')).toBeNull() // corrupt tail
  })

  test('seal ignores empty/nullish input', () => {
    process.env.PASSWORD_ENC_KEY = 'key-one'
    expect(secretBox.seal('')).toBeNull()
    expect(secretBox.seal(null)).toBeNull()
    expect(secretBox.seal(undefined)).toBeNull()
  })
})
