import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pingDb, disconnectDb } from './db.js';
import scoresRouter from './routes/scores.js';

const app = express();

const allowedOrigins = new Set(config.corsOrigin);
const allowAll = allowedOrigins.has('*');

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / server-to-server / curl (no Origin header)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowAll || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      // Do NOT throw — throwing makes OPTIONS preflight return 500
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: '32kb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'aim-ranking-api',
    status: 'ok',
    cors: [...allowedOrigins],
  });
});

app.use('/api', scoresRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await pingDb();

  app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`);
    console.log(`CORS allowed: ${[...allowedOrigins].join(', ') || '(none)'}`);
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
