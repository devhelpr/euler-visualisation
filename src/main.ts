import "./style.css";
import { drawArgand } from "./argand.ts";
import { createScene3D } from "./scene3d.ts";

const TAU = Math.PI * 2;
const ARGAND_SIZE = 320;

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

const viewport = document.createElement("div");
viewport.className = "viewport";
viewport.id = "viewport";

const sidebar = document.createElement("aside");
sidebar.className = "sidebar";

const panel = document.createElement("div");
panel.className = "panel";

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

const realCard = document.createElement("div");
realCard.className = "value-card real";
const realLabel = document.createElement("div");
realLabel.className = "label";
realLabel.textContent = "Re = cos θ";
realCard.append(realLabel, valReal);

const imagCard = document.createElement("div");
imagCard.className = "value-card imag";
const imagLabel = document.createElement("div");
imagLabel.className = "label";
imagLabel.textContent = "Im = sin θ";
imagCard.append(imagLabel, valImag);

const values = document.createElement("div");
values.className = "values";
values.append(realCard, imagCard);

panel.append(title, subtitle, formula, identity, values);

const argandWrap = document.createElement("div");
argandWrap.className = "argand-wrap";
const argandHeading = document.createElement("h2");
argandHeading.textContent = "Complex plane (canvas)";
const argandCanvas = document.createElement("canvas");
argandCanvas.id = "argand";
argandCanvas.width = ARGAND_SIZE;
argandCanvas.height = ARGAND_SIZE;
argandWrap.append(argandHeading, argandCanvas);

const controls = document.createElement("div");
controls.className = "panel controls";

const thetaLabelEl = document.createElement("label");
thetaLabelEl.htmlFor = "theta";
thetaLabelEl.textContent = "Angle θ";

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

const btnRow = document.createElement("div");
btnRow.className = "btn-row";

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

btnRow.append(playBtn, piBtn, helixBtn);

const hint = document.createElement("p");
hint.className = "hint";
hint.textContent = "Drag the 3D view to orbit. Green = real axis, gold = imaginary.";

controls.append(thetaLabelEl, thetaSlider, thetaDisplay, btnRow, hint);

sidebar.append(panel, argandWrap, controls);
app.append(viewport, sidebar);

const scene = createScene3D(viewport);
const argandCtx = argandCanvas.getContext("2d")!;

let theta = 0;
let playing = false;
let helixOn = true;
let lastTime = 0;

function applyTheta(t: number) {
  theta = ((t % TAU) + TAU) % TAU;
  thetaSlider.value = String(theta);

  valReal.textContent = Math.cos(theta).toFixed(3);
  valImag.textContent = Math.sin(theta).toFixed(3);
  thetaDisplay.textContent = formatTheta(theta);
  identity.classList.toggle("active", isEulerIdentity(theta));

  scene.setTheta(theta);
  drawArgand(argandCtx, ARGAND_SIZE, theta);
}

function tick(now: number) {
  if (playing) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    applyTheta(theta + dt * 0.55);
  }
  lastTime = now;
  scene.render();
  requestAnimationFrame(tick);
}

thetaSlider.addEventListener("input", () => {
  playing = false;
  playBtn.textContent = "▶ Animate";
  applyTheta(Number(thetaSlider.value));
});

playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "⏸ Pause" : "▶ Animate";
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

window.addEventListener("resize", () => {
  scene.resize();
  drawArgand(argandCtx, ARGAND_SIZE, theta);
});

applyTheta(0);
requestAnimationFrame(tick);
