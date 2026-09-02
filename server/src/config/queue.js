'use strict'

const env = require('./env')
const logger = require('../lib/logger').child({ service: 'queue' })

const DISABLED = env.NODE_ENV === 'test' || !env.REDIS_URL
const PREFIX = 'asm:jobs'
const QUEUE_NAME = 'investments'

let investmentQueue = null
let queueConnection = null

if (!DISABLED) {
  const { Queue } = require('bullmq')
  const IORedis = require('ioredis')
  // BullMQ requires a DEDICATED connection with maxRetriesPerRequest:null.
  // Build an ioredis instance from the URL (BullMQ's `connection` takes an
  // ioredis instance or ioredis options — a bare `{ url }` is NOT valid
  // ioredis config). Exported as `queueConnection` so the worker reuses it.
  queueConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  // ioredis and BullMQ objects are EventEmitters: an 'error' event with NO
  // listener is re-thrown by Node as an uncaughtException, which crashes the
  // whole API (server.js exits on uncaughtException). A transient Redis blip
  // must never take the process down — log and let it reconnect.
  queueConnection.on('error', (err) => logger.warn('Queue Redis connection error', { error: err.message }))
  investmentQueue = new Queue(QUEUE_NAME, { connection: queueConnection, prefix: PREFIX })
  investmentQueue.on('error', (err) => logger.warn('Investment queue error', { error: err.message }))
  logger.info('Investment job queue initialized')
}

const autoRejectJobId = (id) => `auto-reject-${id}`
const autoDepositJobId = (id) => `auto-deposit-${id}`
const matureJobId = (id) => `mature-${id}`
const installmentJobId = (id, day) => `installment-${id}-day-${day}`

async function scheduleAutoReject(inv) {
  if (!investmentQueue) return
  const Settings = require('../models/Settings')
  const settings = await Settings.getSingleton()
  const delay = Math.max(0, new Date(inv.createdAt).getTime() + settings.autoRejectHours * 3600e3 - Date.now())
  await investmentQueue.add(
    'auto-reject',
    { investmentId: String(inv._id) },
    { delay, jobId: autoRejectJobId(inv._id), removeOnComplete: true, removeOnFail: 100 }
  )
}

// Mirror of scheduleAutoReject. The job is always scheduled (so a runtime flip
// of autoDepositEnabled is honoured at fire-time by the service handler); the
// atomic status guard makes it a no-op if the deposit was already approved or
// rejected/auto-rejected first.
async function scheduleAutoDeposit(inv) {
  if (!investmentQueue) return
  const Settings = require('../models/Settings')
  const settings = await Settings.getSingleton()
  const delay = Math.max(0, new Date(inv.createdAt).getTime() + settings.autoDepositHours * 3600e3 - Date.now())
  await investmentQueue.add(
    'auto-deposit',
    { investmentId: String(inv._id) },
    { delay, jobId: autoDepositJobId(inv._id), removeOnComplete: true, removeOnFail: 100 }
  )
}

async function scheduleMature(inv) {
  if (!investmentQueue) return
  const delay = Math.max(0, new Date(inv.maturesAt).getTime() - Date.now())
  await investmentQueue.add(
    'mature',
    { investmentId: String(inv._id) },
    { delay, jobId: matureJobId(inv._id), removeOnComplete: true, removeOnFail: 100 }
  )
}

async function cancelAutoReject(id) {
  if (!investmentQueue) return
  const job = await investmentQueue.getJob(autoRejectJobId(id))
  if (job) await job.remove()
}

async function cancelAutoDeposit(id) {
  if (!investmentQueue) return
  const job = await investmentQueue.getJob(autoDepositJobId(id))
  if (job) await job.remove()
}

async function cancelMature(id) {
  if (!investmentQueue) return
  const job = await investmentQueue.getJob(matureJobId(id))
  if (job) await job.remove()
}

async function scheduleInstallment(inv, day) {
  if (!investmentQueue) return
  const installment = inv.installments.find((i) => i.day === day)
  if (!installment) return
  const delay = Math.max(0, new Date(installment.maturesAt).getTime() - Date.now())
  await investmentQueue.add(
    'installment',
    { investmentId: String(inv._id), day },
    { delay, jobId: installmentJobId(inv._id, day), removeOnComplete: true, removeOnFail: 100 }
  )
}

async function cancelInstallments(id) {
  if (!investmentQueue) return
  for (const day of [1, 2, 3]) {
    const job = await investmentQueue.getJob(installmentJobId(id, day))
    if (job) await job.remove()
  }
}

module.exports = {
  investmentQueue,
  queueConnection,
  scheduleAutoReject,
  scheduleAutoDeposit,
  scheduleMature,
  scheduleInstallment,
  cancelAutoReject,
  cancelAutoDeposit,
  cancelMature,
  cancelInstallments,
  QUEUE_NAME,
  PREFIX,
  autoRejectJobId,
  autoDepositJobId,
  matureJobId,
  installmentJobId,
}
