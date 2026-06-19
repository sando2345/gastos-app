import { Router } from 'express'
import { transactionController } from '../controllers/transactionController'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from '../validations/transaction'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

router.get('/', validate(transactionFiltersSchema, 'query'), transactionController.list)
router.get('/dashboard', transactionController.dashboard)
router.get('/:id', transactionController.getOne)
router.post('/', validate(createTransactionSchema), transactionController.create)
router.patch('/:id', validate(updateTransactionSchema), transactionController.update)
router.delete('/:id', transactionController.remove)

export default router
