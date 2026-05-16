export type WaveTextFontOption = {
  label: string;
  value: string;
};

export type WaveTextSettings = {
  enabled: boolean;
  text: string;
  maxLength: number;
  font: string;
  fonts: WaveTextFontOption[];
  size: number;
  weight: number;
  tracking: number;
  uppercase: boolean;
  italic: boolean;
  fill: {
    opacity: number;
    tint: string;
    tintAmount: number;
    brightness: number;
    saturation: number;
  };
  stroke: {
    width: number;
    waveOffset: number;
    opacity: number;
    tint: string;
    tintAmount: number;
    brightness: number;
    saturation: number;
  };
};

export const WAVE_TEXT_SETTINGS: WaveTextSettings = {
  enabled: true,
  text: "Euler",
  maxLength: 36,
  font: "system-ui, 'Segoe UI', Roboto, sans-serif",
  fonts: [
    { label: "System UI", value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
    { label: "Mono", value: "ui-monospace, 'SF Mono', Consolas, monospace" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Impact", value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
    { label: "Trebuchet", value: "'Trebuchet MS', system-ui, sans-serif" },
  ],
  size: 22,
  weight: 800,
  tracking: 0.02,
  uppercase: true,
  italic: false,
  fill: {
    opacity: 1,
    tint: "#ffffff",
    tintAmount: 0,
    brightness: 1,
    saturation: 2,
  },
  stroke: {
    width: 0.035,
    waveOffset: 0,
    opacity: 0.4,
    tint: "#ffffff",
    tintAmount: 0,
    brightness: 1.25,
    saturation: 1.15,
  },
};
