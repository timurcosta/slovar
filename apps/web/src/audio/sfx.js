// Звуковые эффекты (синтез, без файлов).
import { settings } from "../state/settings.js";
import { ac, ensureAC, getAC } from "./context.js";

export function tone(f, d, type = "square", vol = 0.05, slide = 0, delay = 0) {
  if (settings.muted) return;
  try {
    ensureAC();
    if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime + delay,
      o = ac.createOscillator(),
      g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(vol * 1.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  } catch (e) {}
}
let sfxNoise = null;
function noiseSweep(f0, f1, dur, vol, q = 1.2) {
  const c = getAC();
  if (!c) return;
  if (!sfxNoise) {
    sfxNoise = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const d = sfxNoise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain(),
    t = c.currentTime;
  s.buffer = sfxNoise;
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}
export const sfx = {
  whoosh(heavy) {
    noiseSweep(heavy ? 250 : 600, heavy ? 1100 : 3200, heavy ? 0.26 : 0.2, heavy ? 0.35 : 0.28);
  },
  clang() {
    tone(1800, 0.1, "triangle", 0.04);
    tone(2700, 0.08, "triangle", 0.025);
    tone(160, 0.12, "sine", 0.08, 60);
  },
  thud() {
    tone(130, 0.3, "sine", 0.12, 38);
    noiseSweep(400, 150, 0.25, 0.3, 0.7);
  },
  zap() {
    tone(1500, 0.12, "sawtooth", 0.025, 400);
    noiseSweep(3000, 6000, 0.12, 0.12, 0.8);
  },
  saber() {
    const c = getAC();
    if (!c) return;
    const t = c.currentTime;
    const f = c.createBiquadFilter(),
      g = c.createGain();
    f.type = "lowpass";
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(2400, t + 0.12);
    f.frequency.linearRampToValueAtTime(450, t + 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    [0, 3].forEach((det) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(92 + det, t);
      o.frequency.exponentialRampToValueAtTime(175 + det, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(78 + det, t + 0.45);
      o.connect(f);
      o.start(t);
      o.stop(t + 0.52);
    });
    f.connect(g).connect(c.destination);
    const s = c.createOscillator(),
      sg = c.createGain();
    s.type = "sine";
    s.frequency.setValueAtTime(1500, t);
    s.frequency.exponentialRampToValueAtTime(480, t + 0.22);
    sg.gain.setValueAtTime(0.07, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    s.connect(sg).connect(c.destination);
    s.start(t);
    s.stop(t + 0.26);
  },
  hit() {
    tone(520, 0.07);
    tone(780, 0.1, "square", 0.05, 0, 0.06);
  },
  laser() {
    tone(1400, 0.18, "sawtooth", 0.04, 300);
  },
  fire() {
    tone(180, 0.3, "sawtooth", 0.05, 60);
    tone(400, 0.12, "triangle", 0.04, 0, 0.05);
  },
  bolt() {
    tone(90, 0.35, "sawtooth", 0.07, 40);
    tone(1600, 0.08, "square", 0.04, 0, 0.02);
  },
  crit() {
    [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.08, "square", 0.05, 0, i * 0.05));
  },
  block() {
    tone(900, 0.05, "square", 0.05);
    tone(600, 0.12, "triangle", 0.06, 0, 0.05);
  },
  hurt() {
    tone(220, 0.35, "sawtooth", 0.06, 70);
  },
  heal() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.12, "triangle", 0.07, 0, i * 0.08));
  },
  coin() {
    tone(988, 0.06, "square", 0.04);
    tone(1319, 0.12, "square", 0.04, 0, 0.06);
  },
  win() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.14, "square", 0.05, 0, i * 0.1));
  },
  fanfare(big) {
    // ta-ta-ta-taaa, then a held major chord
    [
      [392, 0],
      [392, 0.12],
      [392, 0.24],
      [523, 0.36],
    ].forEach(([f, d]) => {
      tone(f, 0.11, "square", 0.05, 0, d);
      tone(f / 2, 0.11, "triangle", 0.05, 0, d);
    });
    tone(659, 0.22, "square", 0.05, 0, 0.6);
    tone(587, 0.12, "square", 0.045, 0, 0.84);
    tone(659, 0.12, "square", 0.045, 0, 0.98);
    [
      [523, "square", 0.055],
      [659, "triangle", 0.05],
      [784, "triangle", 0.05],
      [262, "triangle", 0.06],
    ].forEach(([f, tp, v]) => tone(f, big ? 1.4 : 0.9, tp, v, 0, 1.12));
    if (big)
      [
        [1047, 1.5],
        [1319, 1.62],
        [1568, 1.74],
        [2093, 1.9],
      ].forEach(([f, d]) => tone(f, 0.25, "square", 0.035, 0, d));
  },
  level() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.13, "square", 0.05, 0, i * 0.08));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, 0, i * 0.18));
  },
};
