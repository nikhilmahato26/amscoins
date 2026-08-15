'use strict'

const Redis = require('ioredis')
const env = require('./env')
const logger = require('../lib/logger').child({ service: 'redis' })

const isTest = env.NODE_ENV === 'test'

let redis = null

if (!isTest && env.REDIS_URL) {
  try {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })

    redis.connect().catch((err) => {
      logger.warn('Redis connection failed on startup — falling back to non-cached operations', {
        error: err.message,
      })
    })

    redis.on('error', (err) => {
      logger.warn('Redis client error', { error: err.message })
    })

    redis.on('connect', () => {
      logger.info('Connected to Redis')
    })
  } catch (err) {
    logger.warn('Could not initialize Redis client', { error: err.message })
    redis = null
  }
}

/**
 * Fetch a string from cache. Returns null on miss, absence of redis, or error.
 */
async function cacheGet(key) {
  if (!redis || redis.status !== 'ready') return null
  try {
    return await redis.get(key)
  } catch (err) {
    logger.warn('cacheGet error', { key, error: err.message })
    return null
  }
}

/**
 * Store a string in cache with an expiration in seconds.
 */
async function cacheSet(key, value, ttlSeconds = 60) {
  if (!redis || redis.status !== 'ready') return false
  try {
    await redis.set(key, value, 'EX', ttlSeconds)
    return true
  } catch (err) {
    logger.warn('cacheSet error', { key, error: err.message })
    return false
  }
}

/**
 * Delete one or more keys from cache.
 */
async function cacheDel(...keys) {
  const validKeys = keys.filter(Boolean)
  if (!redis || redis.status !== 'ready' || validKeys.length === 0) return false
  try {
    await redis.del(...validKeys)
    return true
  } catch (err) {
    logger.warn('cacheDel error', { keys: validKeys, error: err.message })
    return false
  }
}

module.exports = {
  redis,
  cacheGet,
  cacheSet,
  cacheDel,
}
