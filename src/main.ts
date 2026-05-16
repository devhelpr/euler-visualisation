import "./style.css";
import { drawArgand } from "./argand.ts";
import { createScene3D } from "./scene3d.ts";
import { createWaveShader } from "./waveShader.ts";
import { createGradientStopsUI } from "./waveGradient.ts";
import { bindWaveGestures, createWaveViewHandlers, type WaveViewSliders } from "./waveView.ts";
import { WAVE_PRESETS, type WavePreset } from "./wavePresets.ts";

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
explorePanel.append(title, subtitle, formula, identity, values);

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
let startTime = performance.now();

function applyPreset(preset: WavePreset) {
  activePresetId = preset.id;
  for (const btn of presetRow.querySelectorAll<HTMLButtonElement>(".preset-btn")) {
    btn.classList.toggle("active", btn.dataset.preset === preset.id);
  }
  gradientUI.setStops(
    preset.stops.map((s) => [...s] as (typeof preset.stops)[0]),
    preset.mirror ?? false,
  );
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

  const sceneCanvas = viewport.querySelector("canvas:not(.wave-canvas)");
  if (sceneCanvas instanceof HTMLCanvasElement) {
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

presetRow.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".preset-btn");
  if (!btn?.dataset.preset) return;
  const preset = WAVE_PRESETS.find((p) => p.id === btn.dataset.preset);
  if (preset) applyPreset(preset);
});

window.addEventListener("resize", () => {
  scene.resize();
  wave.resize();
  drawArgand(argandCtx, ARGAND_SIZE, theta);
});

const eulerPreset = WAVE_PRESETS.find((p) => p.id === "euler")!;
applyPreset(eulerPreset);
applyTheta(0);
setMode("explore");
requestAnimationFrame(tick);
