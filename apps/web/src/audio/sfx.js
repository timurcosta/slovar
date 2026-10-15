// Звуковые эффекты (синтез, без файлов).
import { settings } from "../state/settings.ts";
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
export function noiseSweep(f0, f1, dur, vol, q = 1.2) {
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
  s.loop = true; // буфер 0,5 с, а взрыв звучит дольше
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
  /** Записка от Ралины: шелест бумаги и «дзынь». */
  note() {
    noiseSweep(1800, 5200, 0.16, 0.05, 0.6);
    noiseSweep(4200, 1600, 0.2, 0.04, 0.6);
    tone(1568, 0.35, "triangle", 0.035, 0, 0.22);
    tone(2093, 0.45, "triangle", 0.03, 0, 0.32);
  },
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
  // ---- дальнобойное оружие ----
  pew(i = 0) {
    tone(1500 - (i % 3) * 140, 0.09, "square", 0.03, 260);
    noiseSweep(5200, 2400, 0.05, 0.08, 1);
  },
  charge(ms, hi = 2400) {
    tone(240, ms / 1000, "sine", 0.04, hi);
    tone(480, ms / 1000, "triangle", 0.018, hi * 1.3);
  },
  railShot() {
    tone(3200, 0.14, "square", 0.035, 180);
    noiseSweep(7000, 1500, 0.18, 0.3, 0.8);
    tone(1900, 0.55, "sine", 0.028, 700, 0.04); // звенящий хвост
  },
  rocketLaunch() {
    noiseSweep(500, 3200, 0.5, 0.32, 0.8);
    tone(90, 0.4, "sawtooth", 0.025, 170);
  },
  boom(big) {
    tone(big ? 110 : 150, big ? 0.7 : 0.45, "sine", 0.12, 28);
    noiseSweep(1400, 90, big ? 0.8 : 0.5, big ? 0.45 : 0.32, 0.6);
    if (big) tone(55, 0.9, "triangle", 0.07, 30, 0.03);
  },
  thunder() {
    noiseSweep(3200, 180, 0.5, 0.42, 0.5);
    tone(70, 0.6, "sawtooth", 0.035, 35, 0.03);
  },
  fireball() {
    noiseSweep(300, 1600, 0.35, 0.3, 0.9);
    tone(220, 0.3, "sawtooth", 0.018, 440);
  },
  beam(ms) {
    tone(110, ms / 1000, "sawtooth", 0.035, 90);
    tone(220, ms / 1000, "square", 0.014, 235);
    noiseSweep(1200, 2600, ms / 1000, 0.14, 0.6);
  },
  comet() {
    tone(2400, 0.45, "sine", 0.028, 500);
    noiseSweep(4200, 700, 0.45, 0.2, 0.8);
  },
  shatter() {
    [2600, 3100, 3700, 2900].forEach((f, i) => tone(f, 0.12, "triangle", 0.03, f * 0.7, i * 0.035));
  },
  vortex() {
    tone(60, 0.8, "sawtooth", 0.045, 30);
    tone(320, 0.7, "sine", 0.045, 40, 0.05);
  },
  // ---- питомцы ----
  meow() {
    tone(680, 0.12, "triangle", 0.04, 1050);
    tone(1050, 0.22, "triangle", 0.04, 620, 0.11);
  },
  scratch(n = 3) {
    for (let i = 0; i < n; i++) setTimeout(() => noiseSweep(5200, 1800, 0.08, 0.22, 1.5), i * 70);
  },
  bark() {
    tone(330, 0.07, "square", 0.04, 190);
    tone(300, 0.1, "square", 0.04, 170, 0.12);
    tone(1700, 0.05, "triangle", 0.025, 0, 0.2); // щёлк челюстей
  },
  roar(ms = 380) {
    tone(140, ms / 1000, "sawtooth", 0.04, 70);
    noiseSweep(900, 2600, ms / 1000, 0.22, 0.6);
  },
  beep() {
    tone(1800, 0.05, "square", 0.025);
    tone(1800, 0.05, "square", 0.025, 0, 0.08);
  },
  cannon() {
    tone(120, 0.3, "sine", 0.1, 40);
    noiseSweep(1500, 200, 0.3, 0.3, 0.7);
  },
  screech() {
    tone(1300, 0.28, "sine", 0.035, 2300);
    tone(2300, 0.18, "triangle", 0.02, 1500, 0.2);
  },
  // ---- атаки боссов и подлянки ----
  splat() {
    noiseSweep(900, 200, 0.22, 0.25, 0.8);
    tone(260, 0.16, "sine", 0.05, 90);
  },
  chomp() {
    tone(240, 0.06, "square", 0.04, 120);
    tone(1500, 0.04, "triangle", 0.025, 0, 0.07);
  },
  spell() {
    [880, 1175, 1568].forEach((f, i) => tone(f, 0.1, "triangle", 0.025, f * 0.7, i * 0.04));
  },
  paper() {
    noiseSweep(4000, 2500, 0.12, 0.12, 1.5);
  },
  pop() {
    tone(500, 0.08, "sine", 0.05, 1400);
  },
  boing() {
    tone(220, 0.22, "triangle", 0.04, 520);
  },
  superCharge(ms = 900) {
    tone(110, ms / 1000, "sawtooth", 0.03, 440);
    noiseSweep(300, 2400, ms / 1000, 0.15, 0.8);
  },
  deflect() {
    tone(1400, 0.08, "square", 0.04);
    tone(2100, 0.2, "triangle", 0.04, 3200, 0.05);
    noiseSweep(2000, 6000, 0.18, 0.15, 0.9);
  },
  morph() {
    tone(90, 0.8, "sawtooth", 0.035, 360);
    tone(180, 0.7, "square", 0.02, 720, 0.1);
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
