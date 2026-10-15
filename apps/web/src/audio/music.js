// Фоновая музыка: треки, секвенсор, приглушение.
import { saveSettings, settings } from "../state/settings.ts";
import { ac, ensureAC } from "./context.js";
import { G } from "../battle/run.js";

/* ---------- музыка: боевые треки по кнопке «Музыка», спокойные — на остальных экранах.
   Шаг — шестнадцатая, петля 8 или 16 тактов. В ярости босса темп +15%. ---------- */
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
};
TRACKS.clouds = {
  name: "Облака",
  bpm: 80,
  style: "calm",
  // Dmaj7 Bm7 Gmaj7 A | Dmaj7 F#m7 G D
  roots: [38, 35, 43, 45, 38, 42, 43, 38],
  q: ["M", "m", "M", "M", "M", "m", "M", "M"],
  chords: [
    [50, 54, 57, 61],
    [50, 54, 57, 59],
    [50, 54, 55, 59],
    [49, 52, 57, 61],
    [50, 54, 57, 61],
    [49, 52, 54, 57],
    [50, 54, 55, 59],
    [50, 54, 57, 62],
  ],
  kick: [],
  snare: [],
  mel: flatMel([
    [
      [78, 6],
      [76, 2],
      [74, 8],
    ],
    [
      [73, 4],
      [74, 2],
      [76, 2],
      [71, 8],
    ],
    [
      [71, 4],
      [74, 4],
      [78, 6],
      [76, 2],
    ],
    [
      [76, 12],
      [0, 4],
    ],
    [
      [78, 6],
      [81, 2],
      [78, 4],
      [76, 4],
    ],
    [
      [73, 6],
      [76, 2],
      [78, 8],
    ],
    [
      [79, 4],
      [78, 4],
      [76, 4],
      [71, 4],
    ],
    [[74, 16]],
  ]),
};
/* ---------- треки в духе Game Boy («покемоны»): свои мелодии, звук как у приставки.
   bass — смещения волнового баса от корня по шестнадцатым; p2 — второй импульсный канал:
   "harm" вторит мелодии снизу, "arp" — быстрое арпеджио тридцать вторыми, "bell" — неспешный
   перебор шестнадцатыми, как музыкальная шкатулка. soft — тихие барабаны без сбивки, lead "p12" —
   мелодия тоньше и тише. ---------- */
const _ = null;
Object.assign(TRACKS, {
  town: {
    name: "Городок",
    bpm: 104,
    style: "gb",
    p2: "harm",
    soft: true,
    vol: 1.3,
    // F Dm B♭ C | F Dm Gm C | B♭ C Am Dm | B♭ C C7 F
    roots: [41, 38, 46, 36, 41, 38, 43, 36, 46, 36, 45, 38, 46, 36, 36, 41],
    q: ["M", "m", "M", "M", "M", "m", "m", "M", "M", "M", "m", "m", "M", "M", "M", "M"],
    bass: [0, _, _, _, 12, _, _, _, 7, _, _, _, 12, _, _, _],
    kick: [0],
    snare: [8],
    mel: flatMel([
      [
        [72, 4],
        [69, 2],
        [72, 2],
        [77, 6],
        [76, 2],
      ],
      [
        [74, 4],
        [69, 4],
        [74, 4],
        [77, 4],
      ],
      [
        [74, 3],
        [72, 1],
        [70, 4],
        [74, 4],
        [77, 4],
      ],
      [
        [76, 6],
        [74, 2],
        [72, 8],
      ],
      [
        [72, 4],
        [77, 2],
        [79, 2],
        [81, 6],
        [79, 2],
      ],
      [
        [77, 4],
        [74, 4],
        [77, 4],
        [81, 4],
      ],
      [
        [79, 3],
        [77, 1],
        [74, 4],
        [70, 4],
        [74, 4],
      ],
      [
        [72, 12],
        [0, 4],
      ],
      [
        [74, 4],
        [77, 4],
        [82, 6],
        [81, 2],
      ],
      [
        [79, 4],
        [76, 4],
        [72, 4],
        [76, 4],
      ],
      [
        [76, 3],
        [77, 1],
        [76, 4],
        [72, 4],
        [69, 4],
      ],
      [
        [74, 6],
        [72, 2],
        [74, 8],
      ],
      [
        [77, 4],
        [74, 4],
        [70, 4],
        [74, 4],
      ],
      [
        [76, 4],
        [79, 4],
        [84, 4],
        [79, 4],
      ],
      [
        [76, 3],
        [77, 1],
        [79, 4],
        [76, 4],
        [70, 4],
      ],
      [
        [72, 4],
        [69, 4],
        [65, 8],
      ],
    ]),
  },
  stars: {
    name: "Звёзды",
    bpm: 92,
    style: "gb",
    p2: "bell",
    lead: "p12",
    soft: true,
    vol: 1.9,
    // C Am F G | C Em G C
    roots: [36, 45, 41, 43, 36, 40, 43, 36],
    q: ["M", "m", "M", "M", "M", "m", "M", "M"],
    bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, _, _],
    kick: [],
    snare: [],
    mel: flatMel([
      [
        [79, 4],
        [76, 4],
        [84, 6],
        [83, 2],
      ],
      [
        [81, 4],
        [76, 4],
        [72, 8],
      ],
      [
        [77, 4],
        [81, 4],
        [79, 4],
        [77, 4],
      ],
      [
        [74, 8],
        [79, 8],
      ],
      [
        [76, 4],
        [79, 4],
        [84, 4],
        [83, 4],
      ],
      [
        [83, 6],
        [79, 2],
        [76, 8],
      ],
      [
        [77, 4],
        [76, 4],
        [74, 4],
        [71, 4],
      ],
      [[72, 16]],
    ]),
  },
  wild: {
    name: "Дикий бой",
    bpm: 150,
    style: "gb",
    p2: "arp",
    // Am Am F G | Am Am F E | F G Em Am | Dm G E Am
    roots: [45, 45, 41, 43, 45, 45, 41, 40, 41, 43, 40, 45, 38, 43, 40, 45],
    q: ["m", "m", "M", "M", "m", "m", "M", "M", "M", "M", "m", "m", "m", "M", "M", "m"],
    bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, 12, 0, 12],
    kick: [0, 6, 8],
    snare: [4, 12],
    hats16: true,
    mel: flatMel([
      [
        [69, 2],
        [72, 2],
        [76, 2],
        [81, 4],
        [79, 2],
        [76, 2],
        [74, 2],
      ],
      [
        [76, 6],
        [72, 2],
        [74, 4],
        [76, 4],
      ],
      [
        [77, 3],
        [76, 1],
        [74, 2],
        [72, 2],
        [77, 4],
        [81, 4],
      ],
      [
        [79, 6],
        [77, 2],
        [76, 2],
        [74, 2],
        [71, 4],
      ],
      [
        [69, 2],
        [72, 2],
        [76, 2],
        [81, 4],
        [83, 2],
        [84, 4],
      ],
      [
        [83, 2],
        [81, 2],
        [79, 2],
        [76, 2],
        [81, 8],
      ],
      [
        [77, 2],
        [81, 2],
        [84, 4],
        [83, 2],
        [81, 2],
        [77, 4],
      ],
      [
        [80, 6],
        [76, 2],
        [71, 4],
        [68, 4],
      ],
      [
        [72, 4],
        [77, 4],
        [76, 2],
        [77, 2],
        [81, 4],
      ],
      [
        [79, 4],
        [74, 4],
        [71, 2],
        [74, 2],
        [79, 4],
      ],
      [
        [76, 4],
        [79, 4],
        [83, 2],
        [81, 2],
        [79, 4],
      ],
      [
        [81, 8],
        [79, 2],
        [76, 2],
        [72, 4],
      ],
      [
        [74, 2],
        [77, 2],
        [81, 2],
        [77, 2],
        [74, 4],
        [77, 4],
      ],
      [
        [79, 2],
        [74, 2],
        [71, 2],
        [74, 2],
        [79, 4],
        [83, 4],
      ],
      [
        [80, 2],
        [83, 2],
        [80, 2],
        [76, 2],
        [80, 4],
        [83, 4],
      ],
      [
        [81, 6],
        [76, 2],
        [72, 2],
        [71, 2],
        [69, 4],
      ],
    ]),
  },
  route: {
    name: "Дорога",
    bpm: 128,
    style: "gb",
    p2: "harm",
    // G C G D | G C D G | C D Bm Em | C D D G
    roots: [43, 36, 43, 38, 43, 36, 38, 43, 36, 38, 47, 40, 36, 38, 38, 43],
    q: ["M", "M", "M", "M", "M", "M", "M", "M", "M", "M", "m", "m", "M", "M", "M", "M"],
    bass: [0, _, 12, _, 7, _, 12, _, 0, _, 12, _, 7, _, 12, _],
    kick: [0, 8],
    snare: [4, 12],
    mel: flatMel([
      [
        [71, 3],
        [74, 1],
        [79, 4],
        [78, 2],
        [79, 2],
        [74, 4],
      ],
      [
        [76, 3],
        [74, 1],
        [72, 4],
        [76, 4],
        [79, 4],
      ],
      [
        [74, 3],
        [71, 1],
        [67, 4],
        [71, 2],
        [74, 2],
        [79, 4],
      ],
      [
        [78, 6],
        [76, 2],
        [74, 8],
      ],
      [
        [71, 3],
        [74, 1],
        [79, 4],
        [81, 2],
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
        [78, 3],
        [79, 1],
        [81, 4],
        [74, 2],
        [78, 2],
        [81, 4],
      ],
      [
        [79, 8],
        [74, 4],
        [71, 4],
      ],
      [
        [72, 2],
        [76, 2],
        [79, 2],
        [84, 6],
        [79, 4],
      ],
      [
        [74, 2],
        [78, 2],
        [81, 2],
        [78, 6],
        [74, 4],
      ],
      [
        [78, 3],
        [79, 1],
        [78, 4],
        [74, 4],
        [71, 4],
      ],
      [
        [76, 3],
        [78, 1],
        [79, 4],
        [83, 4],
        [79, 4],
      ],
      [
        [76, 3],
        [79, 1],
        [84, 4],
        [83, 2],
        [81, 2],
        [79, 4],
      ],
      [
        [78, 3],
        [81, 1],
        [78, 4],
        [76, 2],
        [78, 2],
        [81, 4],
      ],
      [
        [83, 2],
        [81, 2],
        [78, 2],
        [74, 2],
        [76, 2],
        [78, 2],
        [81, 4],
      ],
      [
        [79, 8],
        [0, 4],
        [67, 2],
        [69, 2],
      ],
    ]),
  },
  champ: {
    name: "Чемпион",
    bpm: 156,
    style: "gb",
    p2: "harm+arp",
    // Dm B♭ C Dm | Dm B♭ C A | Gm C F Dm | B♭ C A Dm
    roots: [38, 46, 36, 38, 38, 46, 36, 45, 43, 36, 41, 38, 46, 36, 45, 38],
    q: ["m", "M", "M", "m", "m", "M", "M", "M", "m", "M", "M", "m", "M", "M", "M", "m"],
    bass: [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 7, 12, 7, 12],
    kick: [0, 8, 10],
    snare: [4, 12],
    hats16: true,
    mel: flatMel([
      [
        [69, 2],
        [74, 2],
        [77, 2],
        [81, 4],
        [77, 2],
        [74, 2],
        [76, 2],
      ],
      [
        [77, 4],
        [74, 2],
        [70, 2],
        [74, 4],
        [77, 4],
      ],
      [
        [79, 3],
        [77, 1],
        [76, 2],
        [72, 2],
        [76, 4],
        [79, 4],
      ],
      [
        [81, 6],
        [77, 2],
        [74, 8],
      ],
      [
        [74, 2],
        [77, 2],
        [81, 2],
        [84, 4],
        [82, 2],
        [81, 2],
        [77, 2],
      ],
      [
        [82, 4],
        [77, 4],
        [74, 2],
        [77, 2],
        [82, 4],
      ],
      [
        [84, 4],
        [79, 4],
        [76, 2],
        [79, 2],
        [84, 4],
      ],
      [
        [81, 4],
        [79, 2],
        [77, 2],
        [76, 4],
        [73, 4],
      ],
      [
        [74, 3],
        [79, 1],
        [82, 4],
        [81, 2],
        [79, 2],
        [74, 4],
      ],
      [
        [76, 3],
        [79, 1],
        [84, 4],
        [82, 2],
        [79, 2],
        [76, 4],
      ],
      [
        [77, 4],
        [81, 4],
        [84, 4],
        [81, 4],
      ],
      [
        [81, 8],
        [77, 4],
        [74, 4],
      ],
      [
        [74, 2],
        [77, 2],
        [82, 4],
        [81, 2],
        [77, 2],
        [74, 4],
      ],
      [
        [76, 2],
        [79, 2],
        [84, 4],
        [82, 2],
        [79, 2],
        [76, 4],
      ],
      [
        [73, 2],
        [76, 2],
        [81, 2],
        [76, 2],
        [79, 2],
        [77, 2],
        [76, 2],
        [73, 2],
      ],
      [
        [74, 8],
        [74, 2],
        [73, 2],
        [74, 4],
      ],
    ]),
  },
  flight: {
    name: "Полёт",
    bpm: 144,
    style: "gb",
    p2: "arp",
    // D A Bm G | D A G A | Bm G D A | G Em A D
    roots: [38, 45, 47, 43, 38, 45, 43, 45, 47, 43, 38, 45, 43, 40, 45, 38],
    q: ["M", "M", "m", "M", "M", "M", "M", "M", "m", "M", "M", "M", "M", "m", "M", "M"],
    bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, 7],
    kick: [0, 8],
    snare: [4, 12],
    hats16: true,
    mel: flatMel([
      [
        [74, 2],
        [78, 2],
        [81, 4],
        [78, 2],
        [81, 2],
        [83, 2],
        [81, 2],
      ],
      [
        [76, 4],
        [73, 2],
        [76, 2],
        [81, 6],
        [79, 2],
      ],
      [
        [78, 4],
        [74, 2],
        [78, 2],
        [83, 4],
        [81, 2],
        [78, 2],
      ],
      [
        [79, 6],
        [78, 2],
        [76, 2],
        [74, 2],
        [71, 4],
      ],
      [
        [74, 2],
        [78, 2],
        [81, 4],
        [83, 2],
        [81, 2],
        [78, 4],
      ],
      [
        [76, 2],
        [73, 2],
        [69, 2],
        [73, 2],
        [76, 4],
        [81, 4],
      ],
      [
        [83, 4],
        [81, 2],
        [79, 2],
        [78, 2],
        [79, 2],
        [83, 4],
      ],
      [
        [81, 8],
        [76, 4],
        [73, 4],
      ],
      [
        [71, 2],
        [74, 2],
        [78, 2],
        [83, 6],
        [81, 2],
        [78, 2],
      ],
      [
        [79, 2],
        [78, 2],
        [76, 2],
        [74, 2],
        [71, 4],
        [74, 4],
      ],
      [
        [78, 2],
        [81, 2],
        [78, 2],
        [74, 2],
        [78, 4],
        [81, 4],
      ],
      [
        [81, 4],
        [79, 2],
        [76, 2],
        [73, 4],
        [76, 4],
      ],
      [
        [74, 2],
        [79, 2],
        [83, 4],
        [81, 2],
        [79, 2],
        [83, 4],
      ],
      [
        [79, 2],
        [76, 2],
        [71, 2],
        [76, 2],
        [79, 4],
        [83, 4],
      ],
      [
        [81, 2],
        [83, 2],
        [81, 2],
        [79, 2],
        [76, 2],
        [78, 2],
        [79, 4],
      ],
      [
        [78, 6],
        [76, 2],
        [74, 8],
      ],
    ]),
  },
  cave: {
    name: "Пещера",
    bpm: 136,
    style: "gb",
    p2: "harm",
    // Em C D Em | Em C Am B | C D Bm Em | Am C B Em
    roots: [40, 36, 38, 40, 40, 36, 45, 47, 36, 38, 47, 40, 45, 36, 47, 40],
    q: ["m", "M", "M", "m", "m", "M", "m", "M", "M", "M", "m", "m", "m", "M", "M", "m"],
    bass: [0, _, 12, 0, _, 12, 0, _, 0, _, 12, 0, _, 12, 7, _],
    kick: [0, 6, 10],
    snare: [4, 12],
    mel: flatMel([
      [
        [71, 2],
        [76, 2],
        [79, 2],
        [76, 2],
        [83, 4],
        [79, 4],
      ],
      [
        [79, 2],
        [76, 2],
        [72, 2],
        [76, 2],
        [79, 4],
        [84, 4],
      ],
      [
        [81, 4],
        [78, 2],
        [74, 2],
        [78, 4],
        [81, 4],
      ],
      [
        [79, 6],
        [78, 2],
        [76, 8],
      ],
      [
        [76, 2],
        [79, 2],
        [83, 4],
        [81, 2],
        [79, 2],
        [83, 4],
      ],
      [
        [84, 4],
        [83, 2],
        [79, 2],
        [76, 4],
        [79, 4],
      ],
      [
        [81, 4],
        [76, 2],
        [72, 2],
        [76, 4],
        [81, 4],
      ],
      [
        [78, 4],
        [75, 2],
        [78, 2],
        [83, 4],
        [78, 4],
      ],
      [
        [76, 3],
        [79, 1],
        [84, 4],
        [83, 2],
        [79, 2],
        [76, 4],
      ],
      [
        [78, 3],
        [81, 1],
        [78, 4],
        [74, 4],
        [78, 4],
      ],
      [
        [78, 4],
        [83, 4],
        [81, 2],
        [78, 2],
        [74, 4],
      ],
      [
        [76, 12],
        [0, 4],
      ],
      [
        [72, 2],
        [76, 2],
        [81, 2],
        [76, 2],
        [72, 2],
        [76, 2],
        [81, 4],
      ],
      [
        [79, 2],
        [76, 2],
        [72, 2],
        [76, 2],
        [79, 4],
        [84, 4],
      ],
      [
        [83, 4],
        [78, 2],
        [75, 2],
        [71, 4],
        [75, 4],
      ],
      [
        [76, 8],
        [71, 4],
        [76, 4],
      ],
    ]),
  },
  pirates: {
    name: "Пираты",
    bpm: 140,
    style: "gb",
    p2: "harm",
    // Bm G A Bm | Bm G A F# | G A D Bm | Em A F# Bm
    roots: [47, 43, 45, 47, 47, 43, 45, 42, 43, 45, 38, 47, 40, 45, 42, 47],
    q: ["m", "M", "M", "m", "m", "M", "M", "M", "M", "M", "M", "m", "m", "M", "M", "m"],
    // бас «3+3+2», как матросский танец
    bass: [0, _, _, 7, _, _, 12, _, 0, _, _, 7, _, _, 12, _],
    kick: [0, 6, 8],
    snare: [4, 12],
    mel: flatMel([
      [
        [71, 3],
        [74, 1],
        [78, 4],
        [71, 3],
        [74, 1],
        [78, 4],
      ],
      [
        [79, 3],
        [78, 1],
        [76, 2],
        [74, 2],
        [71, 4],
        [74, 4],
      ],
      [
        [76, 3],
        [78, 1],
        [81, 4],
        [79, 2],
        [76, 2],
        [73, 4],
      ],
      [
        [74, 6],
        [73, 2],
        [71, 8],
      ],
      [
        [78, 3],
        [81, 1],
        [83, 4],
        [78, 3],
        [81, 1],
        [83, 4],
      ],
      [
        [83, 3],
        [81, 1],
        [79, 2],
        [78, 2],
        [79, 4],
        [83, 4],
      ],
      [
        [81, 3],
        [79, 1],
        [76, 2],
        [73, 2],
        [76, 4],
        [81, 4],
      ],
      [
        [82, 6],
        [78, 2],
        [73, 4],
        [70, 4],
      ],
      [
        [71, 3],
        [74, 1],
        [79, 4],
        [83, 4],
        [79, 4],
      ],
      [
        [73, 3],
        [76, 1],
        [81, 4],
        [79, 2],
        [76, 2],
        [81, 4],
      ],
      [
        [78, 3],
        [74, 1],
        [78, 4],
        [81, 4],
        [78, 4],
      ],
      [
        [83, 8],
        [78, 4],
        [74, 4],
      ],
      [
        [76, 3],
        [79, 1],
        [83, 4],
        [79, 3],
        [76, 1],
        [71, 4],
      ],
      [
        [73, 3],
        [76, 1],
        [81, 4],
        [79, 3],
        [76, 1],
        [73, 4],
      ],
      [
        [82, 3],
        [78, 1],
        [73, 4],
        [78, 2],
        [82, 2],
        [78, 4],
      ],
      [
        [83, 6],
        [78, 2],
        [74, 2],
        [73, 2],
        [71, 4],
      ],
    ]),
  },
});
// боевые треки: каждый новый бой берёт следующий, кнопка «Музыка» перелистывает вручную;
// «Чемпион» не в круге — он играет у финальных боссов (у них есть вторая форма)
export const TRACK_ORDER = ["wild", "flight", "cave", "route", "pirates"];
export const FINAL_TRACK = "champ";
// спокойные треки вне боя, по экрану; экран без записи (бой, конец боя) — тишина, бой включает свой трек сам
export const SCREEN_MUSIC = {
  "s-title": "stars",
  "s-home": "town",
  "s-shop": "calm",
  "s-awards": "clouds",
  "s-trophy": "clouds",
  "s-story": "clouds",
};
let music = {
  on: false,
  track: null,
  timer: null,
  t: 0,
  step: 0,
  out: null,
  dry: null,
  echo: null,
  noise: null,
  waves: null,
};
// импульсы Game Boy: скважность 12.5% (тонкий, «звонкий») и 25% (мелодия), мягкая «волна» для баса
function gbWaves() {
  if (music.waves && music.waves.ac === ac) return music.waves;
  const pulse = (duty) => {
    const re = new Float32Array(40),
      im = new Float32Array(40);
    for (let n = 1; n < 40; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  };
  const re = new Float32Array(10),
    im = new Float32Array(10);
  for (let n = 1; n < 10; n++) im[n] = (n % 2 ? 1 : 0.4) / n;
  music.waves = { ac, p12: pulse(0.125), p25: pulse(0.25), wave: ac.createPeriodicWave(re, im) };
  return music.waves;
}
// нота аккорда на 3–9 полутонов ниже мелодии (без тритона): второй голос всегда в гармонии
function harmony(n, root, ch) {
  const pcs = ch.map((c) => (root + c) % 12);
  for (let d = 3; d <= 9; d++) if (d !== 6 && pcs.includes((n - d) % 12)) return n - d;
  return 0;
}
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
  music.out = out;
  music.dry = dry;
  music.echo = dl;
}
function voice(
  n,
  t,
  d,
  { type = "square", pw = null, cut = 3000, vol = 0.1, att = 0.005, det = 0, vib = 0, to = "dry", slide = 0 } = {},
) {
  const o = ac.createOscillator(),
    f = ac.createBiquadFilter(),
    g = ac.createGain();
  if (pw) o.setPeriodicWave(pw);
  else o.type = type;
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
  if (tr.style === "gb") {
    gbStep(tr, i, k, t, sd, fast, root, ch, lead);
    return;
  }
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
}
// Game Boy: импульс 25% ведёт мелодию с запаздывающим вибрато, импульс 12.5% вторит или
// перебирает аккорд тридцать вторыми, волновой канал прыгает басом по октавам, шум — барабаны
function gbStep(tr, i, k, t, sd, fast, root, ch, lead) {
  const W = gbWaves(),
    len = tr.roots.length * 16,
    v = tr.vol || 1; // тихие треки чуть громче, чтобы не теряться рядом со «Спокойной»
  const b = tr.bass[k];
  if (b != null) {
    let j = k + 1;
    while (j < 16 && tr.bass[j] == null) j++;
    voice(root + 12 + b, t, (j - k) * sd * 0.8, { pw: W.wave, cut: 1600, vol: 0.2 * v, att: 0.004 });
  }
  if (tr.p2 === "bell")
    voice(root + 24 + ch[[0, 1, 2, 1][k % 4]] + (k % 8 >= 4 ? 12 : 0), t, sd * 0.9, {
      pw: W.p12,
      cut: 3000,
      vol: 0.026 * v,
      att: 0.003,
      to: "echo",
    });
  if (tr.p2.includes("arp"))
    for (let j = 0; j < 2; j++)
      voice(root + 36 + ch[(k * 2 + j) % 3], t + (j * sd) / 2, sd * 0.4, {
        pw: W.p12,
        cut: 3400,
        vol: v * (tr.p2 === "arp" ? 0.026 : 0.016),
        att: 0.002,
      });
  if (lead) {
    const d = lead[1] * sd * 0.9;
    const thin = tr.lead === "p12";
    voice(lead[0], t, d, {
      pw: thin ? W.p12 : W.p25,
      cut: thin ? 3200 : 4000,
      vol: v * (tr.soft ? 0.07 : 0.08),
      att: 0.004,
      vib: lead[1] >= 4 ? (tr.soft ? 3 : 5) : 0,
      to: "echo",
    });
    const h = tr.p2.includes("harm") && lead[1] >= 2 && harmony(lead[0], root, ch);
    if (h) voice(h, t, d, { pw: W.p12, cut: 3000, vol: 0.04 * v, att: 0.004 });
  }
  if (tr.soft) {
    if (tr.kick.includes(k)) kickD(t, 0.4 * v);
    if (tr.snare.includes(k)) nz(t, { freq: 1800, q: 0.7, vol: 0.07 * v, dec: 0.1 });
    if (k % 4 === 2) nz(t, { freq: 8000, q: 0.5, vol: 0.015 * v, dec: 0.025, type: "highpass" });
    return;
  }
  if (i >= len - 4) snareD(t, 0.35 + (i - len + 4) * 0.12);
  else {
    if (tr.kick.includes(k) || (fast && k % 4 === 0)) kickD(t, 0.7);
    if (tr.snare.includes(k)) snareD(t, 0.75);
  }
  if (k % 2 === 0 || tr.hats16 || fast)
    nz(t, { freq: 8000, q: 0.5, vol: k % 4 === 2 ? 0.04 : 0.02, dec: 0.025, type: "highpass" });
  if (i % 128 === 0) nz(t, { freq: 5000, q: 0.3, vol: 0.07 * v, dec: 0.7, type: "highpass" });
}
function scheduleMusic(until) {
  const tr = music.track,
    fast = !!(G && G.enraged);
  const sd = 60 / (tr.bpm * (fast ? 1.15 : 1)) / 4;
  while (music.t < until) {
    musicStep(tr, music.step % (tr.roots.length * 16), music.t, sd, fast);
    music.t += sd;
    music.step++;
  }
}
function musicTick() {
  if (music.on && ac) scheduleMusic(ac.currentTime + 0.2);
}
let want = null; // что должно играть: id трека, "battle" или null; переживает паузу (звук выкл, свёрнута игра)
/** Трек боя сейчас: у финального босса «Чемпион», иначе выбранный в круге. */
export const battleTrack = () =>
  G && G.final ? TRACKS[FINAL_TRACK] : TRACKS[settings.track] || TRACKS[TRACK_ORDER[0]];
const trackOf = (w) => (w === "battle" ? battleTrack() : TRACKS[w]);
/** Новый бой — следующий боевой трек по кругу. */
export function nextBattleTrack() {
  settings.track = TRACK_ORDER[(TRACK_ORDER.indexOf(settings.track) + 1) % TRACK_ORDER.length];
  saveSettings();
}
/** Без аргумента играет боевой трек, выбранный кнопкой «Музыка»; иначе трек по id. Другой трек сменяется плавно. */
export function startMusic(id) {
  want = id || "battle";
  const tr = trackOf(want);
  if (!settings.music || settings.muted || !tr || (music.on && music.track === tr)) return;
  fadeOut();
  try {
    ensureAC();
    if (ac.state !== "running") ac.resume();
    buildMusicGraph();
    music.track = tr;
    music.on = true;
    music.t = ac.currentTime + 0.08;
    music.step = 0;
    music.timer = setInterval(musicTick, 50);
    musicTick();
  } catch (e) {}
  window.dispatchEvent(new Event("musicchange")); // подпись на кнопке «Музыка» показывает, что играет
}
/** Музыка экрана из SCREEN_MUSIC; заставка включает свою сама после первого касания. */
export function screenMusic(id) {
  if (id === "s-title") return;
  if (SCREEN_MUSIC[id]) startMusic(SCREEN_MUSIC[id]);
  else stopMusic();
}
/** Пауза без забывания трека: потом resumeMusic() включит то же самое. */
export const pauseMusic = () => fadeOut();
export function resumeMusic() {
  if (want) startMusic(want);
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
  want = null;
  fadeOut();
}
function fadeOut() {
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
  if (document.hidden) fadeOut();
  else resumeMusic();
});
