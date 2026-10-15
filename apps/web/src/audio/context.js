// AudioContext и разблокировка звука на iOS/Android.
import { settings } from "../state/settings.ts";

export let ac = null,
  silentEl = null;
/* iPhone: Web Audio is muted by the silent switch and stays suspended until a tap.
   On every tap: ask for the "playback" audio session, resume the context, and keep a silent
   looping <audio> running, which moves iOS into media playback so game sounds are heard. */
function silentWav() {
  const sr = 8000,
    n = 800,
    buf = new ArrayBuffer(44 + n * 2),
    v = new DataView(buf);
  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  let bin = "";
  const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return "data:audio/wav;base64," + btoa(bin);
}
export function unlockAudio() {
  if (settings.muted) return;
  try {
    if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback";
  } catch (e) {}
  try {
    ensureAC();
    if (ac.state !== "running") ac.resume();
    const b = ac.createBuffer(1, 1, 22050),
      s = ac.createBufferSource();
    s.buffer = b;
    s.connect(ac.destination);
    s.start(0);
  } catch (e) {}
  try {
    if (!silentEl) {
      silentEl = document.createElement("audio");
      silentEl.src = silentWav();
      silentEl.loop = true;
      silentEl.setAttribute("playsinline", "");
      silentEl.setAttribute("x-webkit-airplay", "deny");
    }
    if (silentEl.paused) {
      const pr = silentEl.play();
      if (pr && pr.catch) pr.catch(() => {});
    }
  } catch (e) {}
}
["touchend", "pointerdown", "click", "keydown"].forEach((ev) =>
  document.addEventListener(ev, unlockAudio, { passive: true, capture: true }),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && silentEl) silentEl.pause();
});
export function ensureAC() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  return ac;
}
export function getAC() {
  if (settings.muted) return null;
  try {
    ensureAC();
    if (ac.state === "suspended") ac.resume();
    return ac;
  } catch (e) {
    return null;
  }
}
