import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { transactionService } from '../services/transactionService'
import type { TransactionFiltersInput } from '../validations/transaction'

export const transactionController = {
  async list(req: AuthRequest, res: Response) {
    const result = await transactionService.findAll(
      req.userId!,
      req.query as unknown as TransactionFiltersInput
    )
    res.json(result)
  },

  async getOne(req: AuthRequest, res: Response) {
    const transaction = await transactionService.findById(req.params.id, req.userId!)
    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' })
    }
    res.json({ data: transaction })
  },

  async create(req: AuthRequest, res: Response) {
    const transaction = await transactionService.create(req.userId!, req.body)
    res.status(201).json({ data: transaction, message: 'Transacción creada' })
  },

  async update(req: AuthRequest, res: Response) {
    const transaction = await transactionService.update(
      req.params.id,
      req.userId!,
      req.body
    )
    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' })
    }
    res.json({ data: transaction, message: 'Transacción actualizada' })
  },

  async remove(req: AuthRequest, res: Response) {
    const deleted = await transactionService.delete(req.params.id, req.userId!)
    if (!deleted) {
      return res.status(404).json({ error: 'Transacción no encontrada' })
    }
    res.json({ message: 'Transacción eliminada' })
  },

  async dashboard(req: AuthRequest, res: Response) {
    const now = new Date()
    const month = Number(req.query.month) || now.getMonth() + 1
    const year = Number(req.query.year) || now.getFullYear()

    const stats = await transactionService.getDashboardStats(req.userId!, month, year)
    res.json({ data: stats })
  },
}
