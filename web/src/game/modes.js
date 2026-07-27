export const GAME = {
  radiusStart: 28,
  radiusEnd: 14,
  lifeStart: 1400,
  lifeEnd: 700,
  maxTargetsStart: 1,
  maxTargetsEnd: 5,
  moveSpeed: 18,
  bonusChance: 0.12,
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
