'use strict'

/**
 * Reversible authenticated encryption for low-volume secrets we must be able to
 * read back (currently: a user's login password, so an admin can cross-check
 * wallet access — a deliberate product decision, see the admin user view).
 *
 * AES-256-GCM with a random 96-bit IV per message. The 32-byte key is derived
 * from PASSWORD_ENC_KEY via SHA-256, so any passphrase length works. When the
 * env key is absent the box degrades to a no-op (seal/open return null) so the
 * app still runs — the password field simply stays blank.
 *
 * Wire format (base64):  v1:<base64( iv(12) | tag(16) | ciphertext )>
 */

const crypto = require('crypto')

const PREFIX = 'v1:'

// Derived at call time (not module load) so the key can be configured/toggled
// at runtime and in tests without a module reload.
function key() {
  const raw = process.env.PASSWORD_ENC_KEY || ''
  return raw ? crypto.createHash('sha256').update(raw).digest() : null
}

function isEnabled() {
  return key() != null
}

function seal(plaintext) {
  const KEY = key()
  if (!KEY || plaintext == null || plaintext === '') return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
}

function open(sealed) {
  const KEY = key()
  if (!KEY || !sealed || typeof sealed !== 'string' || !sealed.startsWith(PREFIX)) return null
  try {
    const buf = Buffer.from(sealed.slice(PREFIX.length), 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return null // tampered, wrong key, or corrupt — never throw at the call site
  }
}

module.exports = { seal, open, isEnabled }
