import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredNickname,
  setStoredNickname,
  fetchTopScores,
  fetchStats,
} from '../api/client.js';
import MadeBy from '../components/MadeBy.jsx';

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const MEDALS = ['gold', 'silver', 'bronze'];

function formatGames(n) {
  return new Intl.NumberFormat().format(n);
}

function Podium({ title, scores }) {
  if (!scores.length) return null;
  return (
    <div className="podium">
      <h2 className="podium-title">{title}</h2>
      <ol className="podium-list">
        {scores.map((row, i) => (
          <li key={row.id} className="podium-row">
            <span className={`podium-rank medal-${MEDALS[i]}`}>{i + 1}</span>
            <span className="podium-name">{row.nickname}</span>
            <span className="podium-score mono">{row.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(getStoredNickname());
  const [error, setError] = useState('');
  const [topDesktop, setTopDesktop] = useState([]);
  const [topMobile, setTopMobile] = useState([]);
  const [totalGames, setTotalGames] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchTopScores(3, 'desktop'),
      fetchTopScores(3, 'mobile'),
      fetchStats(),
    ])
      .then(([desktop, mobile, stats]) => {
        if (cancelled) return;
        setTopDesktop(desktop.scores || []);
        setTopMobile(mobile.scores || []);
        setTotalGames(typeof stats.totalGames === 'number' ? stats.totalGames : 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function start(e) {
    e.preventDefault();
    const name = nickname.trim();
    if (!NICKNAME_RE.test(name)) {
      setError('Use 3–16 letters, numbers, or underscore.');
      return;
    }
    setStoredNickname(name);
    navigate('/play', { state: { nickname: name } });
  }

  const showHall = topDesktop.length > 0 || topMobile.length > 0;

  return (
    <main className="page home-page">
      <div className="home-atmosphere" aria-hidden="true" />
      <div className="home-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <div className="home-content">
        <p className="brand-mark">AIM RANKING</p>
        <h1 className="home-tagline">One minute. Pure aim.</h1>
        <p className="home-sub">
          Hit the center. Chain streaks. Chase gold targets before they fade.
        </p>

        {totalGames != null && (
          <p className="games-counter">
            <span className="games-counter-value mono">{formatGames(totalGames)}</span>
            <span className="games-counter-label">
              {totalGames === 1 ? 'game played' : 'games played'}
            </span>
          </p>
        )}

        <form className="start-form" onSubmit={start}>
          <label htmlFor="nickname" className="sr-only">
            Nickname
          </label>
          <input
            id="nickname"
            className="nick-input"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError('');
            }}
            placeholder="Your nickname"
            maxLength={16}
            autoComplete="username"
            autoFocus
          />

          {error && <p className="form-error">{error}</p>}
          <div className="cta-row">
            <button type="submit" className="btn btn-primary btn-lg">
              Play 60s
            </button>
            <Link to="/leaderboard" className="btn btn-ghost">
              Leaderboard
            </Link>
          </div>
        </form>

        {showHall && (
          <div className="podium-grid">
            <Podium title="Hall of fame · Desktop" scores={topDesktop} />
            <Podium title="Hall of fame · Mobile" scores={topMobile} />
          </div>
        )}

        <div className="feature-cards">
          <div className="feature-card">
            <h2 className="feature-title">Perfect hits</h2>
            <p className="feature-text">Nail the white center for a +40 bonus every time.</p>
          </div>
          <div className="feature-card">
            <h2 className="feature-title">Streak multiplier</h2>
            <p className="feature-text">Chain hits to stack combo — a bad click resets it, fading targets don't.</p>
          </div>
          <div className="feature-card">
            <h2 className="feature-title">Gold targets</h2>
            <p className="feature-text">Rare, small, short-lived — worth 2.5x. Don't blink.</p>
          </div>
        </div>

        <MadeBy />
      </div>
    </main>
  );
}
