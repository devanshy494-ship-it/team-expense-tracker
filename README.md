# ExpenseIQ — Full Stack Expense Tracker

React + Vite frontend · Express + JWT backend · Neon PostgreSQL · Railway deployment

---

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 18, Vite, React Router, Recharts    |
| Backend  | Node.js, Express, JWT, bcryptjs, Helmet   |
| Database | Neon (PostgreSQL, free, unlimited projects)|
| Auth     | JWT access tokens (15m) + refresh tokens (7d) with rotation |
| Deploy   | Vercel (frontend) · Railway (backend)     |

---

## Security Features

- JWT access token (15 min) + refresh token (7 days, rotated on use)
- All refresh tokens stored in DB — can be individually revoked
- Passwords hashed with bcrypt (cost factor 12)
- Timing-safe login (always runs bcrypt even for unknown emails)
- Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting: 10 auth attempts / 15 min, 200 req / 15 min global
- Input validation on every endpoint (express-validator)
- CORS restricted to your frontend origin
- Request body size capped at 10kb
- SQL injection prevention via parameterized queries
- Password strength enforced: 8+ chars, upper, lower, digit, symbol

---

## Local Setup

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env        # Fill in your values
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 2. Get a free Neon database

1. Go to https://neon.tech → Sign up (free, unlimited projects)
2. Create a new project
3. Copy the connection string → paste into `backend/.env` as `DATABASE_URL`
4. The backend auto-creates all tables on first run

### 3. Generate JWT secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice — one for `JWT_ACCESS_SECRET`, one for `JWT_REFRESH_SECRET`

---

## Deploy to Railway (backend)

1. Push your code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select the `backend` folder
4. Add environment variables (same as `.env`)
5. Railway gives you a public URL — copy it

## Deploy to Vercel (frontend)

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL=https://your-railway-url.railway.app`
4. Update `backend/.env`: `CLIENT_ORIGIN=https://your-vercel-url.vercel.app`

---

## API Reference

### Auth
| Method | Route              | Auth | Description          |
|--------|--------------------|------|----------------------|
| POST   | /api/auth/register | —    | Register             |
| POST   | /api/auth/login    | —    | Login                |
| POST   | /api/auth/refresh  | —    | Rotate tokens        |
| POST   | /api/auth/logout   | —    | Revoke refresh token |
| POST   | /api/auth/logout-all | ✓  | Revoke all sessions  |
| GET    | /api/auth/me       | ✓    | Get current user     |

### Expenses
| Method | Route                   | Auth | Description        |
|--------|-------------------------|------|--------------------|
| GET    | /api/expenses           | ✓    | List (filter: month, category) |
| POST   | /api/expenses           | ✓    | Add expense        |
| PUT    | /api/expenses/:id       | ✓    | Edit expense       |
| DELETE | /api/expenses/:id       | ✓    | Delete expense     |
| GET    | /api/expenses/stats     | ✓    | Summary + charts   |
| GET    | /api/expenses/export    | ✓    | Download CSV       |

### Budgets
| Method | Route              | Auth | Description        |
|--------|--------------------|------|--------------------|
| GET    | /api/budgets       | ✓    | Get budgets        |
| POST   | /api/budgets       | ✓    | Set/update budget  |
| DELETE | /api/budgets/:id   | ✓    | Delete budget      |

---

## Features

- ✅ JWT auth with token rotation and revocation
- ✅ Register / Login with password strength meter
- ✅ Dark / Light mode toggle (persisted)
- ✅ Live clock with real-time date + time
- ✅ Add, Edit, Delete expenses
- ✅ Per-category color coding
- ✅ Monthly filter + search + sort
- ✅ Category breakdown with budget markers
- ✅ Budget limits per category with over-budget alerts
- ✅ Last 6 months bar chart
- ✅ CSV export
- ✅ Responsive layout
- ✅ Sign out from all devices
