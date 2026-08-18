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

  const cutoff = new Date(now - settings.autoRejectHours * 3600e3)
  const stalePending = await Investment.find({ status: 'pending', createdAt: { $lt: cutoff } }).select('_id')
  for (const p of stalePending) await svc.runAutoReject(p._id)

  const due = await Investment.find({ status: 'active', maturesAt: { $lte: new Date(now) } }).select('_id')
  for (const d of due) await svc.runMature(d._id)

  if (stalePending.length || due.length) {
    logger.info('Sweep processed investments', { autoRejected: stalePending.length, matured: due.length })
  }
}

async function startInvestmentWorker() {
  if (env.NODE_ENV === 'test' || !env.REDIS_URL) return null
  const { Worker, Queue } = require('bullmq')
  const IORedis = require('ioredis')
  // Dedicated connection for the worker (BullMQ requires maxRetriesPerRequest:null
  // and its own connection separate from the Queue producer).
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'auto-reject') return svc.runAutoReject(job.data.investmentId)
      if (job.name === 'mature') return svc.runMature(job.data.investmentId)
      if (job.name === 'sweep') return runSweep()
    },
    { connection, prefix: PREFIX }
  )

  worker.on('failed', (job, err) =>
    logger.error('Job failed', { name: job?.name, id: job?.id, error: err.message })
  )

  // Repeatable safety-net sweep every 5 minutes (catches missed/restart cases).
  const sweepQueue = new Queue(QUEUE_NAME, { connection, prefix: PREFIX })
  await sweepQueue.add(
    'sweep',
    {},
    { repeat: { every: 5 * 60 * 1000 }, jobId: 'sweep', removeOnComplete: true, removeOnFail: 10 }
  )

  logger.info('Investment worker started')
  return worker
}

module.exports = { startInvestmentWorker, runSweep }
