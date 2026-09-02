'use strict'

/**
 * Task 5: sweep safety-net for installment maturation.
 *
 * The BullMQ job is the primary path; the sweep is the fallback that catches
 * installments whose scheduled jobs were missed (server restart, Redis blip).
 *
 * Requires runInstallment from investmentService (implemented in Task 6).
 * Until Task 6 lands, we mock svc.runInstallment so the sweep can be tested
 * in isolation. The mock returns a truthy value (the updated installment) when
 * the installment is due, and null when it is not.
 */

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const svc = require('../../src/services/investmentService')
const { runSweep } = require('../../src/jobs/investmentWorker')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const H = 3600e3

// Helper: create a minimal active investment with installments
async function activeWithInstallments(installments) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 200000,
    returnPct: 30,
    installmentPcts: [10, 10, 10],
    expectedReturn: 60000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'active',
    startAt: new Date(),
    approvedAt: new Date(),
    maturesAt: new Date(Date.now() + 72 * H),
    installments,
  })
}

describe('runSweep installment safety-net', () => {
  let runInstallmentSpy

  beforeEach(() => {
    // Mock svc.runInstallment — Task 6 provides the real impl.
    // Returns a truthy value to simulate "installment marked available".
    runInstallmentSpy = jest
      .spyOn(svc, 'runInstallment')
      .mockResolvedValue({ day: 1, status: 'available' })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sweep calls runInstallment for each due scheduled installment', async () => {
    const pastTime = new Date(Date.now() - 1000)
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: pastTime },
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 24 * H) },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 48 * H) },
    ])

    await runSweep()

    // Only day 1 is past due
    expect(runInstallmentSpy).toHaveBeenCalledTimes(1)
  })

  test('sweep calls runInstallment for BOTH due installments when 2 are overdue', async () => {
    const past = new Date(Date.now() - 1000)
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 24 * H) },
    ])

    await runSweep()

    expect(runInstallmentSpy).toHaveBeenCalledTimes(2)
  })

  test('sweep does NOT call runInstallment for already-available installments', async () => {
    const past = new Date(Date.now() - 1000)
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'available', maturesAt: past }, // already done
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 24 * H) },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 48 * H) },
    ])

    await runSweep()

    expect(runInstallmentSpy).not.toHaveBeenCalled()
  })

  test('sweep does NOT call runInstallment when no installments are due', async () => {
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 24 * H) },
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 48 * H) },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 72 * H) },
    ])

    await runSweep()

    expect(runInstallmentSpy).not.toHaveBeenCalled()
  })

  test('sweep skips non-active investments (e.g. matured) even with due installments', async () => {
    const past = new Date(Date.now() - 1000)
    // Create a matured investment — should be excluded from the sweep query
    await Investment.create({
      user: new mongoose.Types.ObjectId(),
      planKey: 'silver',
      amount: 200000,
      returnPct: 30,
      installmentPcts: [10, 10, 10],
      expectedReturn: 60000,
      referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
      status: 'matured',
      startAt: new Date(),
      maturesAt: past,
      installments: [
        { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
        { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
        { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      ],
    })

    await runSweep()

    expect(runInstallmentSpy).not.toHaveBeenCalled()
  })

  test('sweep processes installments across multiple investments', async () => {
    const past = new Date(Date.now() - 1000)
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 24 * H) },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 48 * H) },
    ])
    await activeWithInstallments([
      { day: 1, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      { day: 2, pct: 10, amount: 20000, status: 'scheduled', maturesAt: past },
      { day: 3, pct: 10, amount: 20000, status: 'scheduled', maturesAt: new Date(Date.now() + 48 * H) },
    ])

    await runSweep()

    // 1 due from first investment + 2 due from second
    expect(runInstallmentSpy).toHaveBeenCalledTimes(3)
  })
})
