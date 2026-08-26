const { computeTds, rupeesToPaise } = require('../../src/services/money')
const { tierForCount, canAccessPlan, tdsPctForTier } = require('../../src/services/tierService')

test('tds is 5% of 100000 paise', () => {
  expect(computeTds(100000, 5)).toEqual({ tds: 5000, net: 95000 })
})

test('rupeesToPaise', () => {
  expect(rupeesToPaise(1000)).toBe(100000)
})

test('tier boundaries follow spec (0-20 silver, 21-51 gold, 52+ diamond)', () => {
  expect(tierForCount(0)).toBe('silver')
  expect(tierForCount(20)).toBe('silver')
  expect(tierForCount(21)).toBe('gold')
  expect(tierForCount(51)).toBe('gold')
  expect(tierForCount(52)).toBe('diamond')
})

test('per-tier TDS: silver 5%, gold 3%, diamond 0%', () => {
  expect(tdsPctForTier('silver')).toBe(5)
  expect(tdsPctForTier('gold')).toBe(3)
  expect(tdsPctForTier('diamond')).toBe(0)
  expect(tdsPctForTier(undefined)).toBe(5) // unknown tier falls back to silver
})

test('TDS applied to a 100000-paise withdrawal by tier', () => {
  expect(computeTds(100000, tdsPctForTier('silver'))).toEqual({ tds: 5000, net: 95000 })
  expect(computeTds(100000, tdsPctForTier('gold'))).toEqual({ tds: 3000, net: 97000 })
  expect(computeTds(100000, tdsPctForTier('diamond'))).toEqual({ tds: 0, net: 100000 })
})

test('plan access gating', () => {
  expect(canAccessPlan('silver', 'gold')).toBe(false)
  expect(canAccessPlan('silver', 'silver')).toBe(true)
  expect(canAccessPlan('gold', 'silver')).toBe(true)
  expect(canAccessPlan('diamond', 'gold')).toBe(true)
})
