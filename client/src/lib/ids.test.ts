import { describe, it, expect } from 'vitest'
import { formatInvestId, formatUserId, formatSupportId } from './ids'

describe('formatInvestId', () => {
  it('prefixes with invest-', () => {
    expect(formatInvestId('ABC123')).toBe('invest-ABC123')
  })
  it('handles empty string', () => {
    expect(formatInvestId('')).toBe('invest-')
  })
})

describe('formatUserId', () => {
  it('prefixes with user-', () => {
    expect(formatUserId('U001')).toBe('user-U001')
  })
  it('returns em-dash for null', () => {
    expect(formatUserId(null)).toBe('—')
  })
})

describe('formatSupportId', () => {
  it('prefixes with support-', () => {
    expect(formatSupportId('T99')).toBe('support-T99')
  })
})
