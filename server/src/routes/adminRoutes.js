const router = require('express').Router()
const auth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const validate = require('../middleware/validate')
const { adjustWalletSchema } = require('../validation/schemas')
const c = require('../controllers/adminController')

router.use(auth, requireAdmin)

router.get('/investments', c.listInvestments)
router.post('/investments/:id/approve', c.approveInvestment)
router.post('/investments/:id/reject', c.rejectInvestment)

router.get('/withdrawals', c.listWithdrawals)
router.post('/withdrawals/:id/complete', c.completeWithdrawal)
router.post('/withdrawals/:id/reject', c.rejectWithdrawal)

router.get('/users', c.listUsers)
router.post('/users/:id/freeze', c.freeze)
router.post('/users/:id/unfreeze', c.unfreeze)

router.post('/wallets/:userId/adjust', validate(adjustWalletSchema), c.adjustWallet)

module.exports = router
