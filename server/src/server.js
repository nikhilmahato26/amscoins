const logger = require('./lib/logger')
const app = require('./app')
const env = require('./config/env')
const { connectDb } = require('./config/db')
const { seedPlans } = require('./seed/seedPlans')
const { seedAdmin } = require('./seed/seedAdmin')
const { startInvestmentWorker } = require('./jobs/investmentWorker')

// ---------------------------------------------------------------------------
// Global crash handlers — catch anything that slips past try/catch blocks.
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.stack : String(reason),
  })
  // Do NOT exit — let Express keep serving other requests.
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception — shutting down', { stack: err.stack })
  process.exit(1)
})

connectDb()
  .then(async () => {
    await seedPlans()
    await seedAdmin()
    startInvestmentWorker().catch((err) => logger.warn('Worker failed to start', { error: err.message }))
    app.listen(env.PORT, () => logger.info(`ASM Coins API on :${env.PORT}`))
  })
  .catch((err) => {
    logger.error('Failed to start server', { stack: err.stack })
    process.exit(1)
  })
