import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  const { periodId } = req.query
  if (!periodId) return res.json({ data: [] })
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId!, periodId: periodId as string },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ data: budgets })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener presupuestos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, amount, periodId } = req.body
  if (!categoryId || !amount || !periodId) {
    return res.status(400).json({ error: 'Categoría, monto y período requeridos' })
  }
  try {
    const period = await prisma.period.findFirst({
      where: { id: periodId, userId: req.userId! }
    })
    if (!period) return res.status(404).json({ error: 'Período no encontrado' })

    const end = new Date(period.endDate)
    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        categoryId,
        amount: new Prisma.Decimal(amount),
        month: end.getMonth() + 1,
        year: end.getFullYear(),
        periodId,
      },
      include: { category: true }
    })
    res.status(201).json({ data: budget, message: 'Presupuesto creado' })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un presupuesto para esa categoría en este período' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al crear presupuesto' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { amount } = req.body
  try {
    await prisma.budget.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { amount: new Prisma.Decimal(amount) }
    })
    res.json({ message: 'Presupuesto actualizado' })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar presupuesto' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.budget.deleteMany({
      where: { id: req.params.id, userId: req.userId! }
    })
    res.json({ message: 'Presupuesto eliminado' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar presupuesto' })
  }
})

export default router