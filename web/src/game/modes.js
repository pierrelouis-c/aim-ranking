export const GAME = {
  radiusStart: 30,
  radiusEnd: 13,
  lifeStart: 1500,
  lifeEnd: 620,
  maxTargetsStart: 1,
  maxTargetsEnd: 5,
  moveSpeedStart: 14,
  moveSpeedEnd: 42,
  bonusChance: 0.11,
  bonusChanceLate: 0.18,
  spawnCursorClearance: 90,
};

/** Fixed desktop playfield — same size for every desktop player. */
export const DESKTOP_ARENA = {
  width: 1280,
  height: 720,
};

export function gradeFor(result) {
  const acc = result.accuracy ?? 0;
  const score = result.score ?? 0;
  const streak = result.bestStreak ?? 0;
  if (acc >= 90 && score >= 8000 && streak >= 15) return 'S';
  if (acc >= 80 && score >= 5500) return 'A';
  if (acc >= 65 && score >= 3500) return 'B';
  if (acc >= 45 || score >= 2000) return 'C';
  return 'D';
}

export function reactionLabel(avgMs) {
  if (avgMs == null) return null;
  if (avgMs < 280) return 'Lightning';
  if (avgMs < 380) return 'Sharp';
  if (avgMs < 500) return 'Steady';
  return 'Measured';
}
