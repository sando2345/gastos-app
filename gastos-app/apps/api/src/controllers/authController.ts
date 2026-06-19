import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const generateToken = (userId: string, email: string) =>
  jwt.sign({ sub: userId, email }, process.env.JWT_SECRET!, { expiresIn: '30d' })

export const authController = {
  async register(req: Request, res: Response) {
    const { email, password, fullName } = req.body
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }
    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email' })
      }
      const passwordHash = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: { email, passwordHash, fullName, currency: 'CLP' },
        select: { id: true, email: true, fullName: true, currency: true, createdAt: true }
      })
      const token = generateToken(user.id, user.email)
      res.status(201).json({ user, token })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Error al crear la cuenta' })
    }
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }
    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' })
      }
      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' })
      }
      const token = generateToken(user.id, user.email)
      res.json({
        user: { id: user.id, email: user.email, fullName: user.fullName, currency: user.currency },
        token,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Error al iniciar sesión' })
    }
  },

  async me(req: Request & { userId?: string }, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, fullName: true, currency: true, createdAt: true }
      })
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
      res.json({ data: user })
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener usuario' })
    }
  }
}
