import "./style.css";
import { drawArgand } from "./argand.ts";
import { createScene3D } from "./scene3d.ts";
import { createWaveShader } from "./waveShader.ts";
import { createGradientStopsUI } from "./waveGradient.ts";
import { WAVE_TEXT_SETTINGS } from "./waveTextSettings.ts";
import { bindWaveGestures, createWaveViewHandlers, type WaveViewSliders } from "./waveView.ts";
import { parsePresetStops, WAVE_PRESETS, type WavePreset } from "./wavePresets.ts";

const TAU = Math.PI * 2;
const ARGAND_SIZE = 320;

type AppMode = "explore" | "wave";

function formatTheta(theta: number): string {
  const deg = ((theta * 180) / Math.PI).toFixed(1);
  if (Math.abs(theta - Math.PI) < 0.04) return `θ = π (${deg}°)`;
  if (Math.abs(theta) < 0.04) return `θ = 0 (${deg}°)`;
  if (Math.abs(theta - Math.PI / 2) < 0.04) return `θ = π/2 (${deg}°)`;
  return `θ = ${theta.toFixed(3)} rad (${deg}°)`;
}

function isEulerIdentity(theta: number): boolean {
  return Math.abs(theta - Math.PI) < 0.06;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

// Viewport + mode switcher
const viewport = document.createElement("div");
viewport.className = "viewport";
viewport.id = "viewport";

const modeBar = document.createElement("div");
modeBar.className = "mode-bar";

const exploreModeBtn = document.createElement("button");
exploreModeBtn.type = "button";
exploreModeBtn.className = "mode-btn active";
exploreModeBtn.dataset.mode = "explore";
exploreModeBtn.textContent = "Explore";

const waveModeBtn = document.createElement("button");
waveModeBtn.type = "button";
waveModeBtn.className = "mode-btn";
waveModeBtn.dataset.mode = "wave";
waveModeBtn.textContent = "Wave Preview";

modeBar.append(exploreModeBtn, waveModeBtn);
viewport.append(modeBar);

const waveTextOverlay = document.createElement("div");
waveTextOverlay.className = "wave-text-overlay hidden";

const waveTextCanvas = document.createElement("canvas");
waveTextCanvas.className = "wave-text-preview";

const waveTextStrokeCanvas = document.createElement("canvas");
waveTextStrokeCanvas.className = "wave-text-preview wave-text-stroke-preview";

waveTextOverlay.append(waveTextStrokeCanvas, waveTextCanvas);
viewport.append(waveTextOverlay);

// Sidebar
const sidebar = document.createElement("aside");
sidebar.className = "sidebar";

// Explore panel
const explorePanel = document.createElement("div");
explorePanel.className = "panel explore-panel";

const title = document.createElement("h1");
title.textContent = "Euler's Formula";

const subtitle = document.createElement("p");
subtitle.className = "subtitle";
subtitle.innerHTML = "Watch e<sup>iθ</sup> trace the unit circle — and spiral through time in 3D.";

const formula = document.createElement("div");
formula.className = "formula";
formula.innerHTML =
  'e<sup>iθ</sup> = <span class="highlight">cos θ</span> + <span class="highlight">i sin θ</span>';

const identity = document.createElement("div");
identity.className = "identity";
identity.id = "identity";
identity.innerHTML = "At θ = π: e<sup>iπ</sup> + 1 = 0";

const valReal = document.createElement("div");
valReal.className = "num";
valReal.id = "val-real";
valReal.textContent = "1.000";

const valImag = document.createElement("div");
valImag.className = "num";
valImag.id = "val-imag";
valImag.textContent = "0.000";

const values = document.createElement("div");
values.className = "values";

const realCard = document.createElement("div");
realCard.className = "value-card real";
realCard.append(
  Object.assign(document.createElement("div"), {
    className: "label",
    textContent: "Re = cos θ",
  }),
  valReal,
);

const imagCard = document.createElement("div");
imagCard.className = "value-card imag";
imagCard.append(
  Object.assign(document.createElement("div"), {
    className: "label",
    textContent: "Im = sin θ",
  }),
  valImag,
);

values.append(realCard, imagCard);

const explainer = document.createElement("div");
explainer.className = "explainer";

const threeDDetails = document.createElement("details");
threeDDetails.className = "explainer-details";
threeDDetails.append(
  Object.assign(document.createElement("summary"), {
    textContent: "How the 3D view works",
  }),
  Object.assign(document.createElement("p"), {
    textContent:
      "The 3D view lifts the same unit-circle motion into space: x = cos θ, y = sin θ, and z increases with θ. That turns repeated rotation into a helix, making phase progression visible as depth.",
  }),
  Object.assign(document.createElement("p"), {
    textContent:
      "The blue point is the current value of e^(iθ). The green and gold dashed lines show its real and imaginary components, while the helix trail shows how those values evolve as θ grows.",
  }),
);

explainer.append(
  Object.assign(document.createElement("h2"), {
    textContent: "Introduction",
  }),
  Object.assign(document.createElement("p"), {
    innerHTML:
      "Euler's formula says that rotating around the unit circle can be written as e<sup>iθ</sup>. The horizontal position is cos θ, and the vertical position is sin θ.",
  }),
  Object.assign(document.createElement("p"), {
    innerHTML: "At θ = π, the point lands at −1, giving Euler's identity: e<sup>iπ</sup> + 1 = 0.",
  }),
  threeDDetails,
  Object.assign(document.createElement("p"), {
    className: "disclaimer",
    textContent:
      "Note: Wave Preview is an Euler-inspired artistic wave field, not a literal proof or exact plot of Euler's formula.",
  }),
);

explorePanel.append(title, subtitle, formula, identity, values, explainer);

const argandWrap = document.createElement("div");
argandWrap.className = "argand-wrap explore-only";
argandWrap.append(
  Object.assign(document.createElement("h2"), {
    textContent: "Complex plane (canvas)",
  }),
  (() => {
    const c = document.createElement("canvas");
    c.id = "argand";
    c.width = ARGAND_SIZE;
    c.height = ARGAND_SIZE;
    return c;
  })(),
);

const argandCanvas = argandWrap.querySelector("canvas")!;

const controls = document.createElement("div");
controls.className = "panel controls explore-only";

const thetaSlider = document.createElement("input");
thetaSlider.type = "range";
thetaSlider.id = "theta";
thetaSlider.min = "0";
thetaSlider.max = String(TAU);
thetaSlider.step = "0.002";
thetaSlider.value = "0";

const thetaDisplay = document.createElement("div");
thetaDisplay.className = "theta-display";
thetaDisplay.id = "theta-label";
thetaDisplay.textContent = "θ = 0 (0.0°)";

const playBtn = document.createElement("button");
playBtn.type = "button";
playBtn.id = "play";
playBtn.className = "primary";
playBtn.textContent = "▶ Animate";

const piBtn = document.createElement("button");
piBtn.type = "button";
piBtn.id = "pi";
piBtn.textContent = "θ = π";

const helixBtn = document.createElement("button");
helixBtn.type = "button";
helixBtn.id = "helix";
helixBtn.className = "active";
helixBtn.textContent = "Helix";

const btnRow = document.createElement("div");
btnRow.className = "btn-row";
btnRow.append(playBtn, piBtn, helixBtn);

controls.append(
  Object.assign(document.createElement("label"), {
    htmlFor: "theta",
    textContent: "Angle θ",
  }),
  thetaSlider,
  thetaDisplay,
  btnRow,
  Object.assign(document.createElement("p"), {
    className: "hint",
    textContent: "Drag the 3D view to orbit. Green = real axis, gold = imaginary.",
  }),
);

// Wave panel
const wavePanel = document.createElement("div");
wavePanel.className = "panel wave-panel hidden";

wavePanel.append(
  Object.assign(document.createElement("h1"), { textContent: "Euler Wave" }),
  (() => {
    const p = document.createElement("p");
    p.className = "subtitle";
    p.innerHTML =
      "Interference from Σ e<sup>iφ</sup> — rotating complex waves blended into a gradient.";
    return p;
  })(),
  (() => {
    const d = document.createElement("div");
    d.className = "formula wave-formula";
    d.innerHTML = 'Σ e<sup>i(k·x − ωt + θ)</sup> → <span class="highlight">gradient</span>';
    return d;
  })(),
);

const presetRow = document.createElement("div");
presetRow.className = "preset-row";
const presetLabel = document.createElement("label");
presetLabel.textContent = "Presets";
presetLabel.className = "section-label";

function waveSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
): HTMLInputElement {
  const wrap = document.createElement("div");
  wrap.className = "slider-field";
  const lbl = document.createElement("label");
  lbl.htmlFor = id;
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  wrap.append(lbl, input);
  wavePanel.append(wrap);
  return input;
}

wavePanel.append(presetLabel, presetRow);

let activePresetId = "euler";
let pushWaveUniforms: () => void = () => {};

function clearActivePreset() {
  activePresetId = "";
  for (const btn of presetRow.querySelectorAll(".preset-btn")) {
    btn.classList.remove("active");
  }
}

const gradientUI = createGradientStopsUI(wavePanel, () => {
  clearActivePreset();
  pushWaveUniforms();
});

const textLabel = document.createElement("label");
textLabel.className = "section-label";
textLabel.textContent = "Text mask";

const textEnabledLabel = document.createElement("label");
textEnabledLabel.className = "checkbox-field";
const textEnabledInput = document.createElement("input");
textEnabledInput.type = "checkbox";
textEnabledInput.id = "wave-text-enabled";
textEnabledInput.checked = WAVE_TEXT_SETTINGS.enabled;
textEnabledLabel.append(
  textEnabledInput,
  Object.assign(document.createElement("span"), {
    textContent: "Show text with the wave as its moving backdrop",
  }),
);

const textField = document.createElement("div");
textField.className = "text-field";
const textInputLabel = document.createElement("label");
textInputLabel.htmlFor = "wave-text-input";
textInputLabel.textContent = "Text";
const textInput = document.createElement("input");
textInput.type = "text";
textInput.id = "wave-text-input";
textInput.value = WAVE_TEXT_SETTINGS.text;
textInput.maxLength = WAVE_TEXT_SETTINGS.maxLength;
textField.append(textInputLabel, textInput);

const fontField = document.createElement("div");
fontField.className = "text-field";
const fontSelectLabel = document.createElement("label");
fontSelectLabel.htmlFor = "wave-text-font";
fontSelectLabel.textContent = "Font";
const fontSelect = document.createElement("select");
fontSelect.id = "wave-text-font";
for (const { label, value } of WAVE_TEXT_SETTINGS.fonts) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === WAVE_TEXT_SETTINGS.font;
  fontSelect.append(option);
}
fontField.append(fontSelectLabel, fontSelect);

function textSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
): HTMLInputElement {
  const wrap = document.createElement("div");
  wrap.className = "slider-field compact";
  const lbl = document.createElement("label");
  lbl.htmlFor = id;
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  wrap.append(lbl, input);
  return input;
}

function colorInput(id: string, label: string, value: string): HTMLInputElement {
  const wrap = document.createElement("div");
  wrap.className = "text-field color-field";
  const lbl = document.createElement("label");
  lbl.htmlFor = id;
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "color";
  input.id = id;
  input.value = value;
  wrap.append(lbl, input);
  return input;
}

const textSizeSlider = textSlider("wave-text-size", "Size", 12, 34, 0.5, WAVE_TEXT_SETTINGS.size);
const textWeightSlider = textSlider(
  "wave-text-weight",
  "Weight",
  300,
  900,
  100,
  WAVE_TEXT_SETTINGS.weight,
);
const textTrackingSlider = textSlider(
  "wave-text-tracking",
  "Tracking",
  -0.04,
  0.24,
  0.005,
  WAVE_TEXT_SETTINGS.tracking,
);
const textFillOpacitySlider = textSlider(
  "wave-text-fill-opacity",
  "Fill opacity",
  0,
  1,
  0.01,
  WAVE_TEXT_SETTINGS.fill.opacity,
);
const textFillTintInput = colorInput(
  "wave-text-fill-tint",
  "Fill tint",
  WAVE_TEXT_SETTINGS.fill.tint,
);
const textFillTintSlider = textSlider(
  "wave-text-fill-tint-amount",
  "Fill tint amount",
  0,
  1,
  0.01,
  WAVE_TEXT_SETTINGS.fill.tintAmount,
);
const textFillBrightnessSlider = textSlider(
  "wave-text-fill-brightness",
  "Fill brightness",
  0.35,
  2,
  0.01,
  WAVE_TEXT_SETTINGS.fill.brightness,
);
const textFillSaturationSlider = textSlider(
  "wave-text-fill-saturation",
  "Fill saturation",
  0,
  2.5,
  0.01,
  WAVE_TEXT_SETTINGS.fill.saturation,
);
const textStrokeSlider = textSlider(
  "wave-text-stroke",
  "Stroke",
  0,
  0.12,
  0.005,
  WAVE_TEXT_SETTINGS.stroke.width,
);
const textStrokeOffsetSlider = textSlider(
  "wave-text-stroke-offset",
  "Stroke wave offset",
  0,
  0.18,
  0.005,
  WAVE_TEXT_SETTINGS.stroke.waveOffset,
);
const textStrokeOpacitySlider = textSlider(
  "wave-text-stroke-opacity",
  "Stroke opacity",
  0,
  1,
  0.01,
  WAVE_TEXT_SETTINGS.stroke.opacity,
);
const textStrokeTintInput = colorInput(
  "wave-text-stroke-tint",
  "Stroke tint",
  WAVE_TEXT_SETTINGS.stroke.tint,
);
const textStrokeTintSlider = textSlider(
  "wave-text-stroke-tint-amount",
  "Stroke tint amount",
  0,
  1,
  0.01,
  WAVE_TEXT_SETTINGS.stroke.tintAmount,
);
const textStrokeBrightnessSlider = textSlider(
  "wave-text-stroke-brightness",
  "Stroke brightness",
  0.35,
  2,
  0.01,
  WAVE_TEXT_SETTINGS.stroke.brightness,
);
const textStrokeSaturationSlider = textSlider(
  "wave-text-stroke-saturation",
  "Stroke saturation",
  0,
  2.5,
  0.01,
  WAVE_TEXT_SETTINGS.stroke.saturation,
);

const textStyleRow = document.createElement("div");
textStyleRow.className = "toggle-row";

const textUpperLabel = document.createElement("label");
textUpperLabel.className = "checkbox-field inline";
const textUpperInput = document.createElement("input");
textUpperInput.type = "checkbox";
textUpperInput.checked = WAVE_TEXT_SETTINGS.uppercase;
textUpperLabel.append(textUpperInput, document.createTextNode("Uppercase"));

const textItalicLabel = document.createElement("label");
textItalicLabel.className = "checkbox-field inline";
const textItalicInput = document.createElement("input");
textItalicInput.type = "checkbox";
textItalicInput.checked = WAVE_TEXT_SETTINGS.italic;
textItalicLabel.append(textItalicInput, document.createTextNode("Italic"));

textStyleRow.append(textUpperLabel, textItalicLabel);

const textControls = document.createElement("div");
textControls.className = "text-controls";
textControls.append(
  textLabel,
  textEnabledLabel,
  textField,
  fontField,
  textSizeSlider.parentElement!,
  textWeightSlider.parentElement!,
  textTrackingSlider.parentElement!,
  textFillOpacitySlider.parentElement!,
  textFillTintInput.parentElement!,
  textFillTintSlider.parentElement!,
  textFillBrightnessSlider.parentElement!,
  textFillSaturationSlider.parentElement!,
  textStrokeSlider.parentElement!,
  textStrokeOffsetSlider.parentElement!,
  textStrokeOpacitySlider.parentElement!,
  textStrokeTintInput.parentElement!,
  textStrokeTintSlider.parentElement!,
  textStrokeBrightnessSlider.parentElement!,
  textStrokeSaturationSlider.parentElement!,
  textStyleRow,
);

wavePanel.append(textControls);

const speedSlider = waveSlider("wave-speed", "Wave speed ω", 0, 2.5, 0.01, 1);
const rippleSlider = waveSlider("wave-ripple", "Ripple shimmer", 0, 0.12, 0.005, 0.04);
const freqSlider = waveSlider("wave-freq", "Frequency k", 0.5, 5, 0.1, 2.2);
const harmSlider = waveSlider("wave-harm", "Harmonics", 1, 8, 1, 4);
const ampSlider = waveSlider("wave-amp", "Amplitude", 0.4, 2, 0.05, 1.15);

const viewLabel = document.createElement("label");
viewLabel.className = "section-label";
viewLabel.textContent = "View transform";

const viewSliders: WaveViewSliders = {
  translateX: waveSlider("view-tx", "Translate X", -2, 2, 0.01, 0),
  translateY: waveSlider("view-ty", "Translate Y", -2, 2, 0.01, 0),
  rotate: waveSlider("view-rot", "Rotate", 0, TAU, 0.01, 0),
  zoom: waveSlider("view-zoom", "Zoom", 0.25, 4, 0.01, 1),
  twist: waveSlider("view-twist", "Twist", -3, 3, 0.01, 0),
  kxScale: waveSlider("view-kx", "Wave scale X", 0.2, 2.5, 0.01, 1),
  kyScale: waveSlider("view-ky", "Wave scale Y", 0.2, 2.5, 0.01, 1),
};

wavePanel.append(viewLabel);

const resetViewBtn = document.createElement("button");
resetViewBtn.type = "button";
resetViewBtn.className = "reset-view-btn";
resetViewBtn.textContent = "Reset view";
wavePanel.append(
  resetViewBtn,
  Object.assign(document.createElement("p"), {
    className: "hint gesture-hint",
    textContent:
      "Canvas: drag pan · pinch zoom · ⌘+scroll rotate · ⇧+scroll twist · ⇧/⌥+drag rotate/twist",
  }),
);

const waveControls = document.createElement("div");
waveControls.className = "panel controls wave-controls hidden";

const waveThetaSlider = document.createElement("input");
waveThetaSlider.type = "range";
waveThetaSlider.id = "theta-wave";
waveThetaSlider.min = "0";
waveThetaSlider.max = String(TAU);
waveThetaSlider.step = "0.002";
waveThetaSlider.value = "0";

const waveThetaDisplay = document.createElement("div");
waveThetaDisplay.className = "theta-display";

const wavePlayBtn = document.createElement("button");
wavePlayBtn.type = "button";
wavePlayBtn.className = "primary";
wavePlayBtn.textContent = "▶ Animate θ";

waveControls.append(
  Object.assign(document.createElement("label"), {
    htmlFor: "theta-wave",
    textContent: "Phase offset θ",
  }),
  waveThetaSlider,
  waveThetaDisplay,
  wavePlayBtn,
  Object.assign(document.createElement("p"), {
    className: "hint",
    textContent:
      "Wave speed ω freezes wave + ripple at 0. “Animate θ” rotates phase separately. Trackpad: scroll pan · pinch zoom.",
  }),
);

sidebar.append(explorePanel, argandWrap, controls, wavePanel, waveControls);
app.append(viewport, sidebar);

const explorePanelEl = explorePanel;

// Preset buttons
for (const preset of WAVE_PRESETS) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "preset-btn";
  btn.dataset.preset = preset.id;
  btn.textContent = preset.name;
  if (preset.id === activePresetId) btn.classList.add("active");
  presetRow.append(btn);
}

// Engines
const scene = createScene3D(viewport);
const wave = createWaveShader(viewport);
const argandCtx = argandCanvas.getContext("2d")!;

let mode: AppMode = "explore";
let theta = 0;
let playing = false;
let wavePlaying = false;
let helixOn = true;
let lastTime = 0;
let lastWaveTextRender = 0;
let waveTextDirty = true;
let startTime = performance.now();

function applyPreset(preset: WavePreset) {
  activePresetId = preset.id;
  for (const btn of presetRow.querySelectorAll<HTMLButtonElement>(".preset-btn")) {
    btn.classList.toggle("active", btn.dataset.preset === preset.id);
  }
  gradientUI.setStops(parsePresetStops(preset.stops), preset.mirror ?? false);
  wave.setState({
    speed: preset.speed,
    freq: preset.freq,
    harmonics: preset.harmonics,
  });
  speedSlider.value = String(preset.speed);
  freqSlider.value = String(preset.freq);
  harmSlider.value = String(preset.harmonics);
  pushWaveUniforms();
}

const waveView = createWaveViewHandlers(viewSliders, () => pushWaveUniforms());

pushWaveUniforms = () => {
  wave.setState({
    theta,
    speed: Number(speedSlider.value),
    ripple: Number(rippleSlider.value),
    freq: Number(freqSlider.value),
    harmonics: Number(harmSlider.value),
    amplitude: Number(ampSlider.value),
    stops: gradientUI.getStops(),
    gradientMirror: gradientUI.getMirror(),
    view: waveView.getTransform(),
  });
};

bindWaveGestures(wave.canvas, waveView, () => mode === "wave");

function updateWaveText() {
  waveTextOverlay.classList.toggle("hidden", mode !== "wave" || !textEnabledInput.checked);
  viewport.classList.toggle("text-mask-active", mode === "wave" && textEnabledInput.checked);
  waveTextCanvas.style.opacity = textFillOpacitySlider.value;
  waveTextCanvas.style.filter = `brightness(${textFillBrightnessSlider.value}) saturate(${textFillSaturationSlider.value})`;
  waveTextStrokeCanvas.style.opacity = textStrokeOpacitySlider.value;
  waveTextStrokeCanvas.style.filter = `brightness(${textStrokeBrightnessSlider.value}) saturate(${textStrokeSaturationSlider.value})`;
  textControls.classList.toggle("text-disabled", !textEnabledInput.checked);
  waveTextDirty = true;
  renderWaveText(performance.now(), true);
}

function resizeCanvasToViewport(canvas: HTMLCanvasElement, width: number, height: number) {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.floor(width * scale));
  const pixelHeight = Math.max(1, Math.floor(height * scale));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
}

type CanvasTextContext = CanvasRenderingContext2D & {
  letterSpacing?: string;
};

function setCanvasTracking(ctx: CanvasRenderingContext2D, tracking: number) {
  const textCtx = ctx as CanvasTextContext;
  if ("letterSpacing" in textCtx) {
    textCtx.letterSpacing = `${tracking}px`;
  }
}

function measureWaveText(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  setCanvasTracking(ctx, tracking);
  return ctx.measureText(text).width;
}

function drawWaveText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  mode: "fill" | "stroke",
) {
  setCanvasTracking(ctx, tracking);
  if (mode === "fill") {
    ctx.fillText(text, x, y);
  } else {
    ctx.strokeText(text, x, y);
  }
}

function applyLayerTint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  amount: number,
) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = amount;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderWaveText(now: number, force = false) {
  if (!force && !waveTextDirty && now - lastWaveTextRender < 42) return;

  const rect = viewport.getBoundingClientRect();
  resizeCanvasToViewport(waveTextCanvas, rect.width, rect.height);
  resizeCanvasToViewport(waveTextStrokeCanvas, rect.width, rect.height);

  const ctx = waveTextCanvas.getContext("2d");
  const strokeCtx = waveTextStrokeCanvas.getContext("2d");
  if (!ctx || !strokeCtx) return;

  const width = waveTextCanvas.width;
  const height = waveTextCanvas.height;
  ctx.clearRect(0, 0, width, height);
  strokeCtx.clearRect(0, 0, width, height);

  if (mode !== "wave" || !textEnabledInput.checked) return;

  lastWaveTextRender = now;
  waveTextDirty = false;

  const scale = width / Math.max(rect.width, 1);
  const rawText = textInput.value.trim() || WAVE_TEXT_SETTINGS.text;
  const text = textUpperInput.checked ? rawText.toUpperCase() : rawText;
  const minViewport = Math.min(rect.width, rect.height);
  let fontSize = (Number(textSizeSlider.value) / 100) * minViewport * scale;
  let tracking = Number(textTrackingSlider.value) * fontSize;
  const fontStyle = textItalicInput.checked ? "italic " : "";
  const fontWeight = Math.min(
    900,
    Math.max(100, Math.round(Number(textWeightSlider.value) / 100) * 100),
  );
  const font = () => `${fontStyle}${fontWeight} ${fontSize}px ${fontSelect.value}`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font();

  const maxWidth = width * 0.88;
  const measured = measureWaveText(ctx, text, tracking);
  if (measured > maxWidth) {
    fontSize *= maxWidth / measured;
    tracking = Number(textTrackingSlider.value) * fontSize;
    ctx.font = font();
  }

  const x = width / 2;
  const y = height / 2 + fontSize * 0.03;
  const stroke = Number(textStrokeSlider.value) * fontSize;
  const strokeOffset = Number(textStrokeOffsetSlider.value) * fontSize;

  strokeCtx.save();
  strokeCtx.font = font();
  strokeCtx.textAlign = "center";
  strokeCtx.textBaseline = "middle";
  strokeCtx.lineJoin = "round";
  strokeCtx.lineWidth = Math.max(1, stroke * 2.2);
  strokeCtx.strokeStyle = "#fff";
  drawWaveText(strokeCtx, text, x + strokeOffset, y + strokeOffset, tracking, "stroke");
  strokeCtx.globalCompositeOperation = "source-in";
  strokeCtx.drawImage(wave.canvas, 0, 0, width, height);
  applyLayerTint(
    strokeCtx,
    width,
    height,
    textStrokeTintInput.value,
    Number(textStrokeTintSlider.value),
  );
  strokeCtx.restore();

  ctx.save();
  ctx.fillStyle = "#fff";
  drawWaveText(ctx, text, x, y, tracking, "fill");
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(wave.canvas, 0, 0, width, height);
  applyLayerTint(ctx, width, height, textFillTintInput.value, Number(textFillTintSlider.value));
  ctx.restore();
}

resetViewBtn.addEventListener("click", () => {
  waveView.setTransform({
    translateX: 0,
    translateY: 0,
    rotate: 0,
    zoom: 1,
    twist: 0,
    kxScale: 1,
    kyScale: 1,
  });
});

function applyTheta(t: number) {
  theta = ((t % TAU) + TAU) % TAU;
  thetaSlider.value = String(theta);
  waveThetaSlider.value = String(theta);

  valReal.textContent = Math.cos(theta).toFixed(3);
  valImag.textContent = Math.sin(theta).toFixed(3);
  const label = formatTheta(theta);
  thetaDisplay.textContent = label;
  waveThetaDisplay.textContent = label;
  identity.classList.toggle("active", isEulerIdentity(theta));

  scene.setTheta(theta);
  drawArgand(argandCtx, ARGAND_SIZE, theta);
  pushWaveUniforms();
}

function setMode(next: AppMode) {
  mode = next;
  app.dataset.mode = next;
  exploreModeBtn.classList.toggle("active", next === "explore");
  waveModeBtn.classList.toggle("active", next === "wave");
  explorePanelEl.classList.toggle("hidden", next === "wave");
  argandWrap.classList.toggle("hidden", next === "wave");
  controls.classList.toggle("hidden", next === "wave");
  wavePanel.classList.toggle("hidden", next === "explore");
  waveControls.classList.toggle("hidden", next === "explore");
  updateWaveText();

  const sceneCanvas = Array.from(viewport.querySelectorAll("canvas")).find(
    (canvas) =>
      !canvas.classList.contains("wave-canvas") && !canvas.classList.contains("wave-text-preview"),
  );
  if (sceneCanvas) {
    sceneCanvas.style.display = next === "explore" ? "block" : "none";
  }
  wave.canvas.style.display = next === "wave" ? "block" : "none";

  if (next === "wave") {
    wave.resize();
    pushWaveUniforms();
  } else {
    scene.resize();
    drawArgand(argandCtx, ARGAND_SIZE, theta);
  }
}

function tick(now: number) {
  const elapsed = (now - startTime) / 1000;

  if (mode === "explore" && playing) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    applyTheta(theta + dt * 0.55);
  } else if (mode === "wave" && wavePlaying) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    // θ animation is independent of wave speed (phase rotation only)
    applyTheta(theta + dt * 0.55);
  }

  lastTime = now;

  if (mode === "explore") {
    scene.render();
  } else {
    wave.render(elapsed);
    renderWaveText(now);
  }

  requestAnimationFrame(tick);
}

exploreModeBtn.addEventListener("click", () => setMode("explore"));
waveModeBtn.addEventListener("click", () => setMode("wave"));

thetaSlider.addEventListener("input", () => {
  playing = false;
  playBtn.textContent = "▶ Animate";
  applyTheta(Number(thetaSlider.value));
});

waveThetaSlider.addEventListener("input", () => {
  wavePlaying = false;
  wavePlayBtn.textContent = "▶ Animate θ";
  applyTheta(Number(waveThetaSlider.value));
});

playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "⏸ Pause" : "▶ Animate";
  lastTime = 0;
});

wavePlayBtn.addEventListener("click", () => {
  wavePlaying = !wavePlaying;
  wavePlayBtn.textContent = wavePlaying ? "⏸ Pause" : "▶ Animate θ";
  lastTime = 0;
});

piBtn.addEventListener("click", () => {
  playing = false;
  playBtn.textContent = "▶ Animate";
  applyTheta(Math.PI);
});

helixBtn.addEventListener("click", () => {
  helixOn = !helixOn;
  helixBtn.classList.toggle("active", helixOn);
  scene.setShowHelix(helixOn);
});

for (const slider of [speedSlider, rippleSlider, freqSlider, harmSlider, ampSlider]) {
  slider.addEventListener("input", pushWaveUniforms);
}

for (const control of [
  textEnabledInput,
  textInput,
  fontSelect,
  textSizeSlider,
  textWeightSlider,
  textTrackingSlider,
  textFillOpacitySlider,
  textFillTintInput,
  textFillTintSlider,
  textFillBrightnessSlider,
  textFillSaturationSlider,
  textStrokeSlider,
  textStrokeOffsetSlider,
  textStrokeOpacitySlider,
  textStrokeTintInput,
  textStrokeTintSlider,
  textStrokeBrightnessSlider,
  textStrokeSaturationSlider,
  textUpperInput,
  textItalicInput,
]) {
  control.addEventListener("input", updateWaveText);
}

presetRow.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".preset-btn");
  if (!btn?.dataset.preset) return;
  const preset = WAVE_PRESETS.find((p) => p.id === btn.dataset.preset);
  if (preset) applyPreset(preset);
});

window.addEventListener("resize", () => {
  scene.resize();
  wave.resize();
  waveTextDirty = true;
  renderWaveText(performance.now(), true);
  drawArgand(argandCtx, ARGAND_SIZE, theta);
});

const eulerPreset = WAVE_PRESETS.find((p) => p.id === "euler")!;
applyPreset(eulerPreset);
applyTheta(0);
setMode("explore");
requestAnimationFrame(tick);
