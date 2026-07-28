# Aim Ranking

1-minute aim trainer. **Server** and **web** are separate apps — install and run each on its own.

## Server (`server/`)

```bash
cd server
cp .env.example .env
# edit DATABASE_URL and other vars
npm install
npm run dev
```

API: http://localhost:3010  

On start, runs `prisma db push` then the Express API.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL URL (Prisma) |
| `PORT` | no | default `3010` |
| `HOST` | no | default `0.0.0.0` |
| `CORS_ORIGIN` | no | comma-separated origins |
| `MAX_SCORE` | no | anti-cheat ceiling |

```bash
npm run db:push      # sync Prisma schema
npm run db:generate  # regenerate client
npm start            # production-style start
```

## Web (`web/`)

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173  

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | no | API URL (default `http://localhost:3010`; Vite also proxies `/api`) |

```bash
npm run build
npm run preview
```

## How to play

1. Enter a nickname (3–16 chars: letters, numbers, `_`).
2. 3–2–1 countdown, then click targets for 60 seconds.
3. Score is submitted automatically; check the leaderboard.
