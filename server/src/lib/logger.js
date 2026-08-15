'use strict'

const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const env = require('../config/env')

// ---------------------------------------------------------------------------
// Redaction
// Keys that must never appear in log output (case-insensitive match on key).
// ---------------------------------------------------------------------------
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'smtp_pass',
  'jwt_secret',
  'pass',
  'secret',
])

/**
 * Recursively redact sensitive keys from a plain object before it is logged.
 * Returns a new object — the original is never mutated.
 */
function redact(obj, depth = 0) {
  if (depth > 6 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1))
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (REDACTED_KEYS.has(k.toLowerCase())) return [k, '[REDACTED]']
      return [k, redact(v, depth + 1)]
    })
  )
}

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------
const { combine, timestamp, errors, json, colorize, printf } = winston.format

/** Pretty single-line format for development TTY. */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp: ts, level, message, service, ...meta }) => {
    const svc = service ? `[${service}] ` : ''
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(redact(meta))}` : ''
    return `${ts} ${level}: ${svc}${message}${metaStr}`
  })
)

/** Structured JSON format for production. */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
)

const isDev = env.NODE_ENV !== 'production'
const isTest = env.NODE_ENV === 'test'

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------
const transports = []

// Console transport — always on unless in test (where we want silence).
transports.push(
  new winston.transports.Console({
    silent: isTest,
    format: isDev ? devFormat : prodFormat,
  })
)

// File transports — only in production (dev uses console; tests use silent).
if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: prodFormat,
    })
  )
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      format: prodFormat,
    })
  )
}

// ---------------------------------------------------------------------------
// Logger instance
// ---------------------------------------------------------------------------
const logger = winston.createLogger({
  level: isTest ? 'silent' : (env.LOG_LEVEL || (isDev ? 'http' : 'info')),
  levels: winston.config.npm.levels, // error warn info http verbose debug silly
  transports,
})

// Attach the redact helper so services can use it directly if needed.
logger.redact = redact

module.exports = logger
