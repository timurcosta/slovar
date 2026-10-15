// Фоновая музыка: треки, секвенсор, приглушение.
import { $ } from "../lib/dom.js";
import { settings } from "../state/settings.ts";
import { ac, ensureAC } from "./context.js";
import { G } from "../battle/run.js";

/* ---------- battle music: three upbeat tracks, picked with the "Музыка" button.
   Step = sixteenth note. 8-bar loops. Tempo +15% when the boss is enraged. ---------- */
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const QUAL = { m: [0, 3, 7], M: [0, 4, 7] };
const flatMel = (bars) => {
  const m = {};
  bars.forEach((bar, b) => {
    let p = b * 16;
    bar.forEach(([n, l]) => {
      if (n) m[p] = [n, l];
      p += l;
    });
  });
  return m;
};
export const TRACKS = {
  calm: {
    name: "Спокойная",
    bpm: 88,
    style: "calm",
    roots: [41, 40, 38, 36, 41, 40, 38, 36],
    q: ["M", "m", "m", "M", "M", "m", "m", "M"],
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    kick: [],
    snare: [],
    mel: flatMel([
      [
        [76, 6],
        [74, 2],
        [72, 8],
      ],
      [
        [71, 4],
        [72, 2],
        [74, 2],
        [67, 8],
      ],
      [
        [69, 4],
        [72, 4],
        [74, 4],
        [72, 4],
      ],
      [
        [71, 8],
        [67, 8],
      ],
      [
        [76, 4],
        [79, 4],
        [77, 2],
        [76, 2],
        [74, 4],
      ],
      [
        [71, 6],
        [72, 2],
        [74, 8],
      ],
      [
        [72, 4],
        [69, 4],
        [74, 4],
        [72, 4],
      ],
      [[72, 16]],
    ]),
  },
  arena: {
    name: "Арена",
    bpm: 160,
    style: "orch",
    roots: [36, 32, 34, 31, 36, 32, 39, 31],
    q: ["m", "M", "M", "M", "m", "M", "M", "M"],
    kick: [0, 8],
    snare: [4, 12],
    mel: flatMel([
      [
        [79, 2],
        [84, 2],
        [82, 1],
        [79, 1],
        [75, 2],
        [77, 2],
        [79, 6],
      ],
      [
        [80, 3],
        [79, 1],
        [77, 2],
        [75, 2],
        [72, 4],
        [75, 4],
      ],
      [
        [77, 2],
        [82, 2],
        [86, 2],
        [84, 2],
        [82, 4],
        [77, 4],
      ],
      [
        [79, 4],
        [83, 4],
        [86, 4],
        [83, 2],
        [79, 2],
      ],
      [
        [84, 3],
        [82, 1],
        [79, 2],
        [75, 2],
        [79, 2],
        [84, 2],
        [87, 4],
      ],
      [
        [84, 3],
        [80, 1],
        [77, 2],
        [80, 2],
        [84, 4],
        [87, 4],
      ],
      [
        [82, 2],
        [79, 2],
        [75, 2],
        [79, 2],
        [82, 4],
        [87, 4],
      ],
      [
        [86, 4],
        [84, 2],
        [83, 2],
        [79, 4],
        [74, 4],
      ],
    ]),
  },
  mega: {
    name: "Мегабосс",
    bpm: 168,
    style: "chip",
    roots: [40, 36, 38, 35, 40, 36, 38, 40],
    q: ["m", "M", "M", "M", "m", "M", "M", "m"],
    kick: [0, 8, 10],
    snare: [4, 12],
    mel: flatMel([
      [
        [71, 2],
        [76, 2],
        [79, 2],
        [78, 2],
        [76, 2],
        [74, 2],
        [76, 4],
      ],
      [
        [79, 2],
        [76, 2],
        [72, 2],
        [76, 2],
        [79, 4],
        [81, 4],
      ],
      [
        [78, 2],
        [74, 2],
        [69, 2],
        [74, 2],
        [78, 2],
        [79, 2],
        [81, 4],
      ],
      [
        [83, 4],
        [81, 2],
        [79, 2],
        [78, 4],
        [75, 4],
      ],
      [
        [79, 2],
        [78, 2],
        [76, 2],
        [71, 2],
        [76, 2],
        [79, 2],
        [83, 4],
      ],
      [
        [84, 4],
        [83, 2],
        [81, 2],
        [79, 4],
        [76, 4],
      ],
      [
        [81, 2],
        [83, 2],
        [81, 2],
        [78, 2],
        [74, 2],
        [76, 2],
        [78, 4],
      ],
      [
        [76, 8],
        [71, 4],
        [76, 4],
      ],
    ]),
  },
  adv: {
    name: "Приключение",
    bpm: 152,
    style: "adv",
    roots: [43, 38, 40, 36, 43, 38, 40, 36],
    q: ["M", "M", "m", "M", "M", "M", "m", "M"],
    kick: [0, 8],
    snare: [4, 12],
    mel: flatMel([
      [
        [74, 2],
        [79, 2],
        [83, 2],
        [81, 2],
        [79, 4],
        [74, 4],
      ],
      [
        [78, 2],
        [81, 2],
        [86, 2],
        [84, 2],
        [83, 4],
        [81, 4],
      ],
      [
        [79, 2],
        [83, 2],
        [88, 4],
        [86, 2],
        [83, 2],
        [79, 4],
      ],
      [
        [76, 2],
        [79, 2],
        [84, 4],
        [83, 2],
        [81, 2],
        [79, 4],
      ],
      [
        [83, 4],
        [81, 2],
        [79, 2],
        [74, 4],
        [79, 4],
      ],
      [
        [81, 4],
        [78, 2],
        [74, 2],
        [81, 4],
        [86, 4],
      ],
      [
        [83, 2],
        [81, 2],
        [79, 2],
        [78, 2],
        [76, 4],
        [79, 4],
      ],
      [
        [76, 2],
        [78, 2],
        [79, 2],
        [81, 2],
        [83, 4],
        [86, 4],
      ],
    ]),
  },
  rock: {
    name: "Драйв",
    bpm: 142,
    style: "rock",
    roots: [45, 41, 43, 45, 45, 41, 43, 40],
    q: ["m", "M", "M", "m", "m", "M", "M", "M"],
    kick: [0, 6, 8, 10],
    snare: [4, 12],
    mel: flatMel([
      [
        [76, 4],
        [81, 4],
        [79, 2],
        [76, 2],
        [74, 2],
        [72, 2],
      ],
      [
        [72, 4],
        [77, 4],
        [76, 2],
        [72, 2],
        [69, 4],
      ],
      [
        [74, 4],
        [79, 4],
        [77, 2],
        [74, 2],
        [71, 2],
        [74, 2],
      ],
      [
        [76, 12],
        [0, 4],
      ],
      [
        [81, 2],
        [81, 2],
        [79, 2],
        [81, 2],
        [84, 4],
        [83, 4],
      ],
      [
        [81, 2],
        [79, 2],
        [77, 2],
        [76, 2],
        [77, 4],
        [81, 4],
      ],
      [
        [79, 2],
        [77, 2],
        [76, 2],
        [74, 2],
        [71, 4],
        [74, 4],
      ],
      [
        [80, 4],
        [76, 4],
        [71, 4],
        [68, 4],
      ],
    ]),
  },
};
export const TRACK_ORDER = ["calm", "arena", "mega", "adv", "rock"];
let music = { on: false, timer: null, t: 0, step: 0, out: null, dry: null, echo: null, dist: null, noise: null };
function buildMusicGraph() {
  if (!music.noise) {
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate),
      d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music.noise = nb;
  }
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, ac.currentTime);
  out.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 0.6);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;
  lp.Q.value = 0.5; // tames harsh highs
  out.connect(lp);
  lp.connect(comp);
  comp.connect(ac.destination);
  const dry = ac.createGain();
  dry.connect(out);
  // echo for the lead
  const dl = ac.createDelay(1),
    fb = ac.createGain(),
    ew = ac.createGain();
  dl.delayTime.value = 0.18;
  fb.gain.value = 0.22;
  ew.gain.value = 0.18;
  dl.connect(fb);
  fb.connect(dl);
  dl.connect(ew);
  ew.connect(out);
  // distortion for the rock guitar
  const ws = ac.createWaveShaper(),
    curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1;
    curve[i] = Math.tanh(x * 6);
  }
  ws.curve = curve;
  const dg = ac.createGain();
  dg.gain.value = 0.5;
  ws.connect(dg);
  dg.connect(out);
  music.out = out;
  music.dry = dry;
  music.echo = dl;
  music.dist = ws;
}
function voice(
  n,
  t,
  d,
  { type = "square", cut = 3000, vol = 0.1, att = 0.005, det = 0, vib = 0, to = "dry", slide = 0 } = {},
) {
  const o = ac.createOscillator(),
    f = ac.createBiquadFilter(),
    g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(midi(n + slide), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(midi(n), t + 0.04);
  o.detune.value = det;
  f.type = "lowpass";
  f.frequency.value = cut;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol * 0.8, t + Math.max(att, d * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
  if (vib) {
    const l = ac.createOscillator(),
      lg = ac.createGain();
    l.frequency.value = 6;
    lg.gain.value = vib;
    l.connect(lg).connect(o.frequency);
    l.start(t + 0.12);
    l.stop(t + d + 0.1);
  }
  o.connect(f).connect(g);
  g.connect(music.dry);
  if (to === "echo") g.connect(music.echo);
  if (to === "dist") {
    g.disconnect();
    g.connect(music.dist);
  }
  o.start(t);
  o.stop(t + d + 0.08);
}
function nz(t, { freq = 1800, q = 0.8, vol = 0.2, dec = 0.1, type = "bandpass" } = {}) {
  const s = ac.createBufferSource(),
    f = ac.createBiquadFilter(),
    g = ac.createGain();
  s.buffer = music.noise;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  s.connect(f).connect(g);
  g.connect(music.dry);
  s.start(t);
  s.stop(t + dec + 0.02);
}
function kickD(t, v = 1) {
  const o = ac.createOscillator(),
    g = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g);
  g.connect(music.dry);
  o.start(t);
  o.stop(t + 0.27);
}
function snareD(t, v = 1) {
  nz(t, { freq: 2000, q: 0.7, vol: 0.35 * v, dec: 0.15 });
  const o = ac.createOscillator(),
    g = ac.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  g.gain.setValueAtTime(0.25 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g);
  g.connect(music.dry);
  o.start(t);
  o.stop(t + 0.12);
}
function musicStep(tr, i, t, sd, fast) {
  const bar = (i / 16) | 0,
    k = i % 16,
    root = tr.roots[bar],
    ch = QUAL[tr.q[bar]];
  const lead = tr.mel[i];
  if (tr.style === "calm") {
    const chd = tr.chords[bar];
    if (k === 0)
      chd.forEach((n, j) => {
        voice(n, t + j * 0.03, sd * 14, { type: "sine", vol: 0.06, att: 0.1 });
        voice(n, t + j * 0.03, sd * 14, { type: "triangle", cut: 1400, vol: 0.025, att: 0.1 });
      });
    if (k === 8) chd.forEach((n) => voice(n + 12, t, sd * 6, { type: "sine", vol: 0.02, att: 0.06 }));
    if (k === 0 || k === 10) voice(root, t, sd * 5, { type: "sine", vol: 0.2, att: 0.02 });
    if (lead)
      voice(lead[0], t, lead[1] * sd, { type: "triangle", cut: 2200, vol: 0.075, att: 0.04, vib: 3, to: "echo" });
    if (k === 0 || k === 10 || (fast && k === 6)) kickD(t, 0.45);
    if (k === 4 || k === 12) nz(t, { freq: 1400, q: 0.6, vol: 0.06, dec: 0.12 });
    return;
  }
  if (tr.style === "orch") {
    const os = [0, 0, 7, 12, 0, 0, 7, 12, 0, 0, 7, 12, 0, 7, 12, 7][k];
    voice(root + 24 + os, t, sd * 0.7, { type: "sawtooth", cut: 1900, vol: 0.07 });
    if (k % 4 === 0) voice(root + 12, t, sd * 3.5, { type: "sawtooth", cut: 600, vol: 0.2 });
    if (k === 0 || k === 3 || k === 6 || k === 10)
      ch.forEach((c) =>
        [-8, 8].forEach((det) =>
          voice(root + 36 + c, t, sd * (k === 0 ? 2.5 : 1.2), {
            type: "sawtooth",
            cut: 2600,
            vol: 0.032,
            att: 0.02,
            det,
          }),
        ),
      );
    if (k % 2 === 1) voice(root + 48 + ch[(k >> 1) % 3], t, sd * 0.6, { type: "sine", vol: 0.05 });
    if (k === 0 || k === 8) {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(midi(root + 12) * 1.04, t);
      o.frequency.exponentialRampToValueAtTime(midi(root + 12), t + 0.06);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g);
      g.connect(music.dry);
      o.start(t);
      o.stop(t + 0.55);
    }
    if (lead) {
      voice(lead[0], t, lead[1] * sd, { type: "sawtooth", cut: 3000, vol: 0.085, att: 0.02, vib: 4, to: "echo" });
      voice(lead[0], t, lead[1] * sd, { type: "square", cut: 2200, vol: 0.035, att: 0.02, det: 7 });
      voice(lead[0] - 12, t, lead[1] * sd, { type: "triangle", cut: 2000, vol: 0.06, att: 0.02 });
    }
  } else if (tr.style === "chip") {
    if (k % 2 === 0) voice(root + 12 + ((k / 2) % 2 ? 12 : 0), t, sd * 1.6, { type: "square", cut: 1400, vol: 0.13 });
    const arp = [0, 1, 2, 1][k % 4];
    voice(root + 36 + ch[arp] - 12, t, sd * 0.8, { type: "square", cut: 2600, vol: 0.04 });
    if (lead) {
      voice(lead[0], t, lead[1] * sd, { type: "square", cut: 4200, vol: 0.1, vib: 5, to: "echo", slide: -1 });
      voice(lead[0] - 12, t, lead[1] * sd, { type: "triangle", cut: 3000, vol: 0.08 });
    }
  } else if (tr.style === "adv") {
    const bpat = { 0: 0, 3: 7, 6: 12, 8: 0, 11: 7, 14: 12 };
    if (bpat[k] !== undefined) voice(root + 12 + bpat[k], t, sd * 2, { type: "triangle", cut: 2000, vol: 0.3 });
    const arp = [0, 1, 2, 1, 0, 2, 1, 2][k % 8];
    voice(root + 36 + ch[arp], t, sd * 0.9, { type: "triangle", cut: 4000, vol: 0.06 });
    if (k % 4 === 2) ch.forEach((c) => voice(root + 24 + c, t, sd * 1.2, { type: "square", cut: 2200, vol: 0.025 }));
    if (lead) {
      voice(lead[0], t, lead[1] * sd, { type: "square", cut: 5000, vol: 0.09, vib: 4, to: "echo" });
      voice(lead[0] + 12, t, lead[1] * sd, { type: "sine", vol: 0.04 });
    }
  } else {
    const chug = { 0: 1, 2: 0.7, 3: 0.7, 6: 1, 8: 1, 10: 0.7, 11: 0.7, 14: 1 };
    if (chug[k])
      [0, 7, 12].forEach((c) =>
        voice(root + c, t, sd * (k % 4 === 0 ? 1.8 : 0.9), {
          type: "sawtooth",
          cut: 3500,
          vol: 0.09 * chug[k],
          to: "dist",
          det: c ? 6 : 0,
        }),
      );
    if (k % 2 === 0) voice(root - 12 + 12, t, sd * 1.8, { type: "sawtooth", cut: 700, vol: 0.2 });
    if (lead) {
      voice(lead[0], t, lead[1] * sd, { type: "sawtooth", cut: 3200, vol: 0.09, vib: 6, to: "echo" });
      voice(lead[0], t, lead[1] * sd, { type: "square", cut: 2000, vol: 0.04, det: 8 });
    }
  }
  // drums
  if (tr.kick.includes(k) || (fast && k % 4 === 0)) kickD(t, 1);
  if (tr.snare.includes(k)) snareD(t, 1);
  if (fast && k === 14) snareD(t, 0.6);
  if (k % 4 === 2 || (fast && k % 2 === 0)) nz(t, { freq: 7000, q: 0.6, vol: 0.035, dec: 0.03, type: "highpass" });
  if (i % 64 === 0) nz(t, { freq: 5000, q: 0.3, vol: 0.09, dec: 0.9, type: "highpass" });
  if (i >= 120 && i % 2 === 0) snareD(t, 0.45 + (i - 120) * 0.06);
}
function scheduleMusic(until) {
  const tr = TRACKS[settings.track] || TRACKS.calm,
    fast = !!(G && G.enraged);
  const sd = 60 / (tr.bpm * (fast ? 1.15 : 1)) / 4;
  while (music.t < until) {
    musicStep(tr, music.step % 128, music.t, sd, fast);
    music.t += sd;
    music.step++;
  }
}
function musicTick() {
  if (music.on && ac) scheduleMusic(ac.currentTime + 0.2);
}
export function startMusic() {
  if (!settings.music || settings.muted || music.on) return;
  try {
    ensureAC();
    if (ac.state !== "running") ac.resume();
    buildMusicGraph();
    music.on = true;
    music.t = ac.currentTime + 0.08;
    music.step = 0;
    music.timer = setInterval(musicTick, 50);
    musicTick();
  } catch (e) {}
}
export function duckMusic(ms) {
  if (!music.on || !music.out || !ac) return;
  try {
    const g = music.out.gain,
      now = ac.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0002), now);
    g.exponentialRampToValueAtTime(0.015, now + 0.2);
    g.setValueAtTime(0.015, now + ms / 1000);
    g.exponentialRampToValueAtTime(0.09, now + ms / 1000 + 1);
  } catch (e) {}
}
export function stopMusic() {
  if (!music.on) return;
  music.on = false;
  clearInterval(music.timer);
  music.timer = null;
  try {
    const out = music.out,
      now = ac.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0002), now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    setTimeout(() => {
      try {
        out.disconnect();
      } catch (e) {}
    }, 700);
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
  else if (G && !$("s-game").hidden) startMusic();
});
