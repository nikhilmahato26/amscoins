import { describe, it, expect } from 'vitest'

// Status machine logic — withdrawal transitions are:
// pending → processing → completed
// pending → processing → failed
// failed → pending (retry resets)
// pending → rejected

type WdStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'

function canTransition(from: WdStatus, to: WdStatus): boolean {
  const allowed: Record<WdStatus, WdStatus[]> = {
    pending: ['processing', 'rejected'],
    processing: ['completed', 'failed'],
    completed: [],
    failed: ['pending'],
    rejected: [],
  }
  return allowed[from].includes(to)
}

describe('Withdrawal status machine', () => {
  it('pending → processing allowed', () => {
    expect(canTransition('pending', 'processing')).toBe(true)
  })
  it('pending → completed NOT allowed', () => {
    expect(canTransition('pending', 'completed')).toBe(false)
  })
  it('processing → completed allowed', () => {
    expect(canTransition('processing', 'completed')).toBe(true)
  })
  it('processing → failed allowed', () => {
    expect(canTransition('processing', 'failed')).toBe(true)
  })
  it('failed → pending allowed (retry)', () => {
    expect(canTransition('failed', 'pending')).toBe(true)
  })
  it('completed → any NOT allowed', () => {
    expect(canTransition('completed', 'pending')).toBe(false)
    expect(canTransition('completed', 'failed')).toBe(false)
    expect(canTransition('completed', 'rejected')).toBe(false)
  })
})
