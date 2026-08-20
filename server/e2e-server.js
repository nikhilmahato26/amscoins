/**
 * e2e-server.js — hermetic Express server for Playwright e2e tests.
 *
 * Boots the existing app against a throwaway MongoMemoryReplSet (never Atlas).
 * Start with: node e2e-server.js   OR   npm run e2e:server
 *
 * Admin creds:  admin@e2e.test / admin123
 */

const { MongoMemoryReplSet } = require('mongodb-memory-server')

// Set env BEFORE requiring any module that reads process.env
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-secret'
process.env.ADMIN_EMAIL = 'admin@e2e.test'
process.env.ADMIN_PASSWORD = 'admin123'
// Enable the readable-password feature (#4) so the admin user view can show it.
process.env.PASSWORD_ENC_KEY = process.env.PASSWORD_ENC_KEY || 'e2e-password-key'
// Run as a test env: skips rate limiters (see rateLimits `skipInTest`) so the
// suite's many registrations don't trip the 5-per-15min register throttle, and
// routes email to nodemailer's jsonTransport instead of sending real mail.
// Force test mode (not `|| 'test'`): the hermetic e2e server must ALWAYS skip
// rate limiters and route email to jsonTransport, regardless of any ambient
// NODE_ENV. Inheriting a non-test value silently enables Redis-backed throttling
// and trips the suite's many registrations with 429s.
process.env.NODE_ENV = 'test'

;(async () => {
  // A single-node replica set so transactions are available (same as Jest suite)
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  process.env.MONGO_URI = mongod.getUri()

  // Require modules AFTER env is set so dotenv won't override our values
  const { connectDb } = require('./src/config/db')
  const app = require('./src/app')
  const { seedPlans } = require('./src/seed/seedPlans')
  const { seedAdmin } = require('./src/seed/seedAdmin')

  await connectDb(process.env.MONGO_URI)
  await seedPlans()
  await seedAdmin()

  // Seed contact settings so the large-deposit WhatsApp/Telegram handoff methods
  // are actually usable (isMethodConfigured needs a number/username set).
  const Settings = require('./src/models/Settings')
  const settings = await Settings.getSingleton()
  settings.whatsappNumber = '919999999999'
  settings.telegramUsername = 'asmcoins_support'
  await settings.save()

  app.listen(4000, () => {
    console.log('E2E server on :4000 (in-memory MongoDB — never Atlas)')
  })

  // Graceful shutdown so Playwright webServer teardown doesn't leave orphans
  const shutdown = async () => {
    const mongoose = require('mongoose')
    await mongoose.disconnect()
    await mongod.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
})()
