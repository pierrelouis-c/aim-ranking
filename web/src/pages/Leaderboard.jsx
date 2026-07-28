import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import { fetchLeaderboard, getStoredNickname } from '../api/client.js';

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('all');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const me = getStoredNickname();

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');
    fetchLeaderboard(period, 50)
      .then((data) => {
        if (cancelled) return;
        setScores(data.scores || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load leaderboard');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <main className="page leaderboard-page">
      <SiteHeader />

      <div className="panel wide">
        <div className="lb-header">
          <h1 className="panel-title">Leaderboard</h1>
          <div className="period-tabs" role="tablist">
            <button
              type="button"
              className={period === 'all' ? 'tab active' : 'tab'}
              onClick={() => setPeriod('all')}
            >
              All time
            </button>
            <button
              type="button"
              className={period === 'day' ? 'tab active' : 'tab'}
              onClick={() => setPeriod('day')}
            >
              Last 24h
            </button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        {!loading && !error && scores.length === 0 && (
          <p className="muted">No scores yet. Be the first.</p>
        )}

        {(loading || scores.length > 0) && !error && (
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Acc</th>
                  <th>Hits</th>
                  <th>Streak</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="skeleton-row">
                        {Array.from({ length: 7 }, (_, j) => (
                          <td key={j}>
                            <span className="skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : scores.map((row) => {
                      const medal = MEDALS[row.rank];
                      const isMe = me && row.nickname === me;
                      return (
                        <tr key={row.id} className={isMe ? 'row-me' : ''}>
                          <td className={`mono rank-cell ${medal ? `medal-${medal}` : ''}`}>
                            {row.rank}
                          </td>
                          <td>
                            {row.nickname}
                            {isMe && <span className="you-badge">you</span>}
                          </td>
                          <td className="mono strong">{row.score}</td>
                          <td className="mono">{Number(row.accuracy).toFixed(1)}%</td>
                          <td className="mono">{row.hits}</td>
                          <td className="mono">
                            {row.bestStreak != null ? `x${row.bestStreak}` : '—'}
                          </td>
                          <td className="muted">{formatDate(row.createdAt)}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        <p className="lb-footnote muted">Top 50</p>

        <div className="cta-row">
          <Link to="/" className="btn btn-primary">
            Play
          </Link>
        </div>
      </div>
    </main>
  );
}
