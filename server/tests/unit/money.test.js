const { computeTds, rupeesToPaise } = require('../../src/services/money')
const { tierForCount, canAccessPlan } = require('../../src/services/tierService')

test('tds is 5% of 100000 paise', () => {
  expect(computeTds(100000, 5)).toEqual({ tds: 5000, net: 95000 })
})

test('rupeesToPaise', () => {
  expect(rupeesToPaise(1000)).toBe(100000)
})

test('tier boundaries follow spec (0-10 silver, 11-20 gold, 21+ diamond)', () => {
  expect(tierForCount(0)).toBe('silver')
  expect(tierForCount(10)).toBe('silver')
  expect(tierForCount(11)).toBe('gold')
  expect(tierForCount(20)).toBe('gold')
  expect(tierForCount(21)).toBe('diamond')
})

test('plan access gating', () => {
  expect(canAccessPlan('silver', 'gold')).toBe(false)
  expect(canAccessPlan('silver', 'silver')).toBe(true)
  expect(canAccessPlan('gold', 'silver')).toBe(true)
  expect(canAccessPlan('diamond', 'gold')).toBe(true)
})
