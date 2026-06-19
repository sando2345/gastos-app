export type TransactionType = 'income' | 'expense'

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'digital_wallet'

export interface User {
  id: string
  email: string
  fullName: string
  currency: string
  createdAt: string
}

export interface Category {
  id: string
  userId: string | null
  name: string
  icon: string
  color: string
  type: TransactionType
  isDefault: boolean
}

export interface Transaction {
  id: string
  userId: string
  categoryId: string
  category?: Category
  type: TransactionType
  amount: number
  description: string
  date: string
  paymentMethod: PaymentMethod
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  userId: string
  categoryId: string
  category?: Category
  amount: number
  month: number
  year: number
  spent: number
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  byCategory: {
    categoryId: string
    name: string
    color: string
    total: number
  }[]
  monthlyTrend: {
    month: string
    income: number
    expenses: number
  }[]
}
