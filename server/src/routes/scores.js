import { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config.js';

const router = Router();

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toFloat(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const DEVICES = new Set(['desktop', 'mobile']);

function normalizeDevice(value) {
  const device = String(value || '').toLowerCase().trim();
  return DEVICES.has(device) ? device : null;
}

function serializeScore(row, rank) {
  return {
    id: row.id,
    nickname: row.nickname,
    score: row.score,
    hits: row.hits,
    misses: row.misses,
    accuracy: row.accuracy,
    avgReactionMs: row.avgReactionMs,
    bestStreak: row.bestStreak,
    device: row.device || null,
    createdAt: row.createdAt,
    ...(rank != null ? { rank } : {}),
  };
}

async function rankForScore(score) {
  const better = await prisma.score.count({
    where: { score: { gt: score } },
  });
  return better + 1;
}

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const period = req.query.period === 'day' ? 'day' : 'all';
    const device = normalizeDevice(req.query.device);
    const limit = Math.min(Math.max(toInt(req.query.limit, 50), 1), 100);

    const where = {};
    if (period === 'day') {
      where.createdAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }
    if (device) {
      where.device = device;
    }

    const rows = await prisma.score.findMany({
      where,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const scores = rows.map((row, index) => serializeScore(row, index + 1));
    res.json({ period, device: device || 'all', scores });
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

router.get('/scores/rank', async (req, res) => {
  try {
    const score = toInt(req.query.score, -1);
    if (score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const rank = await rankForScore(score);
    res.json({ score, rank });
  } catch (err) {
    console.error('rank error', err);
    res.status(500).json({ error: 'Failed to compute rank' });
  }
});

router.post('/scores', async (req, res) => {
  try {
    const body = req.body || {};
    const nickname = String(body.nickname || '').trim();
    const score = toInt(body.score, -1);
    const hits = toInt(body.hits, -1);
    const misses = toInt(body.misses, -1);
    const accuracy = toFloat(body.accuracy, -1);
    const avgReactionMs =
      body.avgReactionMs == null ? null : toInt(body.avgReactionMs, -1);
    const bestStreak =
      body.bestStreak == null ? null : toInt(body.bestStreak, -1);
    const device = normalizeDevice(body.device);

    if (!NICKNAME_RE.test(nickname)) {
      return res.status(400).json({
        error: 'Nickname must be 3–16 characters (letters, numbers, underscore)',
      });
    }

    if (score < 0 || score > config.maxScore) {
      return res.status(400).json({ error: 'Score out of allowed range' });
    }

    if (hits < 0 || misses < 0 || hits + misses === 0) {
      return res.status(400).json({ error: 'Invalid hits/misses' });
    }

    const expectedAccuracy = (hits / (hits + misses)) * 100;
    if (accuracy < 0 || accuracy > 100 || Math.abs(accuracy - expectedAccuracy) > 1.5) {
      return res.status(400).json({ error: 'Accuracy does not match hits/misses' });
    }

    const maxPlausibleHits = 400;
    if (hits > maxPlausibleHits) {
      return res.status(400).json({ error: 'Hits exceed plausible limit' });
    }

    if (avgReactionMs != null && (avgReactionMs < 50 || avgReactionMs > 5000)) {
      return res.status(400).json({ error: 'Invalid average reaction time' });
    }

    if (bestStreak != null && (bestStreak < 0 || bestStreak > hits)) {
      return res.status(400).json({ error: 'Invalid best streak' });
    }

    if (device === 'desktop') {
      const arenaWidth = toInt(body.arenaWidth, -1);
      const arenaHeight = toInt(body.arenaHeight, -1);
      if (
        arenaWidth !== config.desktopArenaWidth ||
        arenaHeight !== config.desktopArenaHeight
      ) {
        return res.status(400).json({ error: 'Invalid play area size' });
      }
    }

    const row = await prisma.score.create({
      data: {
        nickname,
        score,
        hits,
        misses,
        accuracy: Math.round(accuracy * 100) / 100,
        avgReactionMs,
        bestStreak,
        device,
      },
    });

    const rank = await rankForScore(row.score);
    res.status(201).json(serializeScore(row, rank));
  } catch (err) {
    console.error('submit score error', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

export default router;
