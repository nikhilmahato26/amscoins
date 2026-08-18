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
  investmentQueue = new Queue(QUEUE_NAME, { connection: queueConnection, prefix: PREFIX })
  logger.info('Investment job queue initialized')
}

const autoRejectJobId = (id) => `auto-reject-${id}`
const matureJobId = (id) => `mature-${id}`

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

module.exports = {
  investmentQueue,
  queueConnection,
  scheduleAutoReject,
  scheduleMature,
  cancelAutoReject,
  QUEUE_NAME,
  PREFIX,
  autoRejectJobId,
  matureJobId,
}
