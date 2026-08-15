const app = require('./app')
const env = require('./config/env')
const { connectDb } = require('./config/db')
const { seedPlans } = require('./seed/seedPlans')
const { seedAdmin } = require('./seed/seedAdmin')

connectDb()
  .then(async () => {
    await seedPlans()
    await seedAdmin()
    app.listen(env.PORT, () => console.log(`ASM Coins API on :${env.PORT}`))
  })
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
