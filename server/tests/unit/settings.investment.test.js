const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Settings = require('../../src/models/Settings')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('singleton has investment-lifecycle defaults', async () => {
  const s = await Settings.getSingleton()
  expect(s.cycleDurationHours).toBe(24)
  expect(s.autoRejectHours).toBe(8)
})

test('toPublic exposes the new fields', async () => {
  const s = await Settings.getSingleton()
  s.cycleDurationHours = 36
  s.autoRejectHours = 6
  await s.save()
  const pub = s.toPublic()
  expect(pub.cycleDurationHours).toBe(36)
  expect(pub.autoRejectHours).toBe(6)
})
