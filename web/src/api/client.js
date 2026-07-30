const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function detectDevice() {
  if (typeof window === 'undefined') return 'desktop';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchPoints = navigator.maxTouchPoints || 0;
  if (touchPoints > 0 && (coarse || noHover)) return 'mobile';
  return 'desktop';
}

export function fetchLeaderboard(period = 'all', device = 'all', limit = 50) {
  const params = new URLSearchParams({
    period,
    limit: String(limit),
  });
  if (device === 'desktop' || device === 'mobile') {
    params.set('device', device);
  }
  return request(`/api/leaderboard?${params.toString()}`);
}

export function fetchRank(score) {
  return request(`/api/scores/rank?score=${encodeURIComponent(score)}`);
}

export function submitScore(payload) {
  return request('/api/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

const SUBMITTED_ROUNDS_KEY = 'aim_submitted_rounds';

function readSubmittedRounds() {
  try {
    const raw = sessionStorage.getItem(SUBMITTED_ROUNDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasSubmittedRound(roundId) {
  if (!roundId) return false;
  return readSubmittedRounds().includes(roundId);
}

export function markRoundSubmitted(roundId) {
  if (!roundId) return;
  const next = readSubmittedRounds().filter((id) => id !== roundId);
  next.push(roundId);
  // Cap growth in long sessions
  sessionStorage.setItem(SUBMITTED_ROUNDS_KEY, JSON.stringify(next.slice(-50)));
}

export function fetchTopScores(limit = 3) {
  return fetchLeaderboard('all', 'all', limit);
}

export function getStoredNickname() {
  return localStorage.getItem('aim_nickname') || '';
}

export function setStoredNickname(nickname) {
  localStorage.setItem('aim_nickname', nickname);
}

export function getPersonalBest() {
  const raw = localStorage.getItem('aim_personal_best');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function updatePersonalBest(result) {
  const current = getPersonalBest();
  if (!current || result.score > current.score) {
    localStorage.setItem('aim_personal_best', JSON.stringify(result));
    return true;
  }
  return false;
}
