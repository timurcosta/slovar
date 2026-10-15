"use strict";
// Звук: WebAudio-эффекты sfx и фоновая музыка.

let ac = null, silentEl = null;
/* iPhone: Web Audio is muted by the silent switch and stays suspended until a tap.
   On every tap: ask for the "playback" audio session, resume the context, and keep a silent
   looping <audio> running, which moves iOS into media playback so game sounds are heard. */
function silentWav(){
  const sr = 8000, n = 800, buf = new ArrayBuffer(44 + n*2), v = new DataView(buf);
  const w = (o,s) => { for (let i = 0; i < s.length; i++) v.setUint8(o+i, s.charCodeAt(i)); };
  w(0,"RIFF"); v.setUint32(4,36+n*2,true); w(8,"WAVE"); w(12,"fmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,"data"); v.setUint32(40,n*2,true);
  let bin = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return "data:audio/wav;base64," + btoa(bin);
}
function unlockAudio(){
  if (settings.muted) return;
  try{ if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; }catch(e){}
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state !== "running") ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  }catch(e){}
  try{
    if (!silentEl){ silentEl = document.createElement("audio"); silentEl.src = silentWav(); silentEl.loop = true; silentEl.setAttribute("playsinline", ""); silentEl.setAttribute("x-webkit-airplay", "deny"); }
    if (silentEl.paused){ const pr = silentEl.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }catch(e){}
}
["touchend","pointerdown","click","keydown"].forEach(ev => document.addEventListener(ev, unlockAudio, {passive:true, capture:true}));
document.addEventListener("visibilitychange", () => { if (document.hidden && silentEl) silentEl.pause(); });
function tone(f, d, type="square", vol=.05, slide=0, delay=0){
  if (settings.muted) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(vol * 1.6, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
  }catch(e){}
}
/* ---------- battle music: three upbeat tracks, picked with the "Музыка" button.
   Step = sixteenth note. 8-bar loops. Tempo +15% when the boss is enraged. ---------- */
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const QUAL = {m:[0,3,7], M:[0,4,7]};
const flatMel = bars => { const m = {}; bars.forEach((bar, b) => { let p = b * 16; bar.forEach(([n, l]) => { if (n) m[p] = [n, l]; p += l; }); }); return m; };
const TRACKS = {
  calm: {name:"Спокойная", bpm:88, style:"calm",
    roots:[41,40,38,36,41,40,38,36], q:["M","m","m","M","M","m","m","M"],
    chords:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59],[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]],
    kick:[], snare:[],
    mel: flatMel([
      [[76,6],[74,2],[72,8]],
      [[71,4],[72,2],[74,2],[67,8]],
      [[69,4],[72,4],[74,4],[72,4]],
      [[71,8],[67,8]],
      [[76,4],[79,4],[77,2],[76,2],[74,4]],
      [[71,6],[72,2],[74,8]],
      [[72,4],[69,4],[74,4],[72,4]],
      [[72,16]]
    ])},
  arena: {name:"Арена", bpm:160, style:"orch",
    roots:[36,32,34,31,36,32,39,31], q:["m","M","M","M","m","M","M","M"],
    kick:[0,8], snare:[4,12],
    mel: flatMel([
      [[79,2],[84,2],[82,1],[79,1],[75,2],[77,2],[79,6]],
      [[80,3],[79,1],[77,2],[75,2],[72,4],[75,4]],
      [[77,2],[82,2],[86,2],[84,2],[82,4],[77,4]],
      [[79,4],[83,4],[86,4],[83,2],[79,2]],
      [[84,3],[82,1],[79,2],[75,2],[79,2],[84,2],[87,4]],
      [[84,3],[80,1],[77,2],[80,2],[84,4],[87,4]],
      [[82,2],[79,2],[75,2],[79,2],[82,4],[87,4]],
      [[86,4],[84,2],[83,2],[79,4],[74,4]]
    ])},
  mega: {name:"Мегабосс", bpm:168, style:"chip",
    roots:[40,36,38,35,40,36,38,40], q:["m","M","M","M","m","M","M","m"],
    kick:[0,8,10], snare:[4,12],
    mel: flatMel([
      [[71,2],[76,2],[79,2],[78,2],[76,2],[74,2],[76,4]],
      [[79,2],[76,2],[72,2],[76,2],[79,4],[81,4]],
      [[78,2],[74,2],[69,2],[74,2],[78,2],[79,2],[81,4]],
      [[83,4],[81,2],[79,2],[78,4],[75,4]],
      [[79,2],[78,2],[76,2],[71,2],[76,2],[79,2],[83,4]],
      [[84,4],[83,2],[81,2],[79,4],[76,4]],
      [[81,2],[83,2],[81,2],[78,2],[74,2],[76,2],[78,4]],
      [[76,8],[71,4],[76,4]]
    ])},
  adv: {name:"Приключение", bpm:152, style:"adv",
    roots:[43,38,40,36,43,38,40,36], q:["M","M","m","M","M","M","m","M"],
    kick:[0,8], snare:[4,12],
    mel: flatMel([
      [[74,2],[79,2],[83,2],[81,2],[79,4],[74,4]],
      [[78,2],[81,2],[86,2],[84,2],[83,4],[81,4]],
      [[79,2],[83,2],[88,4],[86,2],[83,2],[79,4]],
      [[76,2],[79,2],[84,4],[83,2],[81,2],[79,4]],
      [[83,4],[81,2],[79,2],[74,4],[79,4]],
      [[81,4],[78,2],[74,2],[81,4],[86,4]],
      [[83,2],[81,2],[79,2],[78,2],[76,4],[79,4]],
      [[76,2],[78,2],[79,2],[81,2],[83,4],[86,4]]
    ])},
  rock: {name:"Драйв", bpm:142, style:"rock",
    roots:[45,41,43,45,45,41,43,40], q:["m","M","M","m","m","M","M","M"],
    kick:[0,6,8,10], snare:[4,12],
    mel: flatMel([
      [[76,4],[81,4],[79,2],[76,2],[74,2],[72,2]],
      [[72,4],[77,4],[76,2],[72,2],[69,4]],
      [[74,4],[79,4],[77,2],[74,2],[71,2],[74,2]],
      [[76,12],[0,4]],
      [[81,2],[81,2],[79,2],[81,2],[84,4],[83,4]],
      [[81,2],[79,2],[77,2],[76,2],[77,4],[81,4]],
      [[79,2],[77,2],[76,2],[74,2],[71,4],[74,4]],
      [[80,4],[76,4],[71,4],[68,4]]
    ])}
};
const TRACK_ORDER = ["calm","arena","mega","adv","rock"];
let music = {on:false, timer:null, t:0, step:0, out:null, dry:null, echo:null, dist:null, noise:null};
function buildMusicGraph(){
  if (!music.noise){ const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; music.noise = nb; }
  const out = ac.createGain(); out.gain.setValueAtTime(0.0001, ac.currentTime); out.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 0.6);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3000; lp.Q.value = 0.5;   // tames harsh highs
  out.connect(lp); lp.connect(comp); comp.connect(ac.destination);
  const dry = ac.createGain(); dry.connect(out);
  // echo for the lead
  const dl = ac.createDelay(1), fb = ac.createGain(), ew = ac.createGain();
  dl.delayTime.value = 0.18; fb.gain.value = 0.22; ew.gain.value = 0.18;
  dl.connect(fb); fb.connect(dl); dl.connect(ew); ew.connect(out);
  // distortion for the rock guitar
  const ws = ac.createWaveShaper(), curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++){ const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
  ws.curve = curve; const dg = ac.createGain(); dg.gain.value = 0.5; ws.connect(dg); dg.connect(out);
  music.out = out; music.dry = dry; music.echo = dl; music.dist = ws;
}
function voice(n, t, d, {type="square", cut=3000, vol=0.1, att=0.005, det=0, vib=0, to="dry", slide=0} = {}){
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(midi(n + slide), t); if (slide) o.frequency.exponentialRampToValueAtTime(midi(n), t + 0.04);
  o.detune.value = det;
  f.type = "lowpass"; f.frequency.value = cut;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol * 0.8, t + Math.max(att, d * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
  if (vib){ const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t + 0.12); l.stop(t + d + 0.1); }
  o.connect(f).connect(g);
  g.connect(music.dry); if (to === "echo") g.connect(music.echo); if (to === "dist") { g.disconnect(); g.connect(music.dist); }
  o.start(t); o.stop(t + d + 0.08);
}
function nz(t, {freq=1800, q=0.8, vol=0.2, dec=0.1, type="bandpass"} = {}){
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = music.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  s.connect(f).connect(g); g.connect(music.dry); s.start(t); s.stop(t + dec + 0.02);
}
function kickD(t, v = 1){
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g); g.connect(music.dry); o.start(t); o.stop(t + 0.27);
}
function snareD(t, v = 1){
  nz(t, {freq:2000, q:0.7, vol:0.35*v, dec:0.15});
  const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  g.gain.setValueAtTime(0.25*v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g); g.connect(music.dry); o.start(t); o.stop(t + 0.12);
}
function musicStep(tr, i, t, sd, fast){
  const bar = (i / 16) | 0, k = i % 16, root = tr.roots[bar], ch = QUAL[tr.q[bar]];
  const lead = tr.mel[i];
  if (tr.style === "calm"){
    const chd = tr.chords[bar];
    if (k === 0) chd.forEach((n, j) => { voice(n, t + j*0.03, sd*14, {type:"sine", vol:0.06, att:0.1}); voice(n, t + j*0.03, sd*14, {type:"triangle", cut:1400, vol:0.025, att:0.1}); });
    if (k === 8) chd.forEach(n => voice(n + 12, t, sd*6, {type:"sine", vol:0.02, att:0.06}));
    if (k === 0 || k === 10) voice(root, t, sd*5, {type:"sine", vol:0.2, att:0.02});
    if (lead) voice(lead[0], t, lead[1]*sd, {type:"triangle", cut:2200, vol:0.075, att:0.04, vib:3, to:"echo"});
    if (k === 0 || k === 10 || (fast && k === 6)) kickD(t, 0.45);
    if (k === 4 || k === 12) nz(t, {freq:1400, q:0.6, vol:0.06, dec:0.12});
    return;
  }
  if (tr.style === "orch"){
    const os = [0,0,7,12, 0,0,7,12, 0,0,7,12, 0,7,12,7][k];
    voice(root + 24 + os, t, sd * 0.7, {type:"sawtooth", cut:1900, vol:0.07});
    if (k % 4 === 0) voice(root + 12, t, sd * 3.5, {type:"sawtooth", cut:600, vol:0.2});
    if (k === 0 || k === 3 || k === 6 || k === 10) ch.forEach(c => [-8, 8].forEach(det => voice(root + 36 + c, t, sd * (k === 0 ? 2.5 : 1.2), {type:"sawtooth", cut:2600, vol:0.032, att:0.02, det})));
    if (k % 2 === 1) voice(root + 48 + ch[(k >> 1) % 3], t, sd * 0.6, {type:"sine", vol:0.05});
    if (k === 0 || k === 8){ const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.setValueAtTime(midi(root + 12) * 1.04, t); o.frequency.exponentialRampToValueAtTime(midi(root + 12), t + 0.06); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); g.connect(music.dry); o.start(t); o.stop(t + 0.55); }
    if (lead){
      voice(lead[0], t, lead[1] * sd, {type:"sawtooth", cut:3000, vol:0.085, att:0.02, vib:4, to:"echo"});
      voice(lead[0], t, lead[1] * sd, {type:"square", cut:2200, vol:0.035, att:0.02, det:7});
      voice(lead[0] - 12, t, lead[1] * sd, {type:"triangle", cut:2000, vol:0.06, att:0.02});
    }
  } else if (tr.style === "chip"){
    if (k % 2 === 0) voice(root + 12 + ((k / 2) % 2 ? 12 : 0), t, sd * 1.6, {type:"square", cut:1400, vol:0.13});
    const arp = [0,1,2,1][k % 4]; voice(root + 36 + ch[arp] - 12, t, sd * 0.8, {type:"square", cut:2600, vol:0.04});
    if (lead){ voice(lead[0], t, lead[1] * sd, {type:"square", cut:4200, vol:0.1, vib:5, to:"echo", slide:-1}); voice(lead[0] - 12, t, lead[1] * sd, {type:"triangle", cut:3000, vol:0.08}); }
  } else if (tr.style === "adv"){
    const bpat = {0:0, 3:7, 6:12, 8:0, 11:7, 14:12};
    if (bpat[k] !== undefined) voice(root + 12 + bpat[k], t, sd * 2, {type:"triangle", cut:2000, vol:0.3});
    const arp = [0,1,2,1,0,2,1,2][k % 8]; voice(root + 36 + ch[arp], t, sd * 0.9, {type:"triangle", cut:4000, vol:0.06});
    if (k % 4 === 2) ch.forEach(c => voice(root + 24 + c, t, sd * 1.2, {type:"square", cut:2200, vol:0.025}));
    if (lead){ voice(lead[0], t, lead[1] * sd, {type:"square", cut:5000, vol:0.09, vib:4, to:"echo"}); voice(lead[0] + 12, t, lead[1] * sd, {type:"sine", vol:0.04}); }
  } else {
    const chug = {0:1, 2:0.7, 3:0.7, 6:1, 8:1, 10:0.7, 11:0.7, 14:1};
    if (chug[k]) [0, 7, 12].forEach(c => voice(root + c, t, sd * (k % 4 === 0 ? 1.8 : 0.9), {type:"sawtooth", cut:3500, vol:0.09 * chug[k], to:"dist", det:c ? 6 : 0}));
    if (k % 2 === 0) voice(root - 12 + 12, t, sd * 1.8, {type:"sawtooth", cut:700, vol:0.2});
    if (lead){ voice(lead[0], t, lead[1] * sd, {type:"sawtooth", cut:3200, vol:0.09, vib:6, to:"echo"}); voice(lead[0], t, lead[1] * sd, {type:"square", cut:2000, vol:0.04, det:8}); }
  }
  // drums
  if (tr.kick.includes(k) || (fast && k % 4 === 0)) kickD(t, 1);
  if (tr.snare.includes(k)) snareD(t, 1);
  if (fast && k === 14) snareD(t, 0.6);
  if (k % 4 === 2 || (fast && k % 2 === 0)) nz(t, {freq:7000, q:0.6, vol:0.035, dec:0.03, type:"highpass"});
  if (i % 64 === 0) nz(t, {freq:5000, q:0.3, vol:0.09, dec:0.9, type:"highpass"});
  if (i >= 120 && i % 2 === 0) snareD(t, 0.45 + (i - 120) * 0.06);
}
function scheduleMusic(until){
  const tr = TRACKS[settings.track] || TRACKS.calm, fast = !!(G && G.enraged);
  const sd = 60 / (tr.bpm * (fast ? 1.15 : 1)) / 4;
  while (music.t < until){ musicStep(tr, music.step % 128, music.t, sd, fast); music.t += sd; music.step++; }
}
function musicTick(){ if (music.on && ac) scheduleMusic(ac.currentTime + 0.2); }
function startMusic(){
  if (!settings.music || settings.muted || music.on) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state !== "running") ac.resume();
    buildMusicGraph();
    music.on = true; music.t = ac.currentTime + 0.08; music.step = 0;
    music.timer = setInterval(musicTick, 50); musicTick();
  }catch(e){}
}
function duckMusic(ms){
  if (!music.on || !music.out || !ac) return;
  try{ const g = music.out.gain, now = ac.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, .0002), now);
    g.exponentialRampToValueAtTime(0.015, now + .2); g.setValueAtTime(0.015, now + ms/1000); g.exponentialRampToValueAtTime(0.09, now + ms/1000 + 1); }catch(e){}
}
function confetti(n, dur){
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext("2d"); c.scale(dpr, dpr);
  const cols = ["#d62839","#f0a000","#ffd84a","#23894a","#2f55c8","#45d1e6","#7a4fd6","#ff7a9a"];
  const ps = Array.from({length:n}, (_, i) => ({x: W * (i % 2 ? .25 : .75) + (Math.random() - .5) * 60, y: H * .45,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 5, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: pick(cols)}));
  const t0 = performance.now();
  (function frame(now){
    const t = now - t0; c.clearRect(0, 0, W, H);
    ps.forEach(p => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.max(0, 1 - Math.max(0, t - dur * .6) / (dur * .4)); c.fillStyle = p.c; c.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); c.restore(); });
    if (t < dur) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
function stopMusic(){
  if (!music.on) return;
  music.on = false; clearInterval(music.timer); music.timer = null;
  try{
    const out = music.out, now = ac.currentTime;
    out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0002), now); out.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    setTimeout(() => { try{ out.disconnect(); }catch(e){} }, 700);
  }catch(e){}
}
document.addEventListener("visibilitychange", () => { if (document.hidden) stopMusic(); else if (G && !$("s-game").hidden) startMusic(); });
function getAC(){ if (settings.muted) return null; try{ ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; }catch(e){ return null; } }
let sfxNoise = null;
function noiseSweep(f0, f1, dur, vol, q = 1.2){
  const c = getAC(); if (!c) return;
  if (!sfxNoise){ sfxNoise = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate); const d = sfxNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  s.buffer = sfxNoise; f.type = "bandpass"; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
}
const sfx = {
  whoosh(heavy){ noiseSweep(heavy ? 250 : 600, heavy ? 1100 : 3200, heavy ? 0.26 : 0.2, heavy ? 0.35 : 0.28); },
  clang(){ tone(1800,.1,"triangle",.04); tone(2700,.08,"triangle",.025); tone(160,.12,"sine",.08,60); },
  thud(){ tone(130,.3,"sine",.12,38); noiseSweep(400, 150, .25, .3, .7); },
  zap(){ tone(1500,.12,"sawtooth",.025,400); noiseSweep(3000, 6000, .12, .12, .8); },
  saber(){
    const c = getAC(); if (!c) return; const t = c.currentTime;
    const f = c.createBiquadFilter(), g = c.createGain(); f.type = "lowpass";
    f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2400, t + .12); f.frequency.linearRampToValueAtTime(450, t + .45);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + .05); g.gain.exponentialRampToValueAtTime(0.0001, t + .5);
    [0, 3].forEach(det => { const o = c.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(92 + det, t); o.frequency.exponentialRampToValueAtTime(175 + det, t + .12); o.frequency.exponentialRampToValueAtTime(78 + det, t + .45);
      o.connect(f); o.start(t); o.stop(t + .52); });
    f.connect(g).connect(c.destination);
    const s = c.createOscillator(), sg = c.createGain(); s.type = "sine";
    s.frequency.setValueAtTime(1500, t); s.frequency.exponentialRampToValueAtTime(480, t + .22);
    sg.gain.setValueAtTime(0.07, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + .24);
    s.connect(sg).connect(c.destination); s.start(t); s.stop(t + .26);
  },
  hit(){ tone(520,.07); tone(780,.1,"square",.05,0,.06); },
  laser(){ tone(1400,.18,"sawtooth",.04,300); },
  fire(){ tone(180,.3,"sawtooth",.05,60); tone(400,.12,"triangle",.04,0,.05); },
  bolt(){ tone(90,.35,"sawtooth",.07,40); tone(1600,.08,"square",.04,0,.02); },
  crit(){ [660,880,1100,1320].forEach((f,i) => tone(f,.08,"square",.05,0,i*.05)); },
  block(){ tone(900,.05,"square",.05); tone(600,.12,"triangle",.06,0,.05); },
  hurt(){ tone(220,.35,"sawtooth",.06,70); },
  heal(){ [523,659,784].forEach((f,i) => tone(f,.12,"triangle",.07,0,i*.08)); },
  coin(){ tone(988,.06,"square",.04); tone(1319,.12,"square",.04,0,.06); },
  win(){ [523,659,784,1046,784,1046].forEach((f,i) => tone(f,.14,"square",.05,0,i*.1)); },
  fanfare(big){
    // ta-ta-ta-taaa, then a held major chord
    [[392,0],[392,.12],[392,.24],[523,.36]].forEach(([f,d]) => { tone(f,.11,"square",.05,0,d); tone(f/2,.11,"triangle",.05,0,d); });
    tone(659,.22,"square",.05,0,.6); tone(587,.12,"square",.045,0,.84); tone(659,.12,"square",.045,0,.98);
    [[523,"square",.055],[659,"triangle",.05],[784,"triangle",.05],[262,"triangle",.06]].forEach(([f,tp,v]) => tone(f, big ? 1.4 : .9, tp, v, 0, 1.12));
    if (big) [[1047,1.5],[1319,1.62],[1568,1.74],[2093,1.9]].forEach(([f,d]) => tone(f,.25,"square",.035,0,d));
  },
  level(){ [392,523,659,784,1046,1318].forEach((f,i) => tone(f,.13,"square",.05,0,i*.08)); },
  lose(){ [392,330,262,196].forEach((f,i) => tone(f,.22,"triangle",.07,0,i*.18)); }
};
