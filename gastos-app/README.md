# Gastos App — Control de gastos personales

Stack: React + TypeScript (web) · Expo (móvil) · Node.js + Express (API) · PostgreSQL / Supabase

## Requisitos previos

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Cuenta en [Supabase](https://supabase.com) (gratuita)

---

## Setup inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd gastos-app
pnpm install
```

### 2. Crear el proyecto en Supabase

1. Ve a https://supabase.com → New project
2. Copia la **Connection string** desde Settings → Database
3. En `apps/api/`, copia el archivo de entorno:

```bash
cp apps/api/.env.example apps/api/.env
# Edita .env con tus credenciales de Supabase
```

### 3. Crear las tablas y datos iniciales

```bash
pnpm db:migrate      # Crea las tablas en Supabase
pnpm db:seed         # Inserta las 13 categorías por defecto
```

### 4. Correr en desarrollo

```bash
pnpm dev             # Levanta API + web simultáneamente
```

---

## Endpoints de la API

| Método | URL | Descripción |
|--------|-----|-------------|
| `GET`    | `/api/transactions` | Listar con filtros y paginación |
| `GET`    | `/api/transactions/dashboard` | Stats del dashboard |
| `GET`    | `/api/transactions/:id` | Obtener una transacción |
| `POST`   | `/api/transactions` | Crear transacción |
| `PATCH`  | `/api/transactions/:id` | Actualizar transacción |
| `DELETE` | `/api/transactions/:id` | Eliminar transacción |

### Ejemplo: crear una transacción

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "uuid-categoria",
    "type": "expense",
    "amount": 45000,
    "description": "Supermercado semana",
    "date": "2026-06-19",
    "paymentMethod": "debit_card"
  }'
```

---

## Despliegue gratuito

| Servicio | Qué despliega | Plan gratuito |
|----------|--------------|---------------|
| **Supabase** | PostgreSQL + Auth | 500 MB, 2 proyectos |
| **Railway** | API Node.js | $5 crédito/mes |
| **Vercel** | Frontend React | Ilimitado para hobby |

```bash
# Railway (API)
npm install -g @railway/cli
railway login && railway up

# Vercel (Web)
npm install -g vercel
cd apps/web && vercel
```
