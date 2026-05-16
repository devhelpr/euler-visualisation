export type Rgb = [number, number, number];

export type WavePalette = {
  a: Rgb;
  b: Rgb;
  c: Rgb;
};

export type WavePreset = {
  id: string;
  name: string;
  palette: WavePalette;
  speed: number;
  freq: number;
  harmonics: number;
};

export const WAVE_PRESETS: WavePreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    palette: {
      a: [0.05, 0.08, 0.18],
      b: [0.2, 0.85, 0.75],
      c: [0.75, 0.35, 0.95],
    },
    speed: 1.1,
    freq: 2.4,
    harmonics: 4,
  },
  {
    id: "sunset",
    name: "Sunset",
    palette: {
      a: [0.12, 0.04, 0.18],
      b: [0.95, 0.35, 0.15],
      c: [0.98, 0.75, 0.35],
    },
    speed: 0.85,
    freq: 1.8,
    harmonics: 3,
  },
  {
    id: "ocean",
    name: "Ocean",
    palette: {
      a: [0.02, 0.06, 0.14],
      b: [0.1, 0.45, 0.85],
      c: [0.35, 0.9, 0.95],
    },
    speed: 1.25,
    freq: 3.0,
    harmonics: 5,
  },
  {
    id: "euler",
    name: "Euler",
    palette: {
      a: [0.04, 0.06, 0.12],
      b: [0.25, 0.65, 0.98],
      c: [0.95, 0.45, 0.72],
    },
    speed: 1.0,
    freq: 2.2,
    harmonics: 4,
  },
  {
    id: "identity",
    name: "Identity",
    palette: {
      a: [0.05, 0.1, 0.08],
      b: [0.2, 0.85, 0.55],
      c: [0.9, 0.92, 0.95],
    },
    speed: 0.7,
    freq: 1.5,
    harmonics: 2,
  },
  {
    id: "neon",
    name: "Neon",
    palette: {
      a: [0.02, 0.0, 0.08],
      b: [0.95, 0.1, 0.85],
      c: [0.15, 0.95, 0.95],
    },
    speed: 1.4,
    freq: 3.5,
    harmonics: 6,
  },
];

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
