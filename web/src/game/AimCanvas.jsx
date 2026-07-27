import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sfx, isMuted, setMuted } from './sound.js';
import { GAME } from './modes.js';

const ROUND_MS = 60_000;
const COUNTDOWN_MS = 3_000;
const GO_FLASH_MS = 600;
const LOW_TIME_MS = 10_000;
const END_FLASH_MS = 900;
const STREAK_MILESTONES = [5, 10, 15, 20, 25];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function difficultyAt(elapsedMs) {
  const t = clamp(elapsedMs / ROUND_MS, 0, 1);
  const radius = lerp(GAME.radiusStart, GAME.radiusEnd, t);
  const lifetime = lerp(GAME.lifeStart, GAME.lifeEnd, t);
  const maxTargets = Math.round(lerp(GAME.maxTargetsStart, GAME.maxTargetsEnd, t));
  return { radius, lifetime, maxTargets };
}

function overlaps(x, y, r, targets) {
  for (const t of targets) {
    const dx = x - t.x;
    const dy = y - t.y;
    const minDist = r + t.radius + 10;
    if (dx * dx + dy * dy < minDist * minDist) return true;
  }
  return false;
}

function spawnTarget(width, height, radius, lifetime, now, existing) {
  const isBonus = Math.random() < GAME.bonusChance;
  const r = isBonus ? radius * 0.65 : radius;
  const pad = r + 10;
  const maxAttempts = 18;
  let x = pad + Math.random() * Math.max(1, width - pad * 2);
  let y = pad + Math.random() * Math.max(1, height - pad * 2);

  for (let i = 0; i < maxAttempts; i += 1) {
    x = pad + Math.random() * Math.max(1, width - pad * 2);
    y = pad + Math.random() * Math.max(1, height - pad * 2);
    if (y < 72) continue;
    if (!overlaps(x, y, r, existing)) break;
  }

  const angle = Math.random() * Math.PI * 2;
  const speed = GAME.moveSpeed * (0.55 + Math.random() * 0.9) * (isBonus ? 1.35 : 1);
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: r,
    bornAt: now,
    lifetime: isBonus ? lifetime * 0.72 : lifetime,
    isBonus,
  };
}

function spawnParticles(x, y, now, color, count = 12) {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 60 + Math.random() * 200;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bornAt: now,
      ttl: 320 + Math.random() * 280,
      size: 1.5 + Math.random() * 2.8,
      color,
    });
  }
  return particles;
}

/**
 * @param {{ nickname: string, onFinish: (result: object) => void }} props
 */
export default function AimCanvas({ nickname, onFinish }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);

  const [muted, setMutedState] = useState(isMuted());
  const [hud, setHud] = useState({
    phase: 'countdown',
    countdown: 3,
    timeLeft: 60,
    score: 0,
    hits: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    milestone: null,
  });

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m);
      return !m;
    });
  }, []);

  const finishOnce = useCallback(
    (result) => {
      if (stateRef.current?.done) return;
      if (stateRef.current) stateRef.current.done = true;
      onFinish(result);
    },
    [onFinish]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        return;
      }
      if (e.key === 'Escape') {
        const s = stateRef.current;
        if (!s || s.done) return;
        if (s.phase === 'countdown') {
          s.done = true;
          navigate('/', { replace: true });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, toggleMute]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stateRef.current) {
        stateRef.current.width = w;
        stateRef.current.height = h;
      }
    }

    const now = performance.now();
    lastFrameRef.current = now;
    stateRef.current = {
      phase: 'countdown',
      startedAt: now,
      roundStartedAt: null,
      endedAt: null,
      width: 0,
      height: 0,
      targets: [],
      particles: [],
      popups: [],
      missRings: [],
      score: 0,
      hits: 0,
      misses: 0,
      streak: 0,
      bestStreak: 0,
      bonusHits: 0,
      perfectHits: 0,
      reactions: [],
      lastTick: 4,
      lastMissAt: -1000,
      hitFlashUntil: 0,
      done: false,
      lastHudAt: 0,
      milestoneUntil: 0,
      milestoneText: null,
    };

    resize();
    window.addEventListener('resize', resize);

    function finish() {
      const s = stateRef.current;
      if (!s || s.done) return;
      const totalShots = s.hits + s.misses;
      const accuracy = totalShots === 0 ? 0 : (s.hits / totalShots) * 100;
      const avgReactionMs =
        s.reactions.length === 0
          ? null
          : Math.round(s.reactions.reduce((a, b) => a + b, 0) / s.reactions.length);

      finishOnce({
        nickname,
        score: s.score,
        hits: s.hits,
        misses: s.misses,
        accuracy: Math.round(accuracy * 100) / 100,
        avgReactionMs,
        bestStreak: s.bestStreak,
        bonusHits: s.bonusHits,
        perfectHits: s.perfectHits,
      });
    }

    function onPointer(e) {
      const s = stateRef.current;
      if (!s || s.phase !== 'playing' || s.done) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nowTs = performance.now();

      let hitIndex = -1;
      for (let i = s.targets.length - 1; i >= 0; i -= 1) {
        const t = s.targets[i];
        const dx = x - t.x;
        const dy = y - t.y;
        if (dx * dx + dy * dy <= t.radius * t.radius) {
          hitIndex = i;
          break;
        }
      }

      if (hitIndex >= 0) {
        const t = s.targets[hitIndex];
        const dx = x - t.x;
        const dy = y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isPerfect = dist <= t.radius * 0.32;

        const reaction = nowTs - t.bornAt;
        s.reactions.push(reaction);
        s.streak += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        if (t.isBonus) s.bonusHits += 1;
        if (isPerfect) s.perfectHits += 1;

        const speedBonus = Math.max(0, Math.round((900 - reaction) / 18));
        const sizeBonus = Math.round((30 - t.radius) * 2);
        const streakBonus = Math.min(s.streak * 3, 75);
        const perfectBonus = isPerfect ? 40 : 0;
        const base = t.isBonus ? 250 : 100;
        const points = base + speedBonus + sizeBonus + streakBonus + perfectBonus;
        s.score += points;
        s.hits += 1;
        s.targets.splice(hitIndex, 1);
        s.hitFlashUntil = nowTs + 80;

        const color = t.isBonus ? '255, 209, 102' : isPerfect ? '167, 243, 208' : '94, 234, 212';
        s.particles.push(...spawnParticles(t.x, t.y, nowTs, color, t.isBonus || isPerfect ? 16 : 11));

        let text = `+${points}`;
        if (isPerfect) text = `PERFECT +${points}`;
        else if (t.isBonus) text = `GOLD +${points}`;
        s.popups.push({
          x: t.x,
          y: t.y - t.radius - 4,
          text,
          bornAt: nowTs,
          color,
          big: isPerfect || t.isBonus,
        });

        if (STREAK_MILESTONES.includes(s.streak)) {
          s.milestoneText = `STREAK x${s.streak}`;
          s.milestoneUntil = nowTs + 900;
          sfx.streak(s.streak);
        }

        if (t.isBonus) sfx.bonus();
        else if (isPerfect) sfx.perfect();
        else sfx.hit(s.streak);
      } else {
        s.misses += 1;
        s.streak = 0;
        s.score = Math.max(0, s.score - 15);
        s.missRings.push({ x, y, bornAt: nowTs });
        s.lastMissAt = nowTs;
        sfx.miss();
      }
    }

    canvas.addEventListener('pointerdown', onPointer);

    function drawEffects(s, nowTs) {
      s.particles = s.particles.filter((p) => nowTs - p.bornAt < p.ttl);
      for (const p of s.particles) {
        const age = (nowTs - p.bornAt) / p.ttl;
        const px = p.x + (p.vx * (nowTs - p.bornAt)) / 1000;
        const py = p.y + (p.vy * (nowTs - p.bornAt)) / 1000;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color}, ${1 - age})`;
        ctx.arc(px, py, p.size * (1 - age * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      s.popups = s.popups.filter((p) => nowTs - p.bornAt < 750);
      for (const p of s.popups) {
        const age = (nowTs - p.bornAt) / 750;
        ctx.font = p.big
          ? '700 20px "IBM Plex Sans", sans-serif'
          : '600 17px "IBM Plex Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgba(${p.color}, ${1 - age})`;
        ctx.fillText(p.text, p.x, p.y - age * 32);
      }

      s.missRings = s.missRings.filter((r) => nowTs - r.bornAt < 350);
      for (const r of s.missRings) {
        const age = (nowTs - r.bornAt) / 350;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 90, 70, ${0.7 * (1 - age)})`;
        ctx.lineWidth = 2;
        ctx.arc(r.x, r.y, 6 + age * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawTarget(t, nowTs) {
      const age = (nowTs - t.bornAt) / t.lifetime;
      const pulse = 1 + Math.sin(nowTs / 90 + t.x) * 0.04;
      const r = t.radius * pulse;
      const alpha = 1 - age * 0.35;

      if (t.isBonus) {
        ctx.beginPath();
        ctx.shadowColor = 'rgba(255, 209, 102, 0.55)';
        ctx.shadowBlur = 18;
      }

      const grad = ctx.createRadialGradient(t.x, t.y, r * 0.15, t.x, t.y, r);
      if (t.isBonus) {
        grad.addColorStop(0, `rgba(255, 250, 220, ${alpha})`);
        grad.addColorStop(0.35, `rgba(255, 209, 102, ${alpha})`);
        grad.addColorStop(1, `rgba(200, 140, 20, ${alpha * 0.2})`);
      } else {
        grad.addColorStop(0, `rgba(255, 240, 210, ${alpha})`);
        grad.addColorStop(0.35, `rgba(255, 90, 70, ${alpha})`);
        grad.addColorStop(1, `rgba(180, 20, 50, ${alpha * 0.15})`);
      }
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.strokeStyle = t.isBonus
        ? `rgba(255, 230, 160, ${0.7 * alpha})`
        : `rgba(94, 234, 212, ${0.55 * alpha})`;
      ctx.lineWidth = 2;
      ctx.arc(t.x, t.y, r * 0.38, 0, Math.PI * 2);
      ctx.stroke();

      // Perfect zone hint
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha})`;
      ctx.arc(t.x, t.y, Math.max(2, r * 0.12), 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = t.isBonus
        ? `rgba(255, 209, 102, ${0.6 * alpha})`
        : `rgba(255, 255, 255, ${0.35 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.arc(t.x, t.y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - age));
      ctx.stroke();
    }

    function frame(nowTs) {
      const s = stateRef.current;
      if (!s || s.done) return;

      const dt = Math.min(0.05, (nowTs - lastFrameRef.current) / 1000);
      lastFrameRef.current = nowTs;

      const { width, height } = s;

      ctx.save();
      const sinceMiss = nowTs - s.lastMissAt;
      if (sinceMiss < 150) {
        const power = (1 - sinceMiss / 150) * 5;
        ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
      }

      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, '#0b1220');
      g.addColorStop(0.55, '#101a2e');
      g.addColorStop(1, '#0a1628');
      ctx.fillStyle = g;
      ctx.fillRect(-8, -8, width + 16, height + 16);

      // Soft hit flash
      if (nowTs < s.hitFlashUntil) {
        ctx.fillStyle = 'rgba(94, 234, 212, 0.05)';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.strokeStyle = 'rgba(80, 200, 220, 0.06)';
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (s.phase === 'countdown') {
        const elapsed = nowTs - s.startedAt;
        const left = Math.ceil((COUNTDOWN_MS - elapsed) / 1000);
        if (left < s.lastTick && left >= 1) {
          s.lastTick = left;
          sfx.tick();
        }
        if (elapsed >= COUNTDOWN_MS) {
          s.phase = 'playing';
          s.roundStartedAt = nowTs;
          sfx.go();
          setHud({
            phase: 'playing',
            countdown: 0,
            timeLeft: 60,
            score: 0,
            hits: 0,
            misses: 0,
            streak: 0,
            bestStreak: 0,
            milestone: null,
          });
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(0, 0, width, height);
          const frac = (elapsed % 1000) / 1000;
          const scale = 1 + frac * 0.25;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.globalAlpha = 1 - frac * 0.6;
          ctx.fillStyle = '#5eead4';
          ctx.font = 'bold 120px "Bebas Neue", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(Math.max(1, left)), 0, 0);
          ctx.restore();
          if (nowTs - s.lastHudAt > 80) {
            s.lastHudAt = nowTs;
            setHud((h) => ({ ...h, phase: 'countdown', countdown: Math.max(1, left) }));
          }
        }
      } else if (s.phase === 'playing') {
        const elapsed = nowTs - s.roundStartedAt;
        const remaining = Math.max(0, ROUND_MS - elapsed);
        const { radius, lifetime, maxTargets } = difficultyAt(elapsed);

        const kept = [];
        for (const t of s.targets) {
          if (nowTs - t.bornAt > t.lifetime) {
            s.misses += 1;
            s.streak = 0;
          } else {
            // Move + bounce off edges
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (t.x < t.radius + 4) {
              t.x = t.radius + 4;
              t.vx = Math.abs(t.vx);
            } else if (t.x > width - t.radius - 4) {
              t.x = width - t.radius - 4;
              t.vx = -Math.abs(t.vx);
            }
            if (t.y < t.radius + 64) {
              t.y = t.radius + 64;
              t.vy = Math.abs(t.vy);
            } else if (t.y > height - t.radius - 10) {
              t.y = height - t.radius - 10;
              t.vy = -Math.abs(t.vy);
            }
            kept.push(t);
          }
        }
        s.targets = kept;

        while (s.targets.length < maxTargets) {
          s.targets.push(spawnTarget(width, height, radius, lifetime, nowTs, s.targets));
        }

        for (const t of s.targets) drawTarget(t, nowTs);
        drawEffects(s, nowTs);

        if (elapsed < GO_FLASH_MS) {
          const a = 1 - elapsed / GO_FLASH_MS;
          ctx.fillStyle = `rgba(94, 234, 212, ${a})`;
          ctx.font = 'bold 96px "Bebas Neue", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('GO!', width / 2, height / 2);
        }

        if (nowTs < s.milestoneUntil && s.milestoneText) {
          const a = Math.min(1, (s.milestoneUntil - nowTs) / 900);
          ctx.fillStyle = `rgba(255, 209, 102, ${a})`;
          ctx.font = 'bold 42px "Bebas Neue", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(s.milestoneText, width / 2, height * 0.22);
        }

        if (remaining <= LOW_TIME_MS) {
          const urgency = 1 - remaining / LOW_TIME_MS;
          const pulse = 0.5 + Math.sin(nowTs / 150) * 0.5;
          const vg = ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(width, height) * 0.35,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.75
          );
          vg.addColorStop(0, 'rgba(255, 60, 40, 0)');
          vg.addColorStop(1, `rgba(255, 60, 40, ${0.18 * urgency * (0.6 + pulse * 0.4)})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, width, height);
        }

        const frac = remaining / ROUND_MS;
        const barColor =
          remaining <= LOW_TIME_MS ? 'rgba(255, 90, 70, 0.9)' : 'rgba(94, 234, 212, 0.8)';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, height - 4, width, 4);
        ctx.fillStyle = barColor;
        ctx.fillRect(0, height - 4, width * frac, 4);

        if (nowTs - s.lastHudAt > 50) {
          s.lastHudAt = nowTs;
          setHud({
            phase: 'playing',
            countdown: 0,
            timeLeft: Math.ceil(remaining / 1000),
            score: s.score,
            hits: s.hits,
            misses: s.misses,
            streak: s.streak,
            bestStreak: s.bestStreak,
            milestone: nowTs < s.milestoneUntil ? s.milestoneText : null,
          });
        }

        if (remaining <= 0) {
          s.phase = 'ended';
          s.endedAt = nowTs;
          s.targets = [];
          sfx.end();
        }
      } else if (s.phase === 'ended') {
        const sinceEnd = nowTs - s.endedAt;
        drawEffects(s, nowTs);

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, width, height);
        const a = Math.min(1, sinceEnd / 200);
        ctx.fillStyle = `rgba(255, 90, 70, ${a})`;
        ctx.font = 'bold 88px "Bebas Neue", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("TIME'S UP", width / 2, height / 2 - 20);
        ctx.fillStyle = `rgba(232, 238, 248, ${a * 0.9})`;
        ctx.font = '600 26px "IBM Plex Sans", sans-serif';
        ctx.fillText(`${s.score} pts`, width / 2, height / 2 + 42);

        if (sinceEnd >= END_FLASH_MS) {
          ctx.restore();
          finish();
          return;
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [nickname, finishOnce]);

  const accuracy =
    hud.hits + hud.misses === 0
      ? 100
      : Math.round((hud.hits / (hud.hits + hud.misses)) * 1000) / 10;

  return (
    <div className="arena">
      <header className="arena-hud">
        <div className="hud-block">
          <span className="hud-label">Player</span>
          <span className="hud-value">{nickname}</span>
        </div>
        <div className="hud-block">
          <span className="hud-label">Time</span>
          <span
            className={`hud-value mono ${
              hud.phase === 'playing' && hud.timeLeft <= 10 ? 'hud-danger' : ''
            }`}
          >
            {hud.phase === 'countdown' ? '—' : `${hud.timeLeft}s`}
          </span>
        </div>
        <div className="hud-block">
          <span className="hud-label">Score</span>
          <span className="hud-value mono">{hud.score}</span>
        </div>
        <div className="hud-block">
          <span className="hud-label">Acc</span>
          <span className="hud-value mono">{accuracy}%</span>
        </div>
        <div className="hud-block">
          <span className="hud-label">Streak</span>
          <span className={`hud-value mono ${hud.streak >= 5 ? 'hud-hot' : ''}`}>
            {hud.streak > 0 ? `x${hud.streak}` : '—'}
          </span>
        </div>
        <button
          type="button"
          className="mute-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          title="Toggle mute (M)"
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </header>
      <canvas ref={canvasRef} className="aim-canvas" />
      {hud.phase === 'countdown' && (
        <div className="countdown-hint">Get ready · Esc to cancel · M mute</div>
      )}
    </div>
  );
}
