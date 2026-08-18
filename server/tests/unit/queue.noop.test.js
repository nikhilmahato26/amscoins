// In NODE_ENV=test the queue helpers must be safe no-ops (no Redis in CI).
const queue = require('../../src/config/queue')

test('queue helpers are callable no-ops in test env', async () => {
  await expect(queue.scheduleAutoReject({ _id: 'x', createdAt: new Date() })).resolves.toBeUndefined()
  await expect(queue.scheduleMature({ _id: 'x', maturesAt: new Date() })).resolves.toBeUndefined()
  await expect(queue.cancelAutoReject('x')).resolves.toBeUndefined()
  expect(queue.investmentQueue).toBeNull()
})
