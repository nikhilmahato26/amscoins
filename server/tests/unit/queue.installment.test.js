'use strict'

// Task 5: installment job scheduling helpers (queue.js) — no-op in test env
const queue = require('../../src/config/queue')

test('scheduleInstallment is a callable no-op in test env', async () => {
  const inv = {
    _id: 'inv123',
    installments: [
      { day: 1, maturesAt: new Date(Date.now() + 86400e3), status: 'scheduled' },
      { day: 2, maturesAt: new Date(Date.now() + 2 * 86400e3), status: 'scheduled' },
      { day: 3, maturesAt: new Date(Date.now() + 3 * 86400e3), status: 'scheduled' },
    ],
  }
  await expect(queue.scheduleInstallment(inv, 1)).resolves.toBeUndefined()
  await expect(queue.scheduleInstallment(inv, 2)).resolves.toBeUndefined()
  await expect(queue.scheduleInstallment(inv, 3)).resolves.toBeUndefined()
})

test('cancelInstallments is a callable no-op in test env', async () => {
  await expect(queue.cancelInstallments('inv123')).resolves.toBeUndefined()
})

test('installmentJobId returns expected format', () => {
  expect(queue.installmentJobId('abc', 1)).toBe('installment-abc-day-1')
  expect(queue.installmentJobId('xyz', 3)).toBe('installment-xyz-day-3')
})

test('installmentJobId is exported from queue', () => {
  expect(typeof queue.installmentJobId).toBe('function')
})

test('cancelInstallments is exported from queue', () => {
  expect(typeof queue.cancelInstallments).toBe('function')
})

test('scheduleInstallment with no matching day is a no-op', async () => {
  const inv = {
    _id: 'inv999',
    installments: [
      { day: 1, maturesAt: new Date(Date.now() + 86400e3), status: 'scheduled' },
    ],
  }
  // day 5 doesn't exist — should not throw
  await expect(queue.scheduleInstallment(inv, 5)).resolves.toBeUndefined()
})
