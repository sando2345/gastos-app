import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId: req.userId }]
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
    })
    res.json({ data: categories })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

export default router
