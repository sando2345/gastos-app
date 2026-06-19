import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1
  const year = Number(req.query.year) || new Date().getFullYear()
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId!, month, year },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ data: budgets })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener presupuestos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, amount, month, year } = req.body
  if (!categoryId || !amount || !month || !year) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  try {
    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        categoryId,
        amount: new Prisma.Decimal(amount),
        month: Number(month),
        year: Number(year),
      },
      include: { category: true }
    })
    res.status(201).json({ data: budget, message: 'Presupuesto creado' })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un presupuesto para esa categoría en ese mes' })
    }
    res.status(500).json({ error: 'Error al crear presupuesto' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { amount } = req.body
  try {
    const budget = await prisma.budget.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { amount: new Prisma.Decimal(amount) }
    })
    res.json({ data: budget })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar presupuesto' })
  }
})

export default router
