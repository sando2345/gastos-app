import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  const { type, categoryId } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50
  try {
    const where: Prisma.TransactionWhereInput = {
      userId: req.userId!,
      ...(type && { type: type as any }),
      ...(categoryId && { categoryId: categoryId as string }),
    }
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where, include: { category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.transaction.count({ where }),
    ])
    res.json({ data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener transacciones' })
  }
})

router.get('/dashboard', async (req: AuthRequest, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1
  const year = Number(req.query.year) || new Date().getFullYear()
  const EXTRA_CATEGORY_ID = '00000000-0000-0000-0000-000000000099'
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId!, date: { gte: startDate, lte: endDate } },
      include: { category: true },
    })

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0)

    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExtras = expenses
      .filter(t => t.categoryId === EXTRA_CATEGORY_ID)
      .reduce((s, t) => s + Number(t.amount), 0)
    const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0)
    const totalNormalExpenses = totalExpenses - totalExtras

    const byCategory = Object.values(
      expenses.reduce((acc, t) => {
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
      }, {} as Record<string, any>)
    ).sort((a: any, b: any) => b.total - a.total)

    const monthlyTrend = await prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END)::float as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)::float as expenses
      FROM transactions
      WHERE user_id = ${req.userId}::uuid
        AND date >= ${new Date(year, month - 7, 1)}
        AND date <= ${endDate}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `

    res.json({
      data: {
        totalIncome, totalExpenses, totalNormalExpenses, totalExtras,
        balance: totalIncome - totalExpenses,
        byCategory, monthlyTrend,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

router.post('/copy-fixed', async (req: AuthRequest, res) => {
  const { month, year } = req.body
  if (!month || !year) {
    return res.status(400).json({ error: 'Mes y año requeridos' })
  }
  try {
    let prevMonth = Number(month) - 1
    let prevYear = Number(year)
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1 }

    const prevStart = new Date(prevYear, prevMonth - 1, 1)
    const prevEnd = new Date(prevYear, prevMonth, 0)

    const fixedExpenses = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        isFixed: true,
        date: { gte: prevStart, lte: prevEnd },
      }
    })

    if (fixedExpenses.length === 0) {
      return res.json({ data: [], message: 'No hay gastos fijos en el mes anterior' })
    }

    const newDate = new Date(Number(year), Number(month) - 1, 1)
    const created = await prisma.transaction.createMany({
      data: fixedExpenses.map(t => ({
        userId: req.userId!,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: newDate,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        isFixed: true,
      }))
    })

    res.json({ data: { count: created.count }, message: `${created.count} gastos fijos copiados` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al copiar gastos fijos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, type, amount, description, date, paymentMethod, notes, isFixed } = req.body
  if (!categoryId || !type || !amount || !description || !date) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        categoryId, type,
        amount: new Prisma.Decimal(amount),
        description,
        date: new Date(date),
        paymentMethod: paymentMethod || 'cash',
        notes: notes || null,
        isFixed: isFixed || false,
      },
      include: { category: true }
    })

    if (type === 'expense') {
      const d = new Date(date)
      await prisma.budget.updateMany({
        where: {
          userId: req.userId!, categoryId,
          month: d.getMonth() + 1, year: d.getFullYear(),
        },
        data: { spent: { increment: new Prisma.Decimal(amount) } }
      })
    }

    res.status(201).json({ data: transaction, message: 'Transacción creada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear transacción' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { categoryId, type, amount, description, date, paymentMethod, notes, isFixed } = req.body
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! }
    })
    if (!existing) return res.status(404).json({ error: 'Transacción no encontrada' })

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...(categoryId && { categoryId }),
        ...(type && { type }),
        ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(paymentMethod && { paymentMethod }),
        ...(notes !== undefined && { notes }),
        ...(isFixed !== undefined && { isFixed }),
      },
      include: { category: true }
    })
    res.json({ data: transaction, message: 'Transacción actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar transacción' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId! }
    })
    if (!existing) return res.status(404).json({ error: 'Transacción no encontrada' })

    await prisma.transaction.delete({ where: { id: req.params.id } })

    if (existing.type === 'expense') {
      const d = new Date(existing.date)
      await prisma.budget.updateMany({
        where: {
          userId: req.userId!, categoryId: existing.categoryId,
          month: d.getMonth() + 1, year: d.getFullYear(),
        },
        data: { spent: { decrement: existing.amount } }
      })
    }

    res.json({ message: 'Transacción eliminada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar transacción' })
  }
})

export default router
