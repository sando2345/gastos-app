import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

interface JwtPayload {
  sub: string
  email: string
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autorización requerido' })
    return
  }

  const token = authHeader.substring(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
