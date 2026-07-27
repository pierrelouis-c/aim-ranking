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

export function fetchLeaderboard(period = 'all', limit = 50) {
  return request(`/api/leaderboard?period=${encodeURIComponent(period)}&limit=${limit}`);
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

export function fetchTopScores(limit = 3) {
  return fetchLeaderboard('all', limit);
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
