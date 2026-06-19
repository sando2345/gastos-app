export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet'
export interface Transaction {
  id: string; userId: string; categoryId: string; type: TransactionType
  amount: number; description: string; date: string; paymentMethod: PaymentMethod; notes?: string
}
