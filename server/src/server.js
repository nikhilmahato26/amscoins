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
  // Log synchronously to stderr FIRST: winston's file transport is async, so a
  // bare logger.error() right before process.exit() loses the stack to the exit
  // race (which is why past crashes showed no reason). Then best-effort winston.
  process.stderr.write(`\n[FATAL] Uncaught Exception — shutting down\n${err && err.stack ? err.stack : String(err)}\n`)
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
