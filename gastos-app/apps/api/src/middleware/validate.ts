import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(source === 'body' ? req.body : req.query)
      if (source === 'body') req.body = parsed
      else req.query = parsed as typeof req.query
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          error: 'Datos de entrada inválidos',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
        return
      }
      next(error)
    }
  }
