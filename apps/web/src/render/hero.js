// drawHero(): попиксельная отрисовка героя со всей экипировкой. Размеры холста — в CLAUDE.md.
import { LOOK_EYE, LOOK_FULLHELM, LOOK_HAIR, LOOK_MASKED, LOOK_NOSKIN, LOOK_SKIN } from "../content/look.js";
import { PET_CAP, PET_PAL, PET_SPR, PET_SPR2 } from "../content/pets.js";
import { AURA_COL, AURA_GLOWC, EPIC_AURA } from "../content/auras.js";
import { COSTUMES, COSTUME_KEY } from "../content/costumes.js";
import { shadeHex } from "./color.js";
import { heroLook } from "../state/profile.js";

export function drawHero(cv, eq, wrap, fr = 0) {
  // 1px margin on every side so outlines at the edges (pet, wings, weapons) are never clipped
  const W = 30,
    H = 27,
    TOP = 4,
    PETW = 10,
    LX = 1 + PETW,
    CW = W + 2 + PETW,
    CH = H + 1 + TOP;
  cv.width = CW;
  cv.height = CH; // TOP: room for raised weapons + breathing
  const x = cv.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, CW, CH);
  x.setTransform(1, 0, 0, 1, LX, TOP);
  const ox = 6,
    oy = 4;
  let cx = x;
  const R = (a, b, w, h, c) => {
    cx.fillStyle = c;
    cx.fillRect(a, b, w, h);
  };
  // draws a group of pixels on its own layer, then rings it with a dark 1px outline so it reads on any costume
  const outlined = (fn, col = "#141a33") => {
    const oc = document.createElement("canvas");
    oc.width = CW;
    oc.height = CH;
    cx = oc.getContext("2d");
    cx.setTransform(1, 0, 0, 1, LX, TOP);
    fn();
    cx = x;
    const d = oc.getContext("2d").getImageData(0, 0, CW, CH).data,
      has = (i, j) => i >= 0 && j >= 0 && i < CW && j < CH && d[(j * CW + i) * 4 + 3] > 0;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = col;
    for (let j = 0; j < CH; j++)
      for (let i = 0; i < CW; i++)
        if (!has(i, j) && (has(i - 1, j) || has(i + 1, j) || has(i, j - 1) || has(i, j + 1))) x.fillRect(i, j, 1, 1);
    x.drawImage(oc, 0, 0);
    x.setTransform(1, 0, 0, 1, LX, TOP);
  };
  const P = (a, b, c) => R(a, b, 1, 1, c);
  const M = (a, b, w, h, c) => {
    R(a, b, w, h, c);
    R(2 * (ox + 10) - (a + w), b, w, h, c);
  }; // mirrored pair
  const ck = COSTUME_KEY[eq.costume];
  const C = { ...COSTUMES[ck || "school"] };
  const look = eq.look || heroLook(),
    masked = LOOK_MASKED.includes(ck);
  if (!masked) {
    if (LOOK_HAIR[look.hair] && LOOK_HAIR[look.hair][1]) C.hair = LOOK_HAIR[look.hair][1];
    if (LOOK_SKIN[look.skin] && LOOK_SKIN[look.skin][1] && !LOOK_NOSKIN.includes(ck)) C.skin = LOOK_SKIN[look.skin][1];
    if (LOOK_EYE[look.eye] && LOOK_EYE[look.eye][1]) C.eye = LOOK_EYE[look.eye][1];
    // dark skin: default eyes and mouth must stay readable
    if ((look.skin === "s4" || look.skin === "s5") && !LOOK_NOSKIN.includes(ck)) {
      if (!LOOK_EYE[look.eye] || !LOOK_EYE[look.eye][1]) C.eye = "#0f0a08";
      C.mouth = shadeHex(C.skin, 0.55);
    }
  }

  const flap = fr && Math.floor(fr / 2) % 2 ? -1 : 0,
    breathe = fr && Math.floor(fr / 4) % 2 ? -1 : 0,
    blink = fr && fr % 17 === 0;
  // back (wings flap up and down)
  x.translate(0, flap);
  if (eq.back === "cape") {
    R(ox + 5, oy + 9, 10, 10, "#c0283a");
    R(ox + 4, oy + 15, 12, 4, "#c0283a");
    R(ox + 4, oy + 18, 12, 1, "#8e1d2b");
  }
  if (eq.back === "wings") {
    M(ox + 1, oy + 7, 3, 1, "#c9d3e3");
    M(ox, oy + 8, 4, 5, "#ffffff");
    M(ox - 1, oy + 9, 1, 3, "#c9d3e3");
    M(ox + 1, oy + 13, 3, 1, "#c9d3e3");
    M(ox + 1, oy + 10, 2, 1, "#dfe7f3");
    M(ox + 1, oy + 12, 2, 1, "#dfe7f3");
  }
  if (eq.back === "jetpack") {
    M(ox + 3, oy + 9, 2, 6, "#9aa7bd");
    M(ox + 3, oy + 9, 2, 1, "#d62839");
    M(ox + 3, oy + 15, 2, 1, "#ffd23f");
    M(ox + 3, oy + 16, 2, 1, "#ff7a1a");
    M(ox + 3, oy + 17, 1, 1, "#d62839");
  }
  if (eq.back === "dragonwings") {
    M(ox - 3, oy + 5, 1, 1, "#1b5e30");
    M(ox - 3, oy + 6, 3, 1, "#1b5e30");
    M(ox - 2, oy + 7, 6, 1, "#1b5e30");
    M(ox - 3, oy + 7, 1, 1, "#2b9348");
    M(ox - 3, oy + 8, 7, 1, "#2b9348");
    M(ox - 2, oy + 9, 6, 1, "#2b9348");
    M(ox - 1, oy + 10, 5, 1, "#2b9348");
    M(ox, oy + 11, 4, 1, "#2b9348");
    M(ox + 1, oy + 12, 3, 1, "#2b9348");
    M(ox - 1, oy + 9, 1, 1, "#7fc8a9");
    M(ox + 1, oy + 10, 1, 1, "#7fc8a9");
  }
  if (eq.back === "phoenix") {
    M(ox - 2, oy + 5, 1, 1, "#ffd23f");
    M(ox - 3, oy + 6, 3, 1, "#ffd23f");
    M(ox - 3, oy + 7, 7, 1, "#ff7a1a");
    M(ox - 2, oy + 8, 6, 2, "#ff7a1a");
    M(ox - 1, oy + 10, 5, 1, "#d62839");
    M(ox, oy + 11, 4, 1, "#d62839");
    M(ox + 1, oy + 12, 3, 1, "#ff7a1a");
    M(ox + 2, oy + 13, 2, 1, "#ffd23f");
    M(ox - 1, oy + 8, 2, 1, "#ffd23f");
    M(ox + 1, oy + 9, 1, 1, "#ffd23f");
    M(ox - 4, oy + 6, 1, 1, "#d62839");
  }
  if (eq.back === "lightwings") {
    M(ox - 3, oy + 4, 1, 1, "#ffffff");
    M(ox - 4, oy + 5, 3, 1, "#fff3a0");
    M(ox - 4, oy + 6, 7, 1, "#ffffff");
    M(ox - 3, oy + 7, 7, 2, "#fff3a0");
    M(ox - 2, oy + 9, 6, 1, "#ffffff");
    M(ox - 1, oy + 10, 5, 1, "#ffd84a");
    M(ox, oy + 11, 4, 1, "#fff3a0");
    M(ox + 1, oy + 12, 3, 1, "#ffd84a");
    M(ox - 2, oy + 7, 2, 1, "#ffffff");
  }
  if (eq.back === "cloak") {
    R(ox + 5, oy + 9, 10, 10, "#3a4a7a");
    R(ox + 4, oy + 15, 12, 4, "#3a4a7a");
    R(ox + 4, oy + 18, 12, 1, "#26325a");
    [
      [ox + 4, oy + 16],
      [ox + 15, oy + 14],
      [ox + 5, oy + 12],
      [ox + 14, oy + 17],
      [ox + 9, oy + 18],
    ].forEach(([a, b]) => P(a, b, "#8aa5f2"));
  }
  x.translate(0, -flap);
  // head + body
  // hair: light top row, darker lower row so it never melts into the face, whatever the colours
  const hairD = shadeHex(C.hair, 0.68);
  const style = masked ? "classic" : look.style || "classic";
  const topHidden = LOOK_FULLHELM.includes(eq.helmet) || ck === "space" || ck === "dragonknight"; // helmet or glass dome over the head
  R(ox + 7, oy + 2, 6, 1, C.hair);
  R(ox + 6, oy + 3, 8, 1, hairD);
  P(ox + 6, oy + 4, hairD);
  P(ox + 13, oy + 4, hairD);
  if (style === "long") {
    M(ox + 5, oy + 3, 1, 6, hairD);
    M(ox + 6, oy + 8, 1, 1, hairD);
    M(ox + 5, oy + 3, 1, 1, C.hair);
  }
  if (style === "spiky" && !topHidden) {
    P(ox + 7, oy + 1, C.hair);
    P(ox + 9, oy + 1, C.hair);
    P(ox + 11, oy + 1, C.hair);
    P(ox + 12, oy + 1, C.hair);
    P(ox + 10, oy, C.hair);
    P(ox + 8, oy, C.hair);
  }
  if (style === "mohawk" && !topHidden) {
    R(ox + 9, oy, 2, 2, C.hair);
    R(ox + 9, oy - 1, 2, 1, C.hair);
    R(ox + 9, oy + 2, 2, 1, hairD);
  }
  R(ox + 7, oy + 4, 6, 1, C.skin);
  R(ox + 6, oy + 5, 8, 2, C.skin);
  R(ox + 7, oy + 7, 6, 1, C.skin);
  P(ox + 8, oy + 5, blink ? C.skin : C.eye);
  P(ox + 11, oy + 5, blink ? C.skin : C.eye);
  R(ox + 9, oy + 7, 2, 1, C.mouth);
  R(ox + 8, oy + 8, 4, 1, C.skin);
  if (style === "bangs") {
    R(ox + 7, oy + 4, 4, 1, hairD);
    P(ox + 6, oy + 5, hairD);
  }
  R(ox + 5, oy + 9, 10, 1, C.shirt);
  R(ox + 4, oy + 10, 12, 1, C.shirt);
  R(ox + 6, oy + 11, 8, 3, C.shirt);
  R(ox + 7, oy + 14, 6, 1, C.shirt);
  R(ox + 4, oy + 11, 2, 2, C.shirt);
  R(ox + 14, oy + 11, 2, 2, C.shirt);
  R(ox + 7, oy + 15, 6, 1, C.pants);
  R(ox + 7, oy + 16, 2, 3, C.pants);
  R(ox + 11, oy + 16, 2, 3, C.pants);
  R(ox + 6, oy + 19, 3, 1, C.shoe);
  R(ox + 11, oy + 19, 3, 1, C.shoe);
  // generic shading: every outfit gets depth (lower torso, arm undersides, inner legs)
  const sh = shadeHex(C.shirt, 0.78),
    ph = shadeHex(C.pants, 0.75);
  R(ox + 6, oy + 13, 8, 1, sh);
  R(ox + 7, oy + 14, 6, 1, sh);
  M(ox + 4, oy + 12, 2, 1, sh);
  P(ox + 8, oy + 16, ph);
  P(ox + 11, oy + 16, ph);
  R(ox + 8, oy + 17, 1, 2, ph);
  R(ox + 11, oy + 17, 1, 2, ph);
  M(ox + 4, oy + 13, 1, 1, C.skin); // hands
  // costume details: each outfit has its own silhouette and signature pieces
  const twinkle = (fr || 0) % 8 < 4;
  switch (ck) {
    case "school":
      M(ox + 8, oy + 9, 1, 1, "#ffffff"); // collar
      M(ox + 7, oy + 10, 1, 4, "#d62839"); // backpack straps
      R(ox + 7, oy + 15, 6, 1, "#3b2a20");
      R(ox + 9, oy + 15, 2, 1, "#ffd23f"); // belt + buckle
      M(ox + 6, oy + 19, 1, 1, "#ffffff"); // sneaker toes
      break;
    case "ninja":
      R(ox + 6, oy + 6, 8, 1, "#1e1e28");
      R(ox + 7, oy + 7, 6, 1, "#1e1e28");
      R(ox + 6, oy + 4, 8, 1, "#d62839");
      P(ox + 14, oy + 4, "#d62839");
      P(ox + 15, oy + 5, "#d62839");
      P(ox + 16, oy + 6, "#b01f2e");
      P(ox + 8, oy + 10, "#4a4a5e");
      P(ox + 9, oy + 11, "#4a4a5e");
      P(ox + 10, oy + 11, "#4a4a5e");
      P(ox + 11, oy + 10, "#4a4a5e"); // wrap
      R(ox + 6, oy + 14, 8, 1, "#d62839");
      P(ox + 13, oy + 14, "#b01f2e");
      P(ox + 13, oy + 15, "#d62839"); // sash
      M(ox + 4, oy + 11, 2, 1, "#c9c9d6");
      M(ox + 7, oy + 17, 2, 1, "#c9c9d6"); // arm + leg wraps
      P(ox + 12, oy + 15, "#c9d3e3"); // shuriken
      break;
    case "space":
      R(ox + 6, oy + 1, 8, 1, "#8fd3ff");
      M(ox + 5, oy + 2, 1, 6, "#8fd3ff");
      P(ox + 6, oy + 2, "#e6f7ff"); // glass dome
      R(ox + 8, oy + 10, 4, 2, "#4a5670");
      P(ox + 8, oy + 10, "#ff3b3b");
      P(ox + 9, oy + 10, "#5cc95c");
      P(ox + 10, oy + 10, "#ffd23f");
      P(ox + 11, oy + 11, "#45d1e6");
      R(ox + 6, oy + 13, 8, 1, "#ff7a1a");
      M(ox + 4, oy + 12, 2, 1, "#ff7a1a"); // stripe + gloves
      M(ox + 7, oy + 17, 2, 1, "#9aa7bd");
      M(ox + 6, oy + 19, 3, 1, "#4a5670"); // knee pads + boots
      P(ox + 12, oy + 10, "#d62839");
      break;
    case "robot":
      M(ox + 5, oy + 5, 1, 1, "#ffd23f");
      R(ox + 10, oy + 1, 1, 1, "#6f7d93");
      P(ox + 10, oy, "#ff3b3b");
      R(ox + 7, oy + 6, 6, 1, "#4a5670");
      R(ox + 8, oy + 11, 4, 2, "#45d1e6");
      P(ox + 9, oy + 11, twinkle ? "#ffffff" : "#45d1e6");
      M(ox + 6, oy + 10, 1, 1, "#ffd23f");
      R(ox + 6, oy + 14, 8, 1, "#4a5670");
      M(ox + 7, oy + 17, 2, 1, "#4a5670");
      M(ox + 4, oy + 12, 2, 1, "#4a5670");
      break;
    case "fire":
      if (style === "classic") {
        P(ox + 7, oy + 1, "#ffd23f");
        P(ox + 9, oy, "#ff7a1a");
        P(ox + 9, oy + 1, "#ffd23f");
        P(ox + 12, oy + 1, "#ff7a1a");
        P(ox + 11, oy, "#ffd23f");
      }
      R(ox + 6, oy + 12, 8, 2, "#ff7a1a");
      P(ox + 7, oy + 11, "#ff7a1a");
      P(ox + 10, oy + 11, "#ff7a1a");
      P(ox + 12, oy + 11, "#ff7a1a"); // flames rising up the shirt
      P(ox + 7, oy + 13, "#ffd23f");
      P(ox + 9, oy + 12, "#ffd23f");
      P(ox + 11, oy + 13, "#ffd23f");
      P(ox + 12, oy + 12, "#ffd23f");
      M(ox + 4, oy + 10, 1, 1, "#ffd23f");
      M(ox + 5, oy + 9, 1, 1, "#ff7a1a"); // burning shoulders
      R(ox + 7, oy + 14, 6, 1, "#2a1a10");
      P(ox + 9, oy + 14, twinkle ? "#ffd23f" : "#ff7a1a"); // belt with ember
      M(ox + 7, oy + 18, 2, 1, "#ff7a1a");
      M(ox + 6, oy + 19, 1, 1, "#ffd23f");
      break;
    case "ice":
      if (style === "classic") {
        P(ox + 7, oy + 1, "#bfe6ff");
        P(ox + 10, oy, "#bfe6ff");
        P(ox + 10, oy + 1, "#e6f7ff");
        P(ox + 12, oy + 1, "#bfe6ff");
      }
      R(ox + 9, oy + 10, 2, 3, "#ffffff");
      R(ox + 8, oy + 11, 4, 1, "#ffffff");
      P(ox + 7, oy + 10, "#e6f7ff");
      P(ox + 12, oy + 12, "#e6f7ff"); // snowflake
      M(ox + 4, oy + 9, 1, 1, "#e6f7ff");
      M(ox + 3, oy + 10, 1, 1, "#bfe6ff");
      M(ox + 3, oy + 9, 1, 1, "#ffffff"); // crystal shoulders
      R(ox + 6, oy + 14, 8, 1, "#bfe6ff");
      M(ox + 6, oy + 19, 3, 1, "#e6f7ff");
      M(ox + 7, oy + 18, 2, 1, "#bfe6ff");
      break;
    case "shadow":
      R(ox + 6, oy + 1, 8, 1, "#2a2238");
      R(ox + 5, oy + 2, 10, 1, "#2a2238");
      M(ox + 5, oy + 3, 1, 5, "#2a2238"); // hood
      R(ox + 6, oy + 15, 8, 4, "#1a1428");
      R(ox + 5, oy + 17, 10, 2, "#1a1428");
      [6, 8, 10, 12].forEach((a) => P(ox + a, oy + 19, "#1a1428")); // ragged robe
      P(ox + 4, oy + 17, twinkle ? "#7a4fd6" : "#3d2a6b");
      P(ox + 15, oy + 16, twinkle ? "#3d2a6b" : "#7a4fd6");
      P(ox + 9, oy + 12, "#7a4fd6");
      break;
    case "gold":
      M(ox + 5, oy + 3, 1, 1, "#ffd84a");
      M(ox + 5, oy + 4, 1, 1, "#5cc95c");
      M(ox + 6, oy + 2, 1, 1, "#5cc95c");
      P(ox + 9, oy + 1, "#ffd84a");
      P(ox + 10, oy + 1, "#ffd84a"); // golden laurel
      M(ox + 3, oy + 9, 3, 2, "#ffd84a");
      M(ox + 3, oy + 9, 1, 1, "#ffffff");
      M(ox + 3, oy + 11, 2, 1, "#b07800"); // pauldrons
      R(ox + 9, oy + 10, 2, 1, "#ffffff");
      R(ox + 8, oy + 11, 4, 2, "#d62839");
      R(ox + 9, oy + 11, 2, 1, "#ff7a7a"); // ruby medal
      R(ox + 6, oy + 14, 8, 1, "#7a5200");
      R(ox + 9, oy + 14, 2, 1, "#d62839");
      M(ox + 6, oy + 19, 3, 1, "#ffd84a");
      M(ox + 7, oy + 18, 2, 1, "#f0a000");
      P(ox + 12, oy + 10, twinkle ? "#ffffff" : "#ffd84a");
      break;
    case "cyberninja":
      R(ox + 6, oy + 6, 8, 1, "#1e1e28");
      R(ox + 7, oy + 7, 6, 1, "#1e1e28");
      R(ox + 6, oy + 4, 8, 1, "#45d1e6");
      P(ox + 14, oy + 4, "#45d1e6");
      P(ox + 15, oy + 5, "#ff4fd8");
      P(ox + 16, oy + 6, "#ff4fd8");
      R(ox + 9, oy + 10, 1, 4, "#ff4fd8");
      R(ox + 10, oy + 12, 3, 1, "#45d1e6");
      P(ox + 7, oy + 11, "#45d1e6");
      P(ox + 7, oy + 12, "#45d1e6"); // neon circuit
      M(ox + 4, oy + 11, 1, 1, "#45d1e6");
      R(ox + 7, oy + 14, 6, 1, "#45d1e6");
      M(ox + 7, oy + 17, 2, 1, twinkle ? "#ff4fd8" : "#45d1e6");
      break;
    case "dragonknight":
      R(ox + 7, oy + 1, 6, 1, "#2b9348");
      R(ox + 6, oy + 2, 8, 1, "#2b9348");
      M(ox + 6, oy + 3, 1, 2, "#2b9348"); // scaled hood
      M(ox + 5, oy + 1, 1, 1, "#f2e6c9");
      M(ox + 4, oy, 1, 1, "#f2e6c9");
      P(ox + 9, oy + 1, "#ffd23f");
      P(ox + 10, oy, "#ffd23f"); // horns + crest
      [
        [7, 10],
        [9, 11],
        [11, 10],
        [8, 12],
        [12, 12],
        [10, 13],
        [6, 11],
        [13, 11],
      ].forEach(([a, b]) => P(ox + a, oy + b, "#1b5e30")); // scales
      M(ox + 3, oy + 9, 2, 2, "#1b5e30");
      M(ox + 3, oy + 8, 1, 1, "#ffd23f");
      M(ox + 4, oy + 12, 2, 1, "#ffd23f"); // spiked shoulders, gauntlets
      R(ox + 6, oy + 14, 8, 1, "#7a4a26");
      R(ox + 9, oy + 14, 2, 1, "#ffd23f");
      M(ox + 6, oy + 19, 3, 1, "#1b5e30");
      M(ox + 6, oy + 19, 1, 1, "#ffd23f"); // claw boots
      break;
    case "alien":
      P(ox + 8, oy + 1, "#5cc95c");
      P(ox + 7, oy, "#ffd23f");
      P(ox + 11, oy + 1, "#5cc95c");
      P(ox + 12, oy, twinkle ? "#ffffff" : "#ffd23f");
      R(ox + 8, oy + 5, 1, 2, "#111111");
      R(ox + 11, oy + 5, 1, 2, "#111111");
      R(ox + 8, oy + 11, 4, 1, "#ffd23f");
      R(ox + 9, oy + 10, 2, 3, "#9df58a");
      R(ox + 6, oy + 14, 8, 1, "#ffd23f");
      M(ox + 4, oy + 12, 2, 1, "#5cc95c");
      break;
    case "skeleton":
      [
        [7, 10],
        [7, 12],
        [12, 10],
        [12, 12],
      ].forEach(([a, b]) => P(ox + a, oy + b, "#e9e4d4"));
      R(ox + 9, oy + 10, 2, 4, "#e9e4d4");
      R(ox + 8, oy + 11, 4, 1, "#e9e4d4");
      R(ox + 8, oy + 16, 1, 3, "#e9e4d4");
      R(ox + 11, oy + 16, 1, 3, "#e9e4d4");
      P(ox + 9, oy + 7, "#e9e4d4");
      M(ox + 4, oy + 11, 2, 1, "#e9e4d4");
      P(ox + 8, oy + 5, twinkle ? "#45d1e6" : "#111111");
      break;
    case "galaxy":
      R(ox + 6, oy + 10, 3, 2, "#3d2a6b");
      R(ox + 11, oy + 12, 3, 2, "#5a2a6b"); // nebula
      R(ox + 9, oy + 11, 2, 2, "#ff7a1a");
      R(ox + 8, oy + 12, 4, 1, "#ffd23f");
      P(ox + 9, oy + 11, "#ffd8a8"); // ringed planet
      [
        [7, 13],
        [12, 10],
        [6, 12],
        [13, 13],
        [8, 16],
        [12, 17],
      ].forEach(([a, b], i) => P(ox + a, oy + b, ["#ffffff", "#c77dff", "#45d1e6"][(i + (twinkle ? 1 : 0)) % 3]));
      M(ox + 4, oy + 10, 1, 1, "#c77dff");
      M(ox + 6, oy + 19, 3, 1, "#3d2a6b");
      P(ox + 8, oy + 2, "#c77dff");
      P(ox + 11, oy + 3, "#ffffff");
      break;
    case "cyborg":
      R(ox + 10, oy + 4, 4, 4, "#9aa7bd");
      P(ox + 11, oy + 5, "#ff3b3b");
      P(ox + 12, oy + 5, twinkle ? "#ff7a7a" : "#ff3b3b");
      P(ox + 13, oy + 7, "#6f7d93");
      R(ox + 13, oy + 9, 3, 4, "#9aa7bd");
      P(ox + 15, oy + 11, "#ff3b3b");
      P(ox + 14, oy + 13, "#6f7d93");
      P(ox + 15, oy + 13, "#6f7d93"); // mech arm
      R(ox + 9, oy + 9, 1, 5, "#3a3a3a");
      P(ox + 7, oy + 11, "#ff3b3b");
      R(ox + 11, oy + 16, 2, 1, "#9aa7bd");
      P(ox + 11, oy + 17, "#6f7d93");
      break;
    case "spaceknight":
      R(ox + 7, oy + 5, 6, 1, twinkle ? "#a8f0ff" : "#45d1e6");
      R(ox + 6, oy + 2, 8, 1, "#4a5670");
      P(ox + 10, oy + 1, "#45d1e6");
      P(ox + 10, oy, "#ffffff");
      M(ox + 3, oy + 9, 3, 2, "#4a5670");
      M(ox + 3, oy + 9, 3, 1, "#45d1e6"); // pauldrons
      R(ox + 9, oy + 11, 2, 2, "#45d1e6");
      P(ox + 9, oy + 11, "#ffffff");
      R(ox + 7, oy + 14, 6, 1, "#45d1e6");
      M(ox + 7, oy + 17, 2, 1, "#4a5670");
      M(ox + 6, oy + 19, 3, 1, "#45d1e6");
      break;
    case "tatar":
      R(ox + 6, oy + 10, 8, 4, "#7a1f2b");
      R(ox + 9, oy + 9, 2, 3, "#ffffff"); // velvet kamzol over a white shirt
      R(ox + 8, oy + 10, 1, 4, "#f0a000");
      R(ox + 11, oy + 10, 1, 4, "#f0a000");
      P(ox + 9, oy + 12, "#d62839");
      P(ox + 10, oy + 12, "#d62839"); // gold trim, embroidered collar
      P(ox + 7, oy + 11, "#ffd84a");
      P(ox + 12, oy + 11, "#ffd84a");
      P(ox + 7, oy + 13, "#f0a000");
      P(ox + 12, oy + 13, "#f0a000"); // ornament
      M(ox + 4, oy + 12, 2, 1, "#d62839");
      M(ox + 5, oy + 9, 1, 1, "#e6e6e6"); // embroidered cuffs
      R(ox + 6, oy + 14, 8, 1, "#2b9348");
      P(ox + 12, oy + 15, "#2b9348");
      P(ox + 12, oy + 16, "#ffd23f"); // sash with tassel
      M(ox + 7, oy + 17, 2, 2, "#2b9348");
      M(ox + 7, oy + 18, 1, 1, "#d62839");
      M(ox + 8, oy + 17, 1, 1, "#ffd23f"); // ichigi boots with tulip pattern
      M(ox + 6, oy + 19, 3, 1, "#1b6b3a");
      M(ox + 6, oy + 19, 1, 1, "#ffd23f");
      break;
    case "wordlord": {
      R(ox + 7, oy + 1, 6, 1, "#f0a000");
      P(ox + 7, oy, "#f0a000");
      P(ox + 9, oy, "#f0a000");
      P(ox + 10, oy, "#f0a000");
      P(ox + 12, oy, "#f0a000"); // crown
      P(ox + 9, oy - 1, "#ffd84a");
      P(ox + 10, oy - 1, "#ffd84a");
      P(ox + 9, oy + 1, "#45d1e6");
      P(ox + 10, oy + 1, "#d62839");
      M(ox + 6, oy + 8, 1, 2, "#ffd84a"); // high collar
      R(ox + 6, oy + 15, 8, 4, "#7a4fd6");
      R(ox + 5, oy + 17, 10, 2, "#7a4fd6");
      R(ox + 5, oy + 19, 10, 1, "#f0a000"); // royal robe to the floor
      R(ox + 9, oy + 13, 2, 6, "#f0a000"); // gold trim
      R(ox + 7, oy + 10, 6, 2, "#fff7e0");
      R(ox + 9, oy + 10, 2, 2, "#f0a000");
      P(ox + 7, oy + 10, "#7a4fd6");
      P(ox + 12, oy + 11, "#7a4fd6"); // open book
      M(ox + 4, oy + 10, 2, 1, "#ffd84a");
      const gl = (fr || 0) % 12; // floating golden letters
      P(ox + 2, oy + 6 - (gl < 6 ? 0 : 1), "#ffd84a");
      P(ox + 17, oy + 3 + (gl < 6 ? 1 : 0), "#fff3a0");
      if (twinkle) P(ox + 3, oy + 14, "#ffd84a");
      break;
    }
  }
  outlined(() => {
    // armor: a real armour set worn OVER the outfit, so it never melts into the costume:
    // narrower breastplate (shirt shows at the sides), pauldrons sticking out past the shoulders,
    // belt with tassets, bracers and greaves; every plate gets a light top edge and a dark bottom edge
    const plate = (a, b, w, h, c) => {
      R(a, b, w, h, c);
      R(a, b, w, 1, shadeHex(c, 1.3));
      if (h > 1) R(a, b + h - 1, w, 1, shadeHex(c, 0.7));
    };
    const mplate = (a, b, w, h, c) => {
      plate(a, b, w, h, c);
      plate(2 * (ox + 10) - (a + w), b, w, h, c);
    };
    const set = (o) => {
      if (o.chest) plate(ox + 7, oy + 10, 6, 4, o.chest);
      if (o.pad) mplate(ox + o.padX, oy + 8, o.padW, 3, o.pad);
      if (o.belt) R(ox + 7, oy + 14, 6, 1, o.belt);
      if (o.tasset) M(ox + 7, oy + 15, 2, 1, o.tasset);
      if (o.bracer) M(ox + 4, oy + 12, 2, 1, o.bracer);
      if (o.greave) mplate(ox + 7, oy + 17, 2, 2, o.greave);
    };
    switch (eq.armor) {
      case "pads": // leather pads with steel studs, chest strap
        mplate(ox + 3, oy + 9, 3, 2, "#8a5a2b");
        M(ox + 3, oy + 8, 1, 1, "#e3e8f0");
        M(ox + 5, oy + 8, 1, 1, "#e3e8f0");
        for (let k = 0; k < 4; k++)
          (P(ox + 7 + k * 2, oy + 10 + k, "#5a3a1a"), P(ox + 8 + k * 2, oy + 10 + k, "#5a3a1a"));
        P(ox + 9, oy + 11, "#e3e8f0");
        break;
      case "steel":
        set({
          chest: "#c9d3e3",
          pad: "#9aa7bd",
          padX: 3,
          padW: 3,
          belt: "#4a3a2a",
          tasset: "#9aa7bd",
          bracer: "#9aa7bd",
          greave: "#9aa7bd",
        });
        R(ox + 9, oy + 11, 2, 2, "#6f7d93");
        P(ox + 9, oy + 10, "#ffffff");
        break;
      case "spikearmor":
        set({
          chest: "#4a5670",
          pad: "#2b2b3a",
          padX: 3,
          padW: 3,
          belt: "#2b2b3a",
          bracer: "#2b2b3a",
          greave: "#4a5670",
        });
        M(ox + 2, oy + 8, 1, 1, "#e3e8f0");
        M(ox + 3, oy + 7, 1, 1, "#e3e8f0");
        M(ox + 5, oy + 7, 1, 1, "#e3e8f0");
        M(ox + 1, oy + 9, 1, 1, "#e3e8f0");
        P(ox + 8, oy + 11, "#e3e8f0");
        P(ox + 11, oy + 11, "#e3e8f0");
        P(ox + 9, oy + 12, "#e3e8f0");
        P(ox + 10, oy + 12, "#e3e8f0");
        break;
      case "cyber":
        set({
          chest: "#1f2440",
          pad: "#1f2440",
          padX: 3,
          padW: 3,
          belt: "#45d1e6",
          bracer: "#45d1e6",
          greave: "#1f2440",
        });
        R(ox + 7, oy + 10, 1, 4, "#45d1e6");
        R(ox + 12, oy + 10, 1, 4, "#45d1e6");
        R(ox + 9, oy + 11, 2, 2, (fr || 0) % 6 < 3 ? "#ff4fd8" : "#ffffff");
        M(ox + 3, oy + 8, 3, 1, "#45d1e6");
        M(ox + 7, oy + 17, 2, 1, "#45d1e6");
        break;
      case "goldarmor":
        set({
          chest: "#f0a000",
          pad: "#ffd84a",
          padX: 2,
          padW: 4,
          belt: "#7a5200",
          tasset: "#f0a000",
          bracer: "#ffd84a",
          greave: "#f0a000",
        });
        R(ox + 9, oy + 11, 2, 2, "#d62839");
        P(ox + 9, oy + 11, "#ff8a8a");
        M(ox + 2, oy + 8, 1, 1, "#ffffff");
        P(ox + 8, oy + 10, "#ffffff");
        break;
      case "dragonarmor":
        set({
          chest: "#2b9348",
          pad: "#1b5e30",
          padX: 2,
          padW: 4,
          belt: "#7a4a26",
          tasset: "#1b5e30",
          bracer: "#ffd23f",
          greave: "#1b5e30",
        });
        [
          [8, 11],
          [10, 11],
          [9, 12],
          [11, 12],
        ].forEach(([a, b]) => P(ox + a, oy + b, "#1b5e30"));
        M(ox + 2, oy + 7, 1, 1, "#ffd23f");
        M(ox + 3, oy + 6, 1, 1, "#ffd23f");
        M(ox + 5, oy + 7, 1, 1, "#ffd23f");
        R(ox + 9, oy + 10, 2, 1, "#ffd23f");
        break;
      case "mech": // heavy powered suit: big blocks, hazard stripes, glowing core
        set({
          chest: "#6f7d93",
          pad: "#4a5670",
          padX: 1,
          padW: 5,
          belt: "#2a2f4a",
          tasset: "#4a5670",
          bracer: "#ff7a1a",
          greave: "#4a5670",
        });
        M(ox + 1, oy + 8, 5, 1, "#ff7a1a");
        M(ox + 2, oy + 10, 1, 1, "#ffd23f");
        R(ox + 9, oy + 11, 2, 2, "#45d1e6");
        P(ox + 9, oy + 11, "#ffffff");
        R(ox + 7, oy + 13, 6, 1, "#ffd23f");
        P(ox + 8, oy + 13, "#2a2f4a");
        P(ox + 10, oy + 13, "#2a2f4a");
        P(ox + 12, oy + 13, "#2a2f4a");
        M(ox + 7, oy + 18, 2, 1, "#ff7a1a");
        break;
      case "titan":
        set({
          chest: "#2a2238",
          pad: "#3d3550",
          padX: 1,
          padW: 5,
          belt: "#d62839",
          tasset: "#3d3550",
          bracer: "#d62839",
          greave: "#2a2238",
        });
        R(ox + 9, oy + 11, 2, 2, "#d62839");
        P(ox + 8, oy + 12, "#d62839");
        P(ox + 11, oy + 12, "#d62839");
        M(ox + 1, oy + 7, 1, 1, "#e3e8f0");
        M(ox + 3, oy + 6, 1, 1, "#e3e8f0");
        M(ox + 5, oy + 7, 1, 1, "#e3e8f0");
        M(ox + 0, oy + 9, 1, 1, "#e3e8f0");
        M(ox + 3, oy + 5, 1, 1, "#d62839");
        break;
      case "stararmor":
        set({
          chest: "#1b1446",
          pad: "#3d2a6b",
          padX: 2,
          padW: 4,
          belt: "#c77dff",
          tasset: "#3d2a6b",
          bracer: "#c77dff",
          greave: "#1b1446",
        });
        [
          [7, 10],
          [12, 11],
          [9, 12],
          [10, 10],
          [8, 13],
          [11, 13],
        ].forEach(([a, b], i) =>
          P(ox + a, oy + b, ["#ffffff", "#ffd23f", "#c77dff"][(i + ((fr || 0) % 6 < 3 ? 0 : 1)) % 3]),
        );
        M(ox + 3, oy + 8, 1, 1, "#ffffff");
        R(ox + 9, oy + 11, 2, 1, "#ffd23f");
        break;
      case "supernova":
        set({
          chest: "#fff3a0",
          pad: "#f0a000",
          padX: 1,
          padW: 5,
          belt: "#ff7a1a",
          tasset: "#f0a000",
          bracer: "#ffffff",
          greave: "#f0a000",
        });
        R(ox + 9, oy + 10, 2, 3, "#ffffff");
        R(ox + 8, oy + 11, 4, 1, "#ffd23f");
        P(ox + 7, oy + 10, "#ff7a1a");
        P(ox + 12, oy + 10, "#ff7a1a");
        P(ox + 7, oy + 13, "#ff4fd8");
        P(ox + 12, oy + 13, "#ff4fd8");
        M(ox + 1, oy + 8, 5, 1, "#ffffff");
        M(ox + 0, oy + 7, 1, 1, (fr || 0) % 6 < 3 ? "#ffffff" : "#fff3a0");
        M(ox + 3, oy + 6, 1, 1, "#fff3a0");
        break;
    }
    // helmet

    if (eq.helmet === "knight" || eq.helmet === "horns") {
      R(ox + 7, oy + 1, 6, 1, "#b9c4d6");
      R(ox + 6, oy + 2, 8, 2, "#b9c4d6");
      R(ox + 6, oy + 4, 8, 1, "#6f7d93");
      M(ox + 6, oy + 5, 1, 1, "#b9c4d6");
      if (eq.helmet === "knight") R(ox + 9, oy - 1, 2, 2, "#d62839");
      else {
        M(ox + 5, oy + 2, 1, 1, "#f2e6c9");
        M(ox + 4, oy + 1, 1, 1, "#f2e6c9");
        M(ox + 4, oy, 1, 1, "#f2e6c9");
        M(ox + 5, oy - 1, 1, 1, "#f2e6c9");
      }
    }
    if (eq.helmet === "visor") {
      R(ox + 6, oy + 4, 8, 1, "#1f2440");
      R(ox + 6, oy + 5, 8, 1, "#45d1e6");
      M(ox + 5, oy + 4, 1, 2, "#1f2440");
      P(ox + 14, oy + 2, "#45d1e6");
      R(ox + 14, oy + 3, 1, 1, "#1f2440");
    }
    if (eq.helmet === "crown") {
      R(ox + 7, oy + 1, 6, 1, "#f0a000");
      P(ox + 7, oy, "#f0a000");
      P(ox + 9, oy, "#f0a000");
      P(ox + 10, oy, "#f0a000");
      P(ox + 12, oy, "#f0a000");
      P(ox + 9, oy + 1, "#d62839");
      P(ox + 10, oy + 1, "#45d1e6");
      P(ox + 8, oy - 1, "#ffd84a");
      P(ox + 11, oy - 1, "#ffd84a");
    }
    if (eq.helmet === "dragonhelm") {
      R(ox + 7, oy + 1, 6, 1, "#2b9348");
      R(ox + 6, oy + 2, 8, 2, "#2b9348");
      R(ox + 6, oy + 4, 8, 1, "#1b5e30");
      M(ox + 6, oy + 5, 1, 1, "#2b9348");
      M(ox + 5, oy + 1, 1, 1, "#ffd23f");
      M(ox + 4, oy, 1, 1, "#ffd23f");
      M(ox + 4, oy - 1, 1, 1, "#ffd23f");
      P(ox + 9, oy, "#ff7a1a");
      P(ox + 10, oy, "#ff7a1a");
      P(ox + 10, oy - 1, "#ffd23f");
      P(ox + 8, oy + 3, "#ffd23f");
      P(ox + 11, oy + 3, "#ffd23f");
    }
    if (eq.helmet === "spacehelm") {
      R(ox + 6, oy + 1, 8, 1, "#e3e8f0");
      R(ox + 5, oy + 2, 10, 5, "#e3e8f0");
      R(ox + 7, oy + 4, 6, 2, "#ff7a1a");
      P(ox + 8, oy + 4, "#ffd8a8");
      R(ox + 6, oy + 7, 8, 1, "#b9c4d6");
      R(ox + 13, oy - 1, 1, 2, "#9aa7bd");
      P(ox + 13, oy - 2, "#ff3b3b");
      P(ox + 6, oy + 3, "#45d1e6");
      P(ox + 5, oy + 5, "#9aa7bd");
    }
    if (eq.helmet === "halo") {
      R(ox + 7, oy - 1, 6, 1, "#ffd84a");
      P(ox + 6, oy, "#ffd84a");
      P(ox + 13, oy, "#ffd84a");
      R(ox + 8, oy, 4, 1, "#fff3a0");
      P(ox + 5, oy - 2, "#fff3a0");
      P(ox + 14, oy - 2, "#fff3a0");
    }
    if (eq.helmet === "galaxycrown") {
      R(ox + 7, oy + 1, 6, 1, "#7a4fd6");
      [
        [7, 0],
        [9, -1],
        [10, -2],
        [12, 0],
        [8, 0],
        [11, -1],
      ].forEach(([a, b], i) => P(ox + a, oy + b, ["#ffffff", "#ffd23f", "#45d1e6"][i % 3]));
      P(ox + 9, oy + 1, "#45d1e6");
      P(ox + 10, oy + 1, "#ff4fd8");
      P(ox + 6, oy - 1, "#ffffff");
      P(ox + 13, oy - 2, "#ffd23f");
    }
    if (eq.helmet === "darkcrown") {
      R(ox + 7, oy + 1, 6, 1, "#2a2238");
      [
        [7, 0],
        [7, -1],
        [9, 0],
        [9, -1],
        [9, -2],
        [10, 0],
        [10, -1],
        [10, -2],
        [12, 0],
        [12, -1],
        [8, 0],
        [11, 0],
      ].forEach(([a, b]) => P(ox + a, oy + b, "#2a2238"));
      P(ox + 9, oy + 1, "#d62839");
      P(ox + 10, oy + 1, "#ff3b3b");
      P(ox + 7, oy - 2, "#7a4fd6");
      P(ox + 12, oy - 2, "#7a4fd6");
      P(ox + 9, oy - 3, "#ff3b3b");
    }
  });
  if (eq.helmet === "tubeteika") {
    // green velvet cap with gold and red embroidery
    R(ox + 7, oy + 1, 6, 1, "#1b6b3a");
    R(ox + 6, oy + 2, 8, 1, "#1b6b3a");
    R(ox + 6, oy + 3, 8, 1, "#0f4a28");
    P(ox + 8, oy + 1, "#ffd23f");
    P(ox + 11, oy + 1, "#ffd23f");
    P(ox + 9, oy + 1, "#d62839");
    P(ox + 10, oy + 1, "#d62839");
    P(ox + 7, oy + 2, "#ffd23f");
    P(ox + 9, oy + 2, "#ffffff");
    P(ox + 10, oy + 2, "#ffd23f");
    P(ox + 12, oy + 2, "#ffffff");
    P(ox + 7, oy + 3, "#ffd23f");
    P(ox + 9, oy + 3, "#d62839");
    P(ox + 10, oy + 3, "#ffd23f");
    P(ox + 12, oy + 3, "#d62839");
  }
  if (eq.helmet === "band") {
    R(ox + 6, oy + 3, 8, 1, "#d62839");
    P(ox + 14, oy + 3, "#d62839");
    P(ox + 15, oy + 4, "#d62839");
    P(ox + 16, oy + 5, "#b01f2e");
  }
  // weapon (rises and falls a little, like breathing)
  x.translate(0, breathe);
  const wx = ox + 16;
  switch (eq.weapon) {
    case "dualblaster":
      R(wx - 1, oy + 8, 6, 2, "#d62839");
      R(wx + 5, oy + 8, 3, 1, "#2b2b3a");
      P(wx + 1, oy + 8, "#ffd23f");
      R(wx, oy + 10, 1, 1, "#2b2b3a");
      R(wx - 1, oy + 11, 6, 2, "#d62839");
      R(wx + 5, oy + 11, 3, 1, "#2b2b3a");
      P(wx + 1, oy + 11, "#ffd23f");
      R(wx, oy + 13, 2, 2, "#2b2b3a");
      P(wx + 4, oy + 9, "#ff7a1a");
      P(wx + 4, oy + 12, "#ff7a1a");
      break;
    case "railgun":
      R(wx - 3, oy + 10, 11, 2, "#2a2f4a");
      R(wx - 3, oy + 9, 11, 1, "#45d1e6");
      R(wx - 3, oy + 12, 11, 1, "#45d1e6");
      for (let k = 0; k < 5; k++) P(wx - 2 + k * 2, oy + 10, "#a8f0ff");
      R(wx + 7, oy + 9, 1, 4, "#ffffff");
      R(wx - 1, oy + 13, 2, 2, "#2b2b3a");
      P(wx, oy + 8, "#2a2f4a");
      break;
    case "annihilator":
      R(wx - 3, oy + 8, 11, 6, "#1b1b1b");
      R(wx - 3, oy + 9, 11, 1, "#ff4fd8");
      R(wx - 3, oy + 12, 11, 1, "#ff4fd8");
      R(wx, oy + 10, 3, 2, "#ffffff");
      P(wx - 1, oy + 10, "#ff4fd8");
      P(wx + 3, oy + 11, "#ff4fd8");
      R(wx + 7, oy + 7, 1, 8, "#ff4fd8");
      R(wx, oy + 6, 2, 2, "#2a2f4a");
      P(wx + 1, oy + 6, "#ff3b3b");
      R(wx - 1, oy + 14, 2, 2, "#2b2b3a");
      P(wx - 3, oy + 7, "#ff4fd8");
      break;
    case "comet":
      R(wx, oy - 2, 1, 16, "#9aa7bd");
      R(wx - 1, oy - 4, 3, 3, "#45d1e6");
      P(wx, oy - 5, "#ffffff");
      P(wx, oy - 3, "#ffffff");
      P(wx - 2, oy - 2, "#a8f0ff");
      P(wx + 2, oy - 1, "#a8f0ff");
      P(wx - 2, oy + 1, "#45d1e6");
      P(wx + 2, oy + 3, "#a8f0ff");
      R(wx, oy + 12, 1, 2, "#4a5670");
      break;
    case "blackhole":
      R(wx - 2, oy + 8, 8, 5, "#1b1446");
      R(wx + 3, oy + 7, 4, 7, "#7a4fd6");
      R(wx + 4, oy + 9, 2, 3, "#000000");
      P(wx + 3, oy + 7, "#c77dff");
      P(wx + 6, oy + 13, "#c77dff");
      P(wx + 7, oy + 10, "#ff4fd8");
      P(wx - 1, oy + 9, "#c77dff");
      P(wx + 1, oy + 11, "#c77dff");
      R(wx - 1, oy + 13, 2, 2, "#2a2238");
      break;
    case "novasword":
      R(wx, oy - 5, 3, 16, "#fff3a0");
      R(wx + 1, oy - 5, 1, 16, "#ffffff");
      P(wx - 1, oy - 3, "#ffd23f");
      P(wx + 3, oy, "#ff7a1a");
      P(wx - 1, oy + 3, "#ff7a1a");
      P(wx + 3, oy + 6, "#ffd23f");
      R(wx - 2, oy + 11, 7, 1, "#f0a000");
      P(wx + 1, oy + 11, "#45d1e6");
      R(wx + 1, oy + 12, 1, 2, "#6b4e31");
      break;
    case "scythe":
      R(wx, oy - 2, 1, 16, "#3d2a6b");
      R(wx - 6, oy - 3, 7, 1, "#c77dff");
      R(wx - 7, oy - 2, 2, 1, "#c77dff");
      R(wx - 8, oy - 1, 1, 2, "#c77dff");
      R(wx - 5, oy - 2, 5, 1, "#f3e0ff");
      P(wx + 1, oy - 3, "#ff4fd8");
      break;
    case "greatsword":
      R(wx, oy - 3, 3, 14, "#ff7a1a");
      R(wx + 1, oy - 3, 1, 14, "#ffd23f");
      P(wx - 1, oy - 1, "#d62839");
      P(wx + 3, oy + 2, "#d62839");
      P(wx - 1, oy + 5, "#ffd23f");
      P(wx + 3, oy + 7, "#ff7a1a");
      P(wx + 1, oy - 4, "#ffd23f");
      R(wx - 2, oy + 11, 7, 1, "#3b2a20");
      R(wx + 1, oy + 12, 1, 2, "#6b4e31");
      break;
    case "rocket":
      R(wx - 3, oy + 9, 10, 3, "#4a6b3a");
      R(wx - 3, oy + 9, 10, 1, "#5d8a48");
      R(wx + 5, oy + 10, 2, 1, "#d62839");
      P(wx + 7, oy + 10, "#ffd23f");
      P(wx, oy + 8, "#2b2b3a");
      P(wx + 1, oy + 8, "#2b2b3a");
      R(wx - 1, oy + 12, 2, 2, "#2b2b3a");
      P(wx - 3, oy + 10, "#2b2b3a");
      break;
    case "galaxystaff":
      R(wx, oy, 1, 14, "#2a2238");
      R(wx - 2, oy - 4, 5, 4, "#3d2a6b");
      R(wx - 3, oy - 2, 7, 1, "#c77dff");
      P(wx - 1, oy - 3, "#ffffff");
      P(wx + 1, oy - 2, "#ffd23f");
      P(wx, oy - 4, "#c77dff");
      P(wx + 1, oy - 4, "#ffffff");
      P(wx - 1, oy - 1, "#45d1e6");
      break;
    case "gravhammer":
      R(wx, oy + 3, 2, 10, "#2a2238");
      R(wx - 3, oy - 2, 8, 5, "#1f2440");
      R(wx - 2, oy - 1, 6, 3, "#7a4fd6");
      R(wx, oy, 2, 1, "#ff4fd8");
      P(wx - 4, oy, "#c77dff");
      P(wx + 5, oy, "#c77dff");
      P(wx, oy - 3, "#c77dff");
      break;
    case "dragonblade":
      R(wx, oy - 4, 2, 15, "#e3e8f0");
      R(wx + 1, oy - 4, 1, 15, "#9aa7bd");
      [2, 5, 8].forEach((k) => P(wx, oy + k, "#ff7a1a"));
      R(wx - 2, oy + 11, 6, 1, "#2b9348");
      P(wx - 2, oy + 10, "#2b9348");
      P(wx + 3, oy + 10, "#2b9348");
      P(wx, oy + 11, "#ffd23f");
      R(wx, oy + 12, 2, 1, "#1b5e30");
      break;
    case "absolute":
      R(wx - 1, oy - 4, 3, 12, "#fff3a0");
      R(wx, oy - 4, 1, 15, "#f0a000");
      [
        [-2, -2],
        [-2, 1],
        [-2, 4],
        [2, -1],
        [2, 2],
        [2, 5],
      ].forEach(([a, b]) => P(wx + a, oy + b, "#ffd84a"));
      R(wx, oy + 11, 1, 2, "#ffffff");
      P(wx, oy - 5, "#ffffff");
      P(wx - 3, oy - 3, "#fff3a0");
      P(wx + 3, oy, "#fff3a0");
      break;
    case "ruler":
      R(wx, oy - 1, 2, 14, "#f5d76e");
      for (let k = 0; k < 7; k++) P(wx, oy + k * 2, "#8a6d1e");
      break;
    case "pen":
      P(wx, oy + 1, "#e3e8f0");
      R(wx, oy + 2, 2, 10, "#1f4fd1");
      R(wx + 1, oy + 3, 1, 5, "#0b1640");
      R(wx, oy + 12, 2, 1, "#0b1640");
      break;
    case "spikebat":
      R(wx, oy + 9, 2, 4, "#8a5a2b");
      R(wx - 1, oy + 1, 4, 8, "#a8743f");
      R(wx, oy, 2, 1, "#a8743f");
      [
        [wx - 2, oy + 2],
        [wx - 2, oy + 5],
        [wx - 2, oy + 8],
        [wx + 3, oy + 2],
        [wx + 3, oy + 5],
        [wx + 3, oy + 8],
        [wx, oy - 1],
        [wx + 1, oy - 1],
      ].forEach(([a, b]) => P(a, b, "#e3e8f0"));
      break;
    case "blaster":
      R(wx - 1, oy + 10, 6, 3, "#4a5670");
      R(wx + 5, oy + 11, 3, 1, "#2b2b3a");
      P(wx + 1, oy + 11, "#45d1e6");
      P(wx + 2, oy + 11, "#45d1e6");
      R(wx, oy + 13, 2, 2, "#2b2b3a");
      break;
    case "firestaff":
      R(wx, oy, 1, 14, "#6b4e31");
      R(wx - 1, oy - 3, 3, 3, "#ff7a1a");
      P(wx, oy - 2, "#ffd23f");
      P(wx - 1, oy - 4, "#d62839");
      P(wx + 1, oy - 4, "#ffd23f");
      P(wx, oy - 4, "#ff7a1a");
      break;
    case "lasersword":
      R(wx, oy + 11, 2, 2, "#4a5670");
      R(wx - 1, oy + 10, 4, 1, "#9aa7bd");
      R(wx, oy - 3, 2, 13, "#7ff0ff");
      R(wx, oy - 3, 1, 13, "#ffffff");
      break;
    case "hammer":
      R(wx, oy + 3, 2, 10, "#6b4e31");
      R(wx - 2, oy - 1, 6, 4, "#9aa7bd");
      R(wx - 2, oy + 2, 6, 1, "#6f7d93");
      P(wx, oy, "#ffd23f");
      P(wx + 1, oy + 1, "#ffd23f");
      P(wx + 1, oy - 1, "#ffd23f");
      break;
    case "goldsword":
      R(wx, oy - 2, 2, 12, "#ffd84a");
      R(wx + 1, oy - 2, 1, 12, "#f0a000");
      P(wx, oy - 3, "#ffd84a");
      R(wx - 1, oy + 10, 4, 1, "#f0a000");
      R(wx, oy + 11, 2, 2, "#6b4e31");
      P(wx - 1, oy + 10, "#d62839");
      break;
    case "cannon":
      R(wx - 2, oy + 9, 9, 4, "#e3e8f0");
      R(wx - 2, oy + 10, 9, 1, "#7a4fd6");
      R(wx + 7, oy + 9, 1, 4, "#ff4fd8");
      R(wx - 1, oy + 13, 2, 2, "#4a5670");
      P(wx + 2, oy + 11, "#ff4fd8");
      break;
    case "none":
      break;
    default:
      P(wx, oy + 2, "#333333");
      R(wx, oy + 3, 2, 1, "#e8b07a");
      R(wx, oy + 4, 2, 8, "#ffcf3a");
      R(wx + 1, oy + 4, 1, 8, "#e0a800");
      R(wx, oy + 12, 2, 1, "#f28aa0");
  }
  R(ox + 14, oy + 13, 4, 1, C.skin);
  R(ox + 4, oy + 13, 2, 1, C.skin);
  x.translate(0, -breathe);
  // pet
  if (PET_SPR[eq.pet]) {
    const frames = [PET_SPR[eq.pet], PET_SPR2[eq.pet] || PET_SPR[eq.pet]];
    const spr = frames[Math.floor(fr / 3) % 2],
      hop = fr % 10 === 5 ? 1 : 0;
    const rows = spr
        .trim()
        .split("\n")
        .map((r) => r.trim()),
      pal = PET_PAL[eq.pet];
    const fly = eq.pet === "drone" ? 6 + (Math.floor(fr / 4) % 2) : 0; // the drone hovers
    const by = H - rows.length - hop - fly;
    rows.forEach((r, yy) =>
      [...r].forEach((ch, xx) => {
        if (pal[ch]) P(xx - 10, by + yy, pal[ch]);
      }),
    );
    // matching tubeteika for the pet, only while the hero wears one
    const cap = eq.helmet === "tubeteika" && PET_CAP[eq.pet] && PET_CAP[eq.pet][Math.floor(fr / 3) % 2];
    if (cap) {
      const [cx0, cy0, w] = cap,
        X = cx0 - 10,
        Y = by + cy0;
      const mid = X + Math.floor((w - 1) / 2);
      R(X + 1, Y - 1, w - 2, 1, "#1b6b3a");
      if (w >= 5) P(mid, Y - 1, "#d62839"); // green velvet top, red flower
      if (w >= 5) P(mid, Y - 2, "#1b6b3a"); // little dome
      R(X, Y, w, 1, "#ffd23f");
      P(X, Y, "#0f4a28");
      P(X + w - 1, Y, "#0f4a28"); // gold embroidered band
    }
  }
  // whole-figure outline, classic pixel-art style
  {
    x.setTransform(1, 0, 0, 1, 0, 0);
    const d = x.getImageData(0, 0, CW, CH).data,
      has = (i, j) => i >= 0 && j >= 0 && i < CW && j < CH && d[(j * CW + i) * 4 + 3] > 0;
    x.fillStyle = "rgba(20,26,51,.85)";
    for (let j = 0; j < CH; j++)
      for (let i = 0; i < CW; i++)
        if (!has(i, j) && (has(i - 1, j) || has(i + 1, j) || has(i, j - 1) || has(i, j + 1))) x.fillRect(i, j, 1, 1);
    x.setTransform(1, 0, 0, 1, LX, TOP);
  }
  // aura: animated per type (fr = animation frame)
  if (AURA_COL[eq.aura]) {
    const cols = AURA_COL[eq.aura],
      A = eq.aura;
    const pts = [
      [1, 3],
      [3, 0],
      [27, 2],
      [29, 8],
      [1, 12],
      [28, 15],
      [4, 18],
      [27, 24],
      [0, 7],
      [24, 0],
      [14, 0],
      [29, 20],
      [8, 25],
      [20, 26],
    ].concat(
      EPIC_AURA[A]
        ? [
            [2, 5],
            [5, 2],
            [26, 5],
            [28, 11],
            [2, 16],
            [25, 19],
            [6, 22],
            [23, 23],
            [11, 1],
            [18, 1],
            [0, 20],
            [29, 13],
            [3, 9],
            [26, 0],
          ]
        : [],
    );
    if (A === "supernovaaura") {
      for (let i = 0; i < 22; i++) {
        const an = (i / 22) * Math.PI * 2 - fr * 0.2;
        const rr = 12 + ((fr + i) % 4 === 0 ? 1 : 0);
        const px = Math.round(15 + Math.cos(an) * (rr + 1.5)),
          py = Math.round(13 + Math.sin(an) * rr);
        P(px, py, cols[(i + fr) % cols.length]);
      }
      pts.forEach(([a, b], i) => {
        if ((fr + i) % 3 === 0) P(a, b, cols[i % cols.length]);
      });
    } else if (A === "galaxy") {
      for (let i = 0; i < 16; i++) {
        const an = (i / 16) * Math.PI * 2 + fr * 0.15;
        const px = Math.round(15 + Math.cos(an) * 13.5),
          py = Math.round(13 + Math.sin(an) * 12.5);
        P(px, py, cols[i % cols.length]);
      }
      pts.forEach(([a, b], i) => {
        if ((fr + i) % 5 === 0) P(a, b, "#ffffff");
      });
    } else if (A === "fireaura" || A === "dragonfire") {
      pts.forEach(([a, b], i) => {
        const rise = (fr + i * 3) % 7,
          y = b - rise;
        if (y >= 0) P(a, y, cols[(i + rise) % cols.length]);
      });
    } else {
      pts.forEach(([a, b], i) => {
        const ph = (fr + i * 2) % 6;
        if (ph < 4) P(a, b, cols[(i + fr) % cols.length]);
        if (ph === 1 && (A === "sparks" || A === "godbolt")) {
          P(a - 1, b, cols[0]);
          P(a + 1, b, cols[0]);
          P(a, b - 1, cols[0]);
          P(a, b + 1, cols[0]);
        }
      });
      if ((A === "storm" || A === "godbolt") && fr % 9 < 2) {
        const k = Math.floor(fr / 9),
          side = k % 2 ? 27 : 1,
          by = 2 + ((k * 7) % 15);
        [
          [0, 0],
          [1, 1],
          [0, 2],
          [1, 3],
          [0, 4],
          [1, 5],
        ].forEach(([dx, dy]) => P(side + dx, by + dy, A === "godbolt" ? "#ffffff" : "#a8f0ff"));
      }
    }
  }
  if (wrap) {
    const gc = AURA_GLOWC[eq.aura];
    wrap.style.filter = "";
    wrap.classList.toggle("pulse", !!gc);
    if (gc) wrap.style.setProperty("--glow", gc);
  }
}
