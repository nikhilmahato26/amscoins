const router = require('express').Router()
const auth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const validate = require('../middleware/validate')
const { adjustWalletSchema, resolveTicketSchema, returnRejectSchema, payoutRejectSchema, bulkApproveSchema } = require('../validation/schemas')
const c = require('../controllers/adminController')
const reportsRoutes = require('./reportsRoutes')

router.use(auth, requireAdmin)

router.get('/stats', c.getStats)

router.get('/investments', c.listInvestments)
router.get('/investments/stats', c.getInvestmentStats)
router.post('/investments/:id/approve', c.approveInvestment)
router.post('/investments/:id/reject', c.rejectInvestment)
router.post('/investments/:id/return/approve', c.approveReturn)
router.post('/investments/:id/return/reject', validate(returnRejectSchema), c.rejectReturn)
// Act on a running investment straight from a user's profile (#3).
// approve = pay now; reject = credit a custom amount (trace kept); delete = erase
// the whole cycle from the user's side (trace removed, kept in admin History).
router.post('/investments/:id/approve-payout', c.approvePayout)
router.post('/investments/:id/reject-payout', validate(payoutRejectSchema), c.rejectPayout)
router.delete('/investments/:id', c.deleteInvestment)

router.get('/withdrawals', c.listWithdrawals)
router.post('/withdrawals/bulk-approve', validate(bulkApproveSchema), c.bulkApproveWithdrawals)
router.post('/withdrawals/:id/retry', c.retryWithdrawal)
router.post('/withdrawals/:id/complete', c.completeWithdrawal)
router.post('/withdrawals/:id/reject', c.rejectWithdrawal)

router.get('/users', c.listUsers)
router.get('/users/:id', c.getUserDetail)
router.post('/users/:id/freeze', c.freeze)
router.post('/users/:id/unfreeze', c.unfreeze)

router.post('/wallets/:userId/adjust', validate(adjustWalletSchema), c.adjustWallet)

router.get('/support', c.listSupport)
router.post('/support/:id/resolve', validate(resolveTicketSchema), c.resolveSupport)

router.use('/reports', reportsRoutes)

module.exports = router
