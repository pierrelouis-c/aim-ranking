// Tiny WebAudio synth — no audio assets needed.
let ctx = null;

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return localStorage.getItem('aim_muted') === '1';
}

export function setMuted(muted) {
  localStorage.setItem('aim_muted', muted ? '1' : '0');
}

function blip({ freq = 440, endFreq, duration = 0.08, type = 'sine', gain = 0.12, when = 0 }) {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;

  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);

  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  hit(streak = 1) {
    const base = 520 + Math.min(streak, 12) * 45;
    blip({ freq: base, endFreq: base * 1.6, duration: 0.09, type: 'triangle', gain: 0.14 });
  },
  perfect() {
    blip({ freq: 980, endFreq: 1560, duration: 0.1, type: 'sine', gain: 0.12 });
    blip({ freq: 1460, endFreq: 2100, duration: 0.1, type: 'triangle', gain: 0.08, when: 0.04 });
  },
  bonus() {
    blip({ freq: 880, endFreq: 1760, duration: 0.14, type: 'triangle', gain: 0.16 });
    blip({ freq: 1320, endFreq: 2200, duration: 0.12, type: 'sine', gain: 0.1, when: 0.05 });
  },
  streak(n) {
    blip({ freq: 440 + n * 30, endFreq: 880 + n * 20, duration: 0.18, type: 'square', gain: 0.09 });
    blip({ freq: 660 + n * 20, endFreq: 1320, duration: 0.16, type: 'triangle', gain: 0.08, when: 0.06 });
  },
  miss() {
    blip({ freq: 180, endFreq: 70, duration: 0.16, type: 'sawtooth', gain: 0.1 });
  },
  tick() {
    blip({ freq: 700, duration: 0.05, type: 'square', gain: 0.07 });
  },
  go() {
    blip({ freq: 620, endFreq: 1240, duration: 0.22, type: 'triangle', gain: 0.16 });
  },
  end() {
    blip({ freq: 520, endFreq: 260, duration: 0.35, type: 'triangle', gain: 0.14 });
    blip({ freq: 390, endFreq: 195, duration: 0.4, type: 'triangle', gain: 0.1, when: 0.12 });
  },
};
