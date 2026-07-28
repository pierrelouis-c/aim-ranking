import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pingDb, disconnectDb } from './db.js';
import scoresRouter from './routes/scores.js';

const app = express();

// Reflect the request Origin — public game API, avoids OPTIONS 500s from strict CORS
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  })
);

// Always answer preflight before other middleware can fail
app.options('*', cors({ origin: true }));

app.use(express.json({ limit: '32kb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'aim-ranking-api',
    status: 'ok',
    version: 2,
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    await pingDb();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

app.use('/api', scoresRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

async function start() {
  await pingDb();

  app.listen(config.port, config.host, () => {
    console.log(`aim-ranking-api listening on http://${config.host}:${config.port}`);
  });
}

async function shutdown() {
  await disconnectDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
