export type Rgb = [number, number, number];

export type GradientStop = {
  color: Rgb;
  pos: number;
};

export type GradientStopDef = {
  color: Rgb;
  pos?: number;
};

export type WavePreset = {
  id: string;
  name: string;
  stops: GradientStopDef[];
  mirror?: boolean;
  speed: number;
  freq: number;
  harmonics: number;
};

const MIN_STOP_GAP = 0.02;

export function stopsFromColors(colors: Rgb[]): GradientStop[] {
  if (colors.length === 0) {
    return [
      { color: [0, 0, 0], pos: 0 },
      { color: [1, 1, 1], pos: 1 },
    ];
  }
  if (colors.length === 1) {
    return [
      { color: [...colors[0]], pos: 0 },
      { color: [...colors[0]], pos: 1 },
    ];
  }
  return colors.map((color, i) => ({
    color: [...color] as Rgb,
    pos: i / (colors.length - 1),
  }));
}

export function parsePresetStops(defs: GradientStopDef[]): GradientStop[] {
  const withPos = defs.filter((d) => d.pos !== undefined);
  if (withPos.length === defs.length) {
    return normalizeGradientStops(defs.map((d) => ({ color: [...d.color] as Rgb, pos: d.pos! })));
  }
  return normalizeGradientStops(stopsFromColors(defs.map((d) => d.color)));
}

export function normalizeGradientStops(stops: GradientStop[]): GradientStop[] {
  if (stops.length === 0) return stopsFromColors([]);
  const out = stops.map((s) => ({
    color: [...s.color] as Rgb,
    pos: s.pos,
  }));
  out.sort((a, b) => a.pos - b.pos);
  out[0]!.pos = 0;
  out[out.length - 1]!.pos = 1;
  for (let i = 1; i < out.length - 1; i++) {
    const minP = out[i - 1]!.pos + MIN_STOP_GAP;
    const maxP = out[i + 1]!.pos - MIN_STOP_GAP;
    out[i]!.pos = Math.max(minP, Math.min(out[i]!.pos, maxP));
  }
  return out;
}

function c(color: Rgb, pos?: number): GradientStopDef {
  return pos === undefined ? { color } : { color, pos };
}

export const WAVE_PRESETS: WavePreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    stops: [
      c([0.03, 0.05, 0.12]),
      c([0.08, 0.22, 0.35]),
      c([0.15, 0.65, 0.55]),
      c([0.45, 0.85, 0.72]),
      c([0.72, 0.35, 0.92]),
    ],
    speed: 1.1,
    freq: 2.4,
    harmonics: 4,
  },
  {
    id: "sunset",
    name: "Sunset",
    stops: [
      c([0.04, 0.05, 0.14], 0),
      c([0.18, 0.06, 0.22], 0.07),
      c([0.55, 0.12, 0.28], 0.16),
      c([0.95, 0.32, 0.08], 0.28),
      c([1.0, 0.62, 0.15], 0.38),
      c([1.0, 0.82, 0.42], 0.5),
      c([0.98, 0.9, 0.55], 0.58),
      c([0.45, 0.62, 0.92], 0.78),
      c([0.12, 0.32, 0.68], 1),
    ],
    speed: 0.85,
    freq: 1.8,
    harmonics: 3,
  },
  {
    id: "ocean",
    name: "Ocean",
    stops: [
      c([0.02, 0.05, 0.12]),
      c([0.04, 0.18, 0.32]),
      c([0.08, 0.42, 0.72]),
      c([0.22, 0.68, 0.88]),
      c([0.55, 0.92, 0.95]),
    ],
    speed: 1.25,
    freq: 3.0,
    harmonics: 5,
  },
  {
    id: "euler",
    name: "Euler",
    stops: [
      c([0.04, 0.06, 0.12]),
      c([0.12, 0.28, 0.55]),
      c([0.25, 0.65, 0.98]),
      c([0.72, 0.45, 0.88]),
      c([0.95, 0.45, 0.72]),
    ],
    speed: 1.0,
    freq: 2.2,
    harmonics: 4,
  },
  {
    id: "identity",
    name: "Identity",
    stops: [
      c([0.04, 0.08, 0.06]),
      c([0.12, 0.45, 0.32]),
      c([0.35, 0.82, 0.58]),
      c([0.88, 0.95, 0.92]),
    ],
    speed: 0.7,
    freq: 1.5,
    harmonics: 2,
  },
  {
    id: "neon",
    name: "Neon",
    stops: [
      c([0.02, 0.0, 0.08]),
      c([0.35, 0.05, 0.55]),
      c([0.95, 0.1, 0.85]),
      c([0.15, 0.95, 0.95]),
      c([0.85, 0.2, 0.95]),
    ],
    speed: 1.4,
    freq: 3.5,
    harmonics: 6,
  },
];

export function rgbToHex([r, g, b]: Rgb): string {
  const ch = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
