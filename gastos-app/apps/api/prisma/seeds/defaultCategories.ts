import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultCategories = [
  // Gastos
  { name: 'Vivienda',       icon: 'home',            color: '#6366f1', type: 'expense' as const },
  { name: 'Alimentación',   icon: 'shopping-cart',   color: '#f59e0b', type: 'expense' as const },
  { name: 'Transporte',     icon: 'car',             color: '#3b82f6', type: 'expense' as const },
  { name: 'Salud',          icon: 'heart',           color: '#ef4444', type: 'expense' as const },
  { name: 'Educación',      icon: 'book',            color: '#8b5cf6', type: 'expense' as const },
  { name: 'Ocio',           icon: 'gamepad',         color: '#ec4899', type: 'expense' as const },
  { name: 'Ropa',           icon: 'shirt',           color: '#14b8a6', type: 'expense' as const },
  { name: 'Servicios',      icon: 'zap',             color: '#f97316', type: 'expense' as const },
  { name: 'Otros gastos',   icon: 'more-horizontal', color: '#6b7280', type: 'expense' as const },
  // Ingresos
  { name: 'Salario',        icon: 'briefcase',       color: '#10b981', type: 'income' as const },
  { name: 'Freelance',      icon: 'laptop',          color: '#06b6d4', type: 'income' as const },
  { name: 'Inversiones',    icon: 'trending-up',     color: '#84cc16', type: 'income' as const },
  { name: 'Otros ingresos', icon: 'plus-circle',     color: '#a3e635', type: 'income' as const },
]

async function seed() {
  console.log('Insertando categorías por defecto...')

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: {
        // Usamos name + isDefault como identificador único para el seed
        id: `default-${cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        ...cat,
        isDefault: true,
        userId: null,
      },
    })
  }

  console.log(`✅ ${defaultCategories.length} categorías insertadas`)
  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
