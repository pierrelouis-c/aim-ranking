import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredNickname,
  setStoredNickname,
  getPersonalBest,
  fetchTopScores,
} from '../api/client.js';

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const MEDALS = ['gold', 'silver', 'bronze'];

export default function Home() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(getStoredNickname());
  const [error, setError] = useState('');
  const [top, setTop] = useState([]);
  const pb = getPersonalBest();

  useEffect(() => {
    let cancelled = false;
    fetchTopScores(3)
      .then((data) => {
        if (!cancelled) setTop(data.scores || []);
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

        {pb && (
          <p className="pb-line">
            Personal best: <strong>{pb.score}</strong> pts
            {pb.rank != null ? ` · rank #${pb.rank}` : ''}
          </p>
        )}

        {top.length > 0 && (
          <div className="podium">
            <p className="podium-title">Hall of fame</p>
            <ol className="podium-list">
              {top.map((row, i) => (
                <li key={row.id} className="podium-row">
                  <span className={`podium-rank medal-${MEDALS[i]}`}>{i + 1}</span>
                  <span className="podium-name">{row.nickname}</span>
                  <span className="podium-score mono">{row.score}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="feature-cards">
          <div className="feature-card">
            <span className="feature-title">Perfect hits</span>
            <span className="feature-text">Nail the white center for a +40 bonus every time.</span>
          </div>
          <div className="feature-card">
            <span className="feature-title">Moving targets</span>
            <span className="feature-text">They drift and bounce as the round gets harder.</span>
          </div>
          <div className="feature-card">
            <span className="feature-title">Gold targets</span>
            <span className="feature-text">Rare, small, short-lived — worth 2.5x. Don't blink.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
