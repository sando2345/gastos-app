import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { OR: [{ isDefault: true }, { userId: req.userId }] },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
    })
    res.json({ data: categories })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { name, icon, color, type } = req.body
  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo son requeridos' })
  }
  try {
    const category = await prisma.category.create({
      data: {
        userId: req.userId!,
        name,
        icon: icon || 'wallet',
        color: color || '#6366f1',
        type,
        isDefault: false,
      }
    })
    res.status(201).json({ data: category, message: 'Categoría creada' })
  } catch (err) {
    res.status(500).json({ error: 'Error al crear categoría' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { name, icon, color } = req.body
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId!, isDefault: false }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Categoría no encontrada o no editable' })
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(color && { color }),
      }
    })
    res.json({ data: category, message: 'Categoría actualizada' })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar categoría' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId!, isDefault: false }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Categoría no encontrada o no eliminable' })
    }
    const txCount = await prisma.transaction.count({
      where: { categoryId: req.params.id }
    })
    if (txCount > 0) {
      return res.status(409).json({ error: 'No puedes eliminar una categoría con transacciones' })
    }
    await prisma.category.delete({ where: { id: req.params.id } })
    res.json({ message: 'Categoría eliminada' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría' })
  }
})

export default router
