// Конфетти на победу.
import { pick } from "../lib/random.js";

export function confetti(n, dur) {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  document.body.appendChild(cv);
  const W = innerWidth,
    H = innerHeight,
    dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr;
  cv.height = H * dpr;
  const c = cv.getContext("2d");
  c.scale(dpr, dpr);
  const cols = ["#d62839", "#f0a000", "#ffd84a", "#23894a", "#2f55c8", "#45d1e6", "#7a4fd6", "#ff7a9a"];
  const ps = Array.from({ length: n }, (_, i) => ({
    x: W * (i % 2 ? 0.25 : 0.75) + (Math.random() - 0.5) * 60,
    y: H * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 5,
    s: 5 + Math.random() * 6,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    c: pick(cols),
  }));
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0;
    c.clearRect(0, 0, W, H);
    ps.forEach((p) => {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.r);
      c.globalAlpha = Math.max(0, 1 - Math.max(0, t - dur * 0.6) / (dur * 0.4));
      c.fillStyle = p.c;
      c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      c.restore();
    });
    if (t < dur) requestAnimationFrame(frame);
    else cv.remove();
  })(t0);
}
