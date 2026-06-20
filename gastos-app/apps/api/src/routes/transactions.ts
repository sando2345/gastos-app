import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  const { type, categoryId, periodId } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50
  try {
    const where: Prisma.TransactionWhereInput = {
      userId: req.userId!,
      ...(type && { type: type as any }),
      ...(categoryId && { categoryId: categoryId as string }),
      ...(periodId && { periodId: periodId as string }),
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
  const { periodId } = req.query
  const EXTRA_CATEGORY_ID = '00000000-0000-0000-0000-000000000099'
  if (!periodId) {
    return res.json({
      data: {
        totalIncome: 0, totalExpenses: 0, totalNormalExpenses: 0, totalExtras: 0,
        totalBudget: 0, totalFixed: 0, totalVariable: 0,
        balance: 0, byCategory: [], monthlyTrend: []
      }
    })
  }
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId!, periodId: periodId as string },
      include: { category: true },
    })

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId!, periodId: periodId as string },
    })
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0)

    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExtras = expenses
      .filter(t => t.categoryId === EXTRA_CATEGORY_ID)
      .reduce((s, t) => s + Number(t.amount), 0)
    const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0)
    const totalNormalExpenses = totalExpenses - totalExtras

    const totalFixed = expenses
      .filter(t => t.isFixed)
      .reduce((s, t) => s + Number(t.amount), 0)
    const totalVariable = totalExpenses - totalFixed

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

    const periods = await prisma.period.findMany({
      where: { userId: req.userId! },
      orderBy: { startDate: 'desc' },
      take: 6,
    })
    const monthlyTrend = []
    for (const p of periods.reverse()) {
      const txs = await prisma.transaction.findMany({
        where: { userId: req.userId!, periodId: p.id },
      })
      monthlyTrend.push({
        month: p.name,
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      })
    }

    res.json({
      data: {
        totalIncome, totalExpenses, totalNormalExpenses, totalExtras,
        totalBudget, totalFixed, totalVariable,
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
  const { fromPeriodId, toPeriodId } = req.body
  if (!fromPeriodId || !toPeriodId) {
    return res.status(400).json({ error: 'Período origen y destino requeridos' })
  }
  try {
    const toPeriod = await prisma.period.findFirst({
      where: { id: toPeriodId, userId: req.userId! }
    })
    if (!toPeriod) return res.status(404).json({ error: 'Período destino no encontrado' })

    const fixedExpenses = await prisma.transaction.findMany({
      where: { userId: req.userId!, isFixed: true, periodId: fromPeriodId }
    })

    if (fixedExpenses.length === 0) {
      return res.json({ data: [], message: 'No hay gastos fijos en el período origen' })
    }

    const created = await prisma.transaction.createMany({
      data: fixedExpenses.map(t => ({
        userId: req.userId!,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: toPeriod.startDate,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        isFixed: true,
        periodId: toPeriodId,
      }))
    })

    res.json({ data: { count: created.count }, message: `${created.count} gastos fijos copiados` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al copiar gastos fijos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, type, amount, description, date, paymentMethod, notes, isFixed, periodId } = req.body
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
        periodId: periodId || null,
      },
      include: { category: true }
    })

    if (type === 'expense' && periodId) {
      await prisma.budget.updateMany({
        where: { userId: req.userId!, categoryId, periodId },
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
  const { categoryId, type, amount, description, date, paymentMethod, notes, isFixed, periodId } = req.body
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
        ...(periodId !== undefined && { periodId }),
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

    if (existing.type === 'expense' && existing.periodId) {
      await prisma.budget.updateMany({
        where: { userId: req.userId!, categoryId: existing.categoryId, periodId: existing.periodId },
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