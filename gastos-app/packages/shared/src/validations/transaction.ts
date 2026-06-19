import { z } from 'zod'

export const createTransactionSchema = z.object({
  categoryId: z.string().uuid('Categoría inválida'),
  type: z.enum(['income', 'expense']),
  amount: z
    .number({ required_error: 'El monto es requerido' })
    .positive('El monto debe ser positivo')
    .multipleOf(0.01, 'Máximo 2 decimales'),
  description: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(200, 'Máximo 200 caracteres'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  paymentMethod: z
    .enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'])
    .default('cash'),
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
