import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import MadeBy from '../components/MadeBy.jsx';
import { detectDevice, submitScore, updatePersonalBest } from '../api/client.js';
import { gradeFor, reactionLabel } from '../game/modes.js';

const submittedKeys = new Set();

function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  const [status, setStatus] = useState('idle');
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [isNewPb, setIsNewPb] = useState(false);
  const [copied, setCopied] = useState(false);

  const grade = result ? gradeFor(result) : 'D';
  const reactTag = result ? reactionLabel(result.avgReactionMs) : null;
  const animatedScore = useCountUp(result?.score ?? 0, Boolean(result), 1000);

  function copyScore() {
    const rankText = saved?.rank != null ? ` (global rank #${saved.rank})` : '';
    const text = `I scored ${result.score} pts [${grade}] on AIM RANKING${rankText} — ${result.accuracy}% accuracy, best streak x${result.bestStreak ?? 0}. Beat me!`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    if (!result) return undefined;

    const key = `${result.nickname}-${result.score}-${result.hits}-${result.misses}-${result.avgReactionMs}`;
    if (submittedKeys.has(key)) return undefined;
    submittedKeys.add(key);

    setStatus('saving');

    submitScore({
      nickname: result.nickname,
      score: result.score,
      hits: result.hits,
      misses: result.misses,
      accuracy: result.accuracy,
      avgReactionMs: result.avgReactionMs,
      bestStreak: result.bestStreak,
      device: detectDevice(),
      arenaWidth: result.arenaWidth,
      arenaHeight: result.arenaHeight,
    })
      .then((data) => {
        setSaved(data);
        setIsNewPb(updatePersonalBest({ ...result, rank: data.rank }));
        setStatus('done');
      })
      .catch((err) => {
        submittedKeys.delete(key);
        setError(err.message || 'Could not save score');
        updatePersonalBest(result);
        setStatus('error');
      });

    return undefined;
  }, [result]);

  if (!result) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="page result-page">
      <SiteHeader />
      <div className="panel">
        <div className="result-top">
          <div>
            <h1 className="panel-title">Round over</h1>
            <p className="panel-sub">
              Nice run, <strong>{result.nickname}</strong>
              {isNewPb ? ' — new personal best!' : '.'}
            </p>
          </div>
          <div className={`grade-badge grade-${grade.toLowerCase()}`} title="Performance grade">
            {grade}
          </div>
        </div>

        <div className="score-hero">
          <span className="score-hero-value">{animatedScore}</span>
          <span className="score-hero-rank">
            {status === 'saving' && 'Ranking…'}
            {status === 'done' && saved?.rank != null && `Global rank #${saved.rank}`}
            {status === 'error' && 'Not ranked (save failed)'}
          </span>
          {reactTag && (
            <span className="score-hero-react" title="Average reaction style">
              {reactTag} reactions
            </span>
          )}
        </div>

        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Hits</span>
            <span className="stat-value">{result.hits}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Misses</span>
            <span className="stat-value">{result.misses}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{result.accuracy}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Avg react</span>
            <span className="stat-value">
              {result.avgReactionMs != null ? `${result.avgReactionMs} ms` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Best streak</span>
            <span className="stat-value">
              {result.bestStreak != null ? `x${result.bestStreak}` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Perfects</span>
            <span className="stat-value">{result.perfectHits ?? 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Gold hits</span>
            <span className="stat-value">{result.bonusHits ?? 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Expired</span>
            <span className="stat-value">{result.expired ?? 0}</span>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/play', { state: { nickname: result.nickname } })}
          >
            Play again
          </button>
          <Link to="/leaderboard" className="btn btn-ghost">
            Leaderboard
          </Link>
          <button type="button" className="btn btn-ghost" onClick={copyScore}>
            {copied ? 'Copied!' : 'Copy score'}
          </button>
        </div>

        <MadeBy />
      </div>
    </main>
  );
}
