import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import MadeBy from '../components/MadeBy.jsx';
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

function DeviceBadge({ device }) {
  if (device !== 'mobile' && device !== 'desktop') return null;
  const label = device === 'mobile' ? 'Mobile' : 'Desktop';
  return (
    <span className={`device-badge device-${device}`} title={`Played on ${label}`}>
      {device === 'mobile' ? (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <rect x="4" y="1" width="8" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="12.5" r="0.8" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <rect x="1.5" y="2" width="13" height="9" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 13.5h6M8 11v2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
      <span className="device-badge-label">{label}</span>
    </span>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('all');
  const [device, setDevice] = useState('all');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const me = getStoredNickname();

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');
    fetchLeaderboard(period, device, 50)
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
  }, [period, device]);

  return (
    <main className="page leaderboard-page">
      <SiteHeader />

      <div className="panel wide">
        <div className="lb-header">
          <h1 className="panel-title">Leaderboard</h1>
          <div className="lb-filters">
            <div className="period-tabs" role="tablist" aria-label="Time period">
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
            <div className="period-tabs" role="tablist" aria-label="Device">
              <button
                type="button"
                className={device === 'all' ? 'tab active' : 'tab'}
                onClick={() => setDevice('all')}
              >
                All
              </button>
              <button
                type="button"
                className={device === 'desktop' ? 'tab active' : 'tab'}
                onClick={() => setDevice('desktop')}
              >
                Desktop
              </button>
              <button
                type="button"
                className={device === 'mobile' ? 'tab active' : 'tab'}
                onClick={() => setDevice('mobile')}
              >
                Mobile
              </button>
            </div>
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
                            <span className="player-cell">
                              <span className="player-name">
                                {row.nickname}
                                {isMe && <span className="you-badge">you</span>}
                              </span>
                              <DeviceBadge device={row.device} />
                            </span>
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

        <p className="lb-footnote muted">Top 50 · ranks are per selected filter</p>

        <div className="cta-row">
          <Link to="/" className="btn btn-primary">
            Play
          </Link>
        </div>

        <MadeBy />
      </div>
    </main>
  );
}
