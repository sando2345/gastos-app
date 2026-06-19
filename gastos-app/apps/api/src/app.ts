import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import transactionRoutes from './routes/transactions'

const app = express()

// Seguridad
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  })
)
app.use(express.json())

// Rutas
app.use('/api/transactions', transactionRoutes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Manejador de errores global
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[Error]', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
)

export default app
