import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'
import categoryRoutes from './routes/categories'
import budgetRoutes from './routes/budgets'

const app = express()

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') ?? []
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/budgets', budgetRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Error interno del servidor' })
})

export default app
