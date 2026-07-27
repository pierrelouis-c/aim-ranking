import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pingDb, disconnectDb } from './db.js';
import scoresRouter from './routes/scores.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigin.includes(origin) || config.corsOrigin.includes('*')) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: '32kb' }));

app.get('/', (_req, res) => {
  res.json({ name: 'aim-ranking-api', status: 'ok' });
});

app.use('/api', scoresRouter);

app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await pingDb();

  app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`);
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
