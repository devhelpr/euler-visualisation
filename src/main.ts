import "./style.css";
import { drawArgand, drawTrigWaves } from "./argand.ts";
import { createScene3D } from "./scene3d.ts";
import { createWaveShader } from "./waveShader.ts";
import { createGradientStopsUI } from "./waveGradient.ts";
import { WAVE_TEXT_SETTINGS } from "./waveTextSettings.ts";
import { bindWaveGestures, createWaveViewHandlers, type WaveViewSliders } from "./waveView.ts";
import { parsePresetStops, WAVE_PRESETS, type WavePreset } from "./wavePresets.ts";

const TAU = Math.PI * 2;
const ARGAND_SIZE = 320;

type AppMode = "explore" | "wave";
type FourierCircle = {
  id: number;
  harmonic: HTMLInputElement;
  amplitude: HTMLInputElement;
  phase: HTMLInputElement;
  speed: HTMLInputElement;
  row: HTMLDivElement;
};

function formatTheta(theta: number): string {
  const deg = ((theta * 180) / Math.PI).toFixed(1);
  if (Math.abs(theta - TAU) < 0.04) return `θ = 2π (${deg}°)`;
  if (Math.abs(theta - Math.PI) < 0.04) return `θ = π (${deg}°)`;
  if (Math.abs(theta) < 0.04) return `θ = 0 (${deg}°)`;
  if (Math.abs(theta - Math.PI / 2) < 0.04) return `θ = π/2 (${deg}°)`;
  return `θ = ${theta.toFixed(3)} rad (${deg}°)`;
}

function formatComplexValue(real: number, imag: number): string {
  const sign = imag < 0 ? "−" : "+";
  return `${real.toFixed(3)} ${sign} ${Math.abs(imag).toFixed(3)}i`;
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

const fourierCanvas = document.createElement("canvas");
fourierCanvas.className = "fourier-overlay hidden";
viewport.append(fourierCanvas);

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

const complexValue = document.createElement("div");
complexValue.className = "complex-value";
complexValue.innerHTML = "e<sup>iθ</sup> = <span>1.000 + 0.000i</span>";

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
      "The circle shows the value of e^(iθ) for one angle. The helix shows how that value evolves as θ keeps increasing over time.",
  }),
  Object.assign(document.createElement("p"), {
    textContent:
      "In 3D, x = cos θ, y = sin θ, and z increases with θ. The blue point is still the complex value; depth simply shows the path through changing angles.",
  }),
);

explainer.append(
  Object.assign(document.createElement("h2"), {
    textContent: "Introduction",
  }),
  Object.assign(document.createElement("p"), {
    innerHTML:
      "Euler's formula says that rotating around the unit circle can be written as e<sup>iθ</sup>. The moving point is a complex number x + iy, where x = cos θ and y = sin θ.",
  }),
  Object.assign(document.createElement("p"), {
    innerHTML: "At θ = π, the point lands at −1, giving Euler's identity: e<sup>iπ</sup> + 1 = 0.",
  }),
  threeDDetails,
  Object.assign(document.createElement("p"), {
    className: "disclaimer",
    textContent:
      "Note: Wave Preview is an Euler-inspired artistic wave field and a bridge toward sums of complex exponentials, not a literal proof or exact plot of Euler's formula.",
  }),
);

explorePanel.append(title, subtitle, formula, complexValue, identity, values, explainer);

const argandWrap = document.createElement("div");
argandWrap.className = "argand-wrap explore-only";
argandWrap.append(
  Object.assign(document.createElement("h2"), {
    textContent: "Circle → waves",
  }),
  Object.assign(document.createElement("div"), {
    className: "canvas-split",
  }),
);

const canvasSplit = argandWrap.querySelector<HTMLDivElement>(".canvas-split")!;
const circlePane = document.createElement("div");
circlePane.className = "canvas-pane";
circlePane.append(
  Object.assign(document.createElement("div"), {
    className: "canvas-pane-label",
    textContent: "Unit circle / complex plane",
  }),
);
const argandCanvas = document.createElement("canvas");
argandCanvas.id = "argand";
argandCanvas.width = ARGAND_SIZE;
argandCanvas.height = ARGAND_SIZE;
circlePane.append(argandCanvas);

const wavesPane = document.createElement("div");
wavesPane.className = "canvas-pane";
wavesPane.append(
  Object.assign(document.createElement("div"), {
    className: "canvas-pane-label",
    textContent: "cos θ and sin θ over one turn",
  }),
);
const wavesCanvas = document.createElement("canvas");
wavesCanvas.id = "waves";
wavesCanvas.width = ARGAND_SIZE;
wavesCanvas.height = 180;
wavesPane.append(wavesCanvas);

canvasSplit.append(circlePane, wavesPane);

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

const helixBtn = document.createElement("button");
helixBtn.type = "button";
helixBtn.id = "helix";
helixBtn.className = "active";
helixBtn.textContent = "Helix";

const btnRow = document.createElement("div");
btnRow.className = "btn-row";
btnRow.append(playBtn, helixBtn);

const keyMomentLabel = document.createElement("label");
keyMomentLabel.className = "section-label key-moment-label";
keyMomentLabel.textContent = "Key moments";

function keyMomentButton(label: string, value: number): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "key-moment-btn";
  btn.dataset.theta = String(value);
  btn.textContent = label;
  return btn;
}

const keyMomentRow = document.createElement("div");
keyMomentRow.className = "btn-row key-moment-row";
keyMomentRow.append(
  keyMomentButton("θ = 0 → 1", 0),
  keyMomentButton("θ = π/2 → i", Math.PI / 2),
  keyMomentButton("θ = π → −1", Math.PI),
  keyMomentButton("θ = 2π → 1", TAU),
);

controls.append(
  Object.assign(document.createElement("label"), {
    htmlFor: "theta",
    textContent: "Angle θ",
  }),
  thetaSlider,
  thetaDisplay,
  btnRow,
  keyMomentLabel,
  keyMomentRow,
  Object.assign(document.createElement("p"), {
    className: "hint",
    textContent: "Drag the 3D view to orbit. Real part = cos θ, imaginary part = sin θ.",
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

const fourierLabel = document.createElement("label");
fourierLabel.className = "section-label";
fourierLabel.textContent = "Fourier circles";

const fourierControls = document.createElement("div");
fourierControls.className = "fourier-controls";

const fourierBtnRow = document.createElement("div");
fourierBtnRow.className = "gradient-stops-controls";

const addFourierCircleBtn = document.createElement("button");
addFourierCircleBtn.type = "button";
addFourierCircleBtn.textContent = "+ Add circle";

const clearFourierCirclesBtn = document.createElement("button");
clearFourierCirclesBtn.type = "button";
clearFourierCirclesBtn.textContent = "Clear";

fourierBtnRow.append(addFourierCircleBtn, clearFourierCirclesBtn);

const fourierList = document.createElement("div");
fourierList.className = "fourier-list";

fourierControls.append(
  fourierLabel,
  Object.assign(document.createElement("p"), {
    className: "hint fourier-hint",
    textContent:
      "Overlay rotating vectors on the wave preview. Each added circle starts from the current wave phase and applies a small harmonic/amplitude transform.",
  }),
  fourierBtnRow,
  fourierList,
);
wavePanel.append(fourierControls);

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
let fourierCircleId = 0;
const fourierCircles: FourierCircle[] = [];
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
    fourier: fourierCircles.map((circle) => ({
      harmonic: Number(circle.harmonic.value),
      amplitude: Number(circle.amplitude.value),
      phase: Number(circle.phase.value),
      speed: Number(circle.speed.value),
    })),
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

function smallNumberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
): HTMLLabelElement {
  const wrap = document.createElement("label");
  const input = document.createElement("input");
  input.type = "number";
  input.value = String(value);
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  wrap.append(document.createTextNode(label), input);
  return wrap;
}

function syncFourierOverlayVisibility() {
  fourierCanvas.classList.toggle("hidden", mode !== "wave" || fourierCircles.length === 0);
}

function addFourierCircle() {
  const index = fourierCircles.length;
  const harmonic = index * 2 + 1;
  const amplitude = 1 / harmonic;
  const row = document.createElement("div");
  row.className = "fourier-row";

  const title = document.createElement("div");
  title.className = "fourier-row-title";
  title.textContent = `Circle ${index + 1}`;

  const harmonicField = smallNumberInput("n", harmonic, 1, 15, 1);
  const amplitudeField = smallNumberInput("amp", Number(amplitude.toFixed(3)), 0, 2, 0.05);
  const phaseField = smallNumberInput("phase", 0, -TAU, TAU, 0.1);
  const speedField = smallNumberInput("speed", 1, -3, 3, 0.1);
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";

  row.append(title, harmonicField, amplitudeField, phaseField, speedField, removeBtn);
  fourierList.append(row);

  const circle: FourierCircle = {
    id: fourierCircleId++,
    harmonic: harmonicField.querySelector("input")!,
    amplitude: amplitudeField.querySelector("input")!,
    phase: phaseField.querySelector("input")!,
    speed: speedField.querySelector("input")!,
    row,
  };
  fourierCircles.push(circle);

  const update = () => {
    pushWaveUniforms();
    drawFourierCircles(performance.now() / 1000);
  };
  for (const input of [circle.harmonic, circle.amplitude, circle.phase, circle.speed]) {
    input.addEventListener("input", update);
  }
  removeBtn.addEventListener("click", () => {
    const i = fourierCircles.findIndex((item) => item.id === circle.id);
    if (i >= 0) fourierCircles.splice(i, 1);
    row.remove();
    syncFourierOverlayVisibility();
    pushWaveUniforms();
    drawFourierCircles(performance.now() / 1000);
  });

  syncFourierOverlayVisibility();
  pushWaveUniforms();
  drawFourierCircles(performance.now() / 1000);
}

function resizeFourierCanvas() {
  const rect = viewport.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * scale));
  const height = Math.max(1, Math.floor(rect.height * scale));
  if (fourierCanvas.width !== width || fourierCanvas.height !== height) {
    fourierCanvas.width = width;
    fourierCanvas.height = height;
    fourierCanvas.style.width = `${rect.width}px`;
    fourierCanvas.style.height = `${rect.height}px`;
  }
}

function drawFourierCircles(timeSec: number) {
  resizeFourierCanvas();
  const ctx = fourierCanvas.getContext("2d");
  if (!ctx) return;

  const width = fourierCanvas.width;
  const height = fourierCanvas.height;
  ctx.clearRect(0, 0, width, height);
  if (mode !== "wave" || fourierCircles.length === 0) return;

  const scale = width / Math.max(viewport.clientWidth, 1);
  const baseX = width * 0.18;
  const baseY = height * 0.5;
  const baseRadius = Math.min(width, height) * 0.12;
  const basePhase = theta + timeSec * Number(speedSlider.value);

  let x = baseX;
  let y = baseY;
  const points: Array<[number, number]> = [[x, y]];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.font = `${12 * scale}px ui-monospace, monospace`;
  ctx.fillStyle = "rgba(241,245,249,0.82)";
  ctx.fillText("Σ rotating e^(inθ)", baseX - baseRadius, baseY - baseRadius * 1.45);

  for (let i = 0; i < fourierCircles.length; i++) {
    const circle = fourierCircles[i]!;
    const harmonic = Number(circle.harmonic.value);
    const amplitude = Number(circle.amplitude.value);
    const phase = Number(circle.phase.value);
    const speed = Number(circle.speed.value);
    const radius = baseRadius * amplitude;
    const angle = basePhase * harmonic * speed + phase;
    const nextX = x + Math.cos(angle) * radius;
    const nextY = y - Math.sin(angle) * radius;

    ctx.strokeStyle = `rgba(165,180,252,${0.55 - Math.min(i, 4) * 0.07})`;
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.beginPath();
    ctx.arc(x, y, Math.abs(radius), 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = i % 2 === 0 ? "#7dd3fc" : "#fda4af";
    ctx.lineWidth = Math.max(1.4, 2.1 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();

    x = nextX;
    y = nextY;
    points.push([x, y]);
  }

  ctx.strokeStyle = "rgba(94,234,212,0.82)";
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i]!;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.arc(x, y, 4.5 * scale, 0, TAU);
  ctx.fill();
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
  theta = Math.abs(t - TAU) < 0.001 ? TAU : ((t % TAU) + TAU) % TAU;
  thetaSlider.value = String(theta);
  waveThetaSlider.value = String(theta);

  const real = Math.cos(theta);
  const imag = Math.sin(theta);
  valReal.textContent = real.toFixed(3);
  valImag.textContent = imag.toFixed(3);
  complexValue.innerHTML = `e<sup>iθ</sup> = <span>${formatComplexValue(real, imag)}</span>`;
  const label = formatTheta(theta);
  thetaDisplay.textContent = label;
  waveThetaDisplay.textContent = label;
  identity.classList.toggle("active", isEulerIdentity(theta));

  scene.setTheta(theta);
  drawArgand(argandCtx, ARGAND_SIZE, theta);
  drawTrigWaves(wavesCanvas.getContext("2d")!, ARGAND_SIZE, wavesCanvas.height, theta);
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
  syncFourierOverlayVisibility();

  const sceneCanvas = Array.from(viewport.querySelectorAll("canvas")).find(
    (canvas) =>
      !canvas.classList.contains("wave-canvas") &&
      !canvas.classList.contains("wave-text-preview") &&
      !canvas.classList.contains("fourier-overlay"),
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
    drawTrigWaves(wavesCanvas.getContext("2d")!, ARGAND_SIZE, wavesCanvas.height, theta);
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
    drawFourierCircles(elapsed);
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

addFourierCircleBtn.addEventListener("click", addFourierCircle);

clearFourierCirclesBtn.addEventListener("click", () => {
  fourierCircles.splice(0, fourierCircles.length);
  fourierList.replaceChildren();
  syncFourierOverlayVisibility();
  pushWaveUniforms();
  drawFourierCircles(performance.now() / 1000);
});

keyMomentRow.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".key-moment-btn");
  if (!btn?.dataset.theta) return;
  playing = false;
  playBtn.textContent = "▶ Animate";
  applyTheta(Number(btn.dataset.theta));
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
  resizeFourierCanvas();
  waveTextDirty = true;
  renderWaveText(performance.now(), true);
  drawArgand(argandCtx, ARGAND_SIZE, theta);
  drawTrigWaves(wavesCanvas.getContext("2d")!, ARGAND_SIZE, wavesCanvas.height, theta);
});

const eulerPreset = WAVE_PRESETS.find((p) => p.id === "euler")!;
applyPreset(eulerPreset);
applyTheta(0);
setMode("explore");
requestAnimationFrame(tick);
