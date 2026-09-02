'use strict'

const env = require('../config/env')
const logger = require('../lib/logger').child({ service: 'investment-worker' })
const { QUEUE_NAME, PREFIX } = require('../config/queue')
const svc = require('../services/investmentService')

let worker = null

// Re-scan for anything a delayed job may have missed (server restarts, jobs
// lost, clock skew). Idempotent: the service handlers no-op when the row is
// no longer in the expected state.
async function runSweep() {
  const Investment = require('../models/Investment')
  const Settings = require('../models/Settings')
  const settings = await Settings.getSingleton()
  const now = Date.now()

  // Auto-deposit runs BEFORE auto-reject: if a pending deposit is past both
  // windows, advancing it (approve) should win over rejecting it. The atomic
  // status guards make the second pass a no-op for anything already handled.
  let autoDeposited = 0
  if (settings.autoDepositEnabled) {
    const depCutoff = new Date(now - settings.autoDepositHours * 3600e3)
    const dueDeposit = await Investment.find({ status: 'pending', paymentNotified: { $ne: false }, createdAt: { $lt: depCutoff } }).select('_id')
    for (const p of dueDeposit) {
      if (await svc.runAutoDeposit(p._id)) autoDeposited++
    }
  }

  const cutoff = new Date(now - settings.autoRejectHours * 3600e3)
  const stalePending = await Investment.find({ status: 'pending', paymentNotified: { $ne: false }, createdAt: { $lt: cutoff } }).select('_id')
  for (const p of stalePending) await svc.runAutoReject(p._id)

  const due = await Investment.find({ status: 'active', maturesAt: { $lte: new Date(now) } }).select('_id')
  for (const d of due) await svc.runMature(d._id)

  // Safety-net: catch any installment that fired while the server was down.
  const invWithDueInstallments = await Investment.find({
    status: 'active',
    installments: {
      $elemMatch: { status: 'scheduled', maturesAt: { $lte: new Date(now) } },
    },
  }).select('_id installments')

  let installmentsTriggered = 0
  for (const inv of invWithDueInstallments) {
    for (const inst of inv.installments) {
      if (inst.status === 'scheduled' && inst.maturesAt <= new Date(now)) {
        if (await svc.runInstallment(inv._id, inst.day)) installmentsTriggered++
      }
    }
  }

  if (installmentsTriggered) {
    logger.info('Sweep triggered overdue installments', { installmentsTriggered })
  }

  if (autoDeposited || stalePending.length || due.length) {
    logger.info('Sweep processed investments', { autoDeposited, autoRejected: stalePending.length, matured: due.length })
  }
}

async function startInvestmentWorker() {
  if (env.NODE_ENV === 'test' || !env.REDIS_URL) return null
  const { Worker, Queue } = require('bullmq')
  const IORedis = require('ioredis')
  // Dedicated connection for the worker (BullMQ requires maxRetriesPerRequest:null
  // and its own connection separate from the Queue producer).
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  // ioredis/BullMQ EventEmitters re-throw an 'error' event that has no listener
  // as an uncaughtException — which crashes the whole API. Always attach one.
  connection.on('error', (err) => logger.warn('Worker Redis connection error', { error: err.message }))

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'auto-reject')  return svc.runAutoReject(job.data.investmentId)
      if (job.name === 'auto-deposit') return svc.runAutoDeposit(job.data.investmentId)
      if (job.name === 'mature')       return svc.runMature(job.data.investmentId)
      if (job.name === 'installment')  return svc.runInstallment(job.data.investmentId, job.data.day)
      if (job.name === 'sweep')        return runSweep()
    },
    { connection, prefix: PREFIX }
  )

  worker.on('failed', (job, err) =>
    logger.error('Job failed', { name: job?.name, id: job?.id, error: err.message })
  )
  worker.on('error', (err) => logger.warn('Worker error', { error: err.message }))

  // Repeatable safety-net sweep every 5 minutes (catches missed/restart cases).
  const sweepQueue = new Queue(QUEUE_NAME, { connection, prefix: PREFIX })
  sweepQueue.on('error', (err) => logger.warn('Sweep queue error', { error: err.message }))
  await sweepQueue.add(
    'sweep',
    {},
    { repeat: { every: 5 * 60 * 1000 }, jobId: 'sweep', removeOnComplete: true, removeOnFail: 10 }
  )

  logger.info('Investment worker started')
  return worker
}

module.exports = { startInvestmentWorker, runSweep }
