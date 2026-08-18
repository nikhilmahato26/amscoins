process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { periodStart } = require('../../src/services/leaderboardService')

// IST is UTC+5:30. periodStart returns the UTC instant of the IST
// day/month/year boundary. 2026-08-15T18:00:00Z == 2026-08-15 23:30 IST.
const NOW = new Date('2026-08-15T18:00:00Z')

test('daily start = IST midnight of the current IST day (in UTC)', () => {
  expect(periodStart('daily', NOW).toISOString()).toBe('2026-08-14T18:30:00.000Z')
})

test('monthly start = IST 1st of the month', () => {
  expect(periodStart('monthly', NOW).toISOString()).toBe('2026-07-31T18:30:00.000Z')
})

test('weekly start = IST Monday of the current week', () => {
  // 2026-08-15 IST is a Saturday → week began Monday 2026-08-10 IST.
  expect(periodStart('weekly', NOW).toISOString()).toBe('2026-08-09T18:30:00.000Z')
})

test('instant just after IST midnight but before UTC midnight rolls to the correct IST day', () => {
  // 2026-08-15T20:00:00Z == 2026-08-16 01:30 IST -> IST day is the 16th
  const late = new Date('2026-08-15T20:00:00Z')
  expect(periodStart('daily', late).toISOString()).toBe('2026-08-15T18:30:00.000Z')
})
