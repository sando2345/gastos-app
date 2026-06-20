import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const periods = await prisma.period.findMany({
      where: { userId: req.userId! },
      orderBy: { startDate: 'desc' },
    })
    res.json({ data: periods })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener períodos' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  const { name, startDate, endDate } = req.body
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Fecha de inicio y fin requeridas' })
  }
  try {
    let finalName = name
    if (!finalName) {
      const end = new Date(endDate)
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      finalName = `${meses[end.getMonth()]} ${end.getFullYear()}`
    }
    const period = await prisma.period.create({
      data: {
        userId: req.userId!,
        name: finalName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    })
    res.status(201).json({ data: period, message: 'Período creado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear período' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { name, startDate, endDate } = req.body
  try {
    const existing = await prisma.period.findFirst({
      where: { id: req.params.id, userId: req.userId! }
    })
    if (!existing) return res.status(404).json({ error: 'Período no encontrado' })

    const period = await prisma.period.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      }
    })
    res.json({ data: period, message: 'Período actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar período' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.period.findFirst({
      where: { id: req.params.id, userId: req.userId! }
    })
    if (!existing) return res.status(404).json({ error: 'Período no encontrado' })

    await prisma.period.delete({ where: { id: req.params.id } })
    res.json({ message: 'Período eliminado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar período' })
  }
})

export default router