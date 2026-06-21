import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

// Listar plantillas base del usuario
router.get('/', async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.budgetTemplate.findMany({
      where: { userId: req.userId! },
      include: { category: true },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ data: templates })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener plantillas' })
  }
})

// Crear plantilla base
router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, amount } = req.body
  if (!categoryId || !amount) {
    return res.status(400).json({ error: 'Categoría y monto requeridos' })
  }
  try {
    const template = await prisma.budgetTemplate.create({
      data: {
        userId: req.userId!,
        categoryId,
        amount: new Prisma.Decimal(amount),
      },
      include: { category: true }
    })
    res.status(201).json({ data: template, message: 'Presupuesto base creado' })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un presupuesto base para esa categoría' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al crear plantilla' })
  }
})

// Editar plantilla base
router.patch('/:id', async (req: AuthRequest, res) => {
  const { amount } = req.body
  try {
    const existing = await prisma.budgetTemplate.findFirst({
      where: { id: req.params.id, userId: req.userId! }
    })
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' })

    const template = await prisma.budgetTemplate.update({
      where: { id: req.params.id },
      data: { amount: new Prisma.Decimal(amount) },
      include: { category: true }
    })
    res.json({ data: template, message: 'Presupuesto base actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar plantilla' })
  }
})

// Eliminar plantilla base
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.budgetTemplate.deleteMany({
      where: { id: req.params.id, userId: req.userId! }
    })
    res.json({ message: 'Presupuesto base eliminado' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar plantilla' })
  }
})

export default router