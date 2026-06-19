import { PrismaClient, Prisma } from '@prisma/client'
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFiltersInput,
} from '../validations/transaction'

const prisma = new PrismaClient()

export const transactionService = {
  async findAll(userId: string, filters: TransactionFiltersInput) {
    const { type, categoryId, startDate, endDate, page, limit } = filters
    const skip = (page - 1) * limit

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async findById(id: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    })
  },

  async create(userId: string, input: CreateTransactionInput) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          categoryId: input.categoryId,
          type: input.type,
          amount: new Prisma.Decimal(input.amount),
          description: input.description,
          date: new Date(input.date),
          paymentMethod: input.paymentMethod,
          notes: input.notes,
        },
        include: { category: true },
      })

      // Actualizar presupuesto gastado si aplica
      if (input.type === 'expense') {
        const date = new Date(input.date)
        await tx.budget.updateMany({
          where: {
            userId,
            categoryId: input.categoryId,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
          },
          data: { spent: { increment: new Prisma.Decimal(input.amount) } },
        })
      }

      return created
    })
  },

  async update(id: string, userId: string, input: UpdateTransactionInput) {
    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) return null

    return prisma.transaction.update({
      where: { id },
      data: {
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.type && { type: input.type }),
        ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
        ...(input.description && { description: input.description }),
        ...(input.date && { date: new Date(input.date) }),
        ...(input.paymentMethod && { paymentMethod: input.paymentMethod }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: { category: true },
    })
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) return false

    await prisma.transaction.delete({ where: { id } })
    return true
  },

  async getDashboardStats(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const [transactions, monthlyTrend] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        include: { category: true },
      }),
      prisma.$queryRaw<{ month: string; income: number; expenses: number }[]>`
        SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END)::float as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)::float as expenses
        FROM transactions
        WHERE user_id = ${userId}
          AND date >= ${new Date(year, month - 7, 1)}
          AND date <= ${endDate}
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month ASC
      `,
    ])

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const byCategory = Object.values(
      transactions
        .filter((t) => t.type === 'expense')
        .reduce(
          (acc, t) => {
            if (!acc[t.categoryId]) {
              acc[t.categoryId] = {
                categoryId: t.categoryId,
                name: t.category.name,
                color: t.category.color,
                total: 0,
              }
            }
            acc[t.categoryId].total += Number(t.amount)
            return acc
          },
          {} as Record<string, { categoryId: string; name: string; color: string; total: number }>
        )
    ).sort((a, b) => b.total - a.total)

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      byCategory,
      monthlyTrend,
    }
  },
}
