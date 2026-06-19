import { z } from 'zod'

export const createTransactionSchema = z.object({
  categoryId: z.string().uuid('Categoría inválida'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet']).default('cash'),
  notes: z.string().max(500).optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const transactionFiltersSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>
