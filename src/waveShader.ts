import { MAX_GRADIENT_STOPS } from "./waveGradient.ts";
import type { GradientStop } from "./wavePresets.ts";
import type { WaveViewTransform } from "./waveView.ts";

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_theta;
uniform vec3 u_stops[${MAX_GRADIENT_STOPS}];
uniform float u_stopPositions[${MAX_GRADIENT_STOPS}];
uniform int u_stopCount;
uniform float u_gradientMirror;
uniform float u_speed;
uniform float u_ripple;
uniform float u_freq;
uniform float u_harmonics;
uniform float u_amplitude;

uniform vec2 u_translate;
uniform float u_rotate;
uniform float u_zoom;
uniform float u_twist;
uniform float u_kxScale;
uniform float u_kyScale;

vec2 euler(float phi) {
  return vec2(cos(phi), sin(phi));
}

vec2 applyView(vec2 p) {
  float z = max(u_zoom, 0.15);
  p /= z;

  float c = cos(u_rotate);
  float s = sin(u_rotate);
  p = mat2(c, s, -s, c) * p;

  p -= u_translate;

  float len = length(p);
  float tc = cos(u_twist * len);
  float ts = sin(u_twist * len);
  p = mat2(tc, ts, -ts, tc) * p;

  return p;
}

float mapGradientT(float t) {
  t = clamp(t, 0.0, 1.0);
  if (u_gradientMirror > 0.5) {
    return 1.0 - abs(t * 2.0 - 1.0);
  }
  return t;
}

vec3 sampleGradient(float t) {
  t = mapGradientT(t);
  int n = u_stopCount;
  if (n <= 1) return u_stops[0];
  if (t <= u_stopPositions[0]) return u_stops[0];
  if (t >= u_stopPositions[n - 1]) return u_stops[n - 1];

  for (int i = 0; i < ${MAX_GRADIENT_STOPS - 1}; i++) {
    if (i >= n - 1) break;
    float p0 = u_stopPositions[i];
    float p1 = u_stopPositions[i + 1];
    if (t >= p0 && t <= p1) {
      float f = (t - p0) / max(p1 - p0, 0.0001);
      return mix(u_stops[i], u_stops[i + 1], f);
    }
  }
  return u_stops[n - 1];
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = applyView((v_uv - 0.5) * aspect * 3.2);

  vec2 sum = vec2(0.0);
  int count = int(clamp(u_harmonics, 1.0, 8.0));

  float animT = u_time * u_speed;

  for (int i = 0; i < 8; i++) {
    if (i >= count) continue;
    float fi = float(i) + 1.0;
    float timePhase = -animT * fi + u_theta * fi;

    float phaseX = u_freq * fi * u_kxScale * p.x + timePhase;
    float phaseY = u_freq * fi * u_kyScale * p.y + timePhase + 0.785398;
    float phaseXY = u_freq * fi * (u_kxScale * p.x + u_kyScale * p.y) * 0.707 + timePhase;
    float phaseDiag = u_freq * fi * (u_kxScale * p.x - u_kyScale * p.y) * 0.707 + timePhase + 1.570796;

    sum += euler(phaseX);
    sum += euler(phaseY) * 0.92;
    sum += euler(phaseXY) * 0.65;
    sum += euler(phaseDiag) * 0.55;
  }

  float norm = float(count) * 3.12;
  float amp = length(sum) / norm;
  float arg = atan(sum.y, sum.x);

  float realPart = sum.x / norm;
  float imagPart = sum.y / norm;

  float tHeight = clamp(amp * u_amplitude, 0.0, 1.0);
  float tPhase = sin(arg) * 0.5 + 0.5;
  float tReal = realPart * 0.5 + 0.5;
  float tImag = imagPart * 0.5 + 0.5;

  float tBlend = clamp(tHeight * 0.62 + tPhase * 0.28 + tReal * 0.05 + tImag * 0.05, 0.0, 1.0);
  vec3 col = sampleGradient(tBlend);

  vec3 stopLo = u_stops[0];
  vec3 stopHi = u_stops[max(u_stopCount - 1, 0)];
  float ripple = u_ripple * sin(p.x * 12.0 * u_kxScale + animT * 2.0)
               * sin(p.y * 12.0 * u_kyScale - animT * 1.5);
  col += ripple * (stopHi - stopLo);

  float vig = 1.0 - 0.22 * length(p) / 2.8;
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
  outColor = vec4(col * vig + grain, 1.0);
}
`;

export type WaveShaderState = {
  theta: number;
  speed: number;
  ripple: number;
  freq: number;
  harmonics: number;
  amplitude: number;
  stops: GradientStop[];
  gradientMirror: boolean;
  view: WaveViewTransform;
};

export type WaveShader = {
  canvas: HTMLCanvasElement;
  setState: (partial: Partial<WaveShaderState>) => void;
  getState: () => WaveShaderState;
  resize: () => void;
  render: (timeSec: number) => void;
  dispose: () => void;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(`Shader compile: ${log}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "unknown";
    throw new Error(`Program link: ${log}`);
  }
  return prog;
}

function getWebGL2(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const ctx = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!ctx) throw new Error("WebGL2 not available");
  return ctx;
}

const stopsFlat = new Float32Array(MAX_GRADIENT_STOPS * 3);
const positionsFlat = new Float32Array(MAX_GRADIENT_STOPS);

export function createWaveShader(container: HTMLElement): WaveShader {
  const canvas = document.createElement("canvas");
  canvas.className = "wave-canvas";
  canvas.style.display = "none";
  container.appendChild(canvas);

  const gl = getWebGL2(canvas);

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = linkProgram(gl, vs, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const aPos = gl.getAttribLocation(program, "a_pos");
  const uRes = gl.getUniformLocation(program, "u_resolution")!;
  const uTime = gl.getUniformLocation(program, "u_time")!;
  const uTheta = gl.getUniformLocation(program, "u_theta")!;
  const uStops = gl.getUniformLocation(program, "u_stops")!;
  const uStopPositions = gl.getUniformLocation(program, "u_stopPositions")!;
  const uStopCount = gl.getUniformLocation(program, "u_stopCount")!;
  const uGradientMirror = gl.getUniformLocation(program, "u_gradientMirror")!;
  const uSpeed = gl.getUniformLocation(program, "u_speed")!;
  const uRipple = gl.getUniformLocation(program, "u_ripple")!;
  const uFreq = gl.getUniformLocation(program, "u_freq")!;
  const uHarmonics = gl.getUniformLocation(program, "u_harmonics")!;
  const uAmplitude = gl.getUniformLocation(program, "u_amplitude")!;
  const uTranslate = gl.getUniformLocation(program, "u_translate")!;
  const uRotate = gl.getUniformLocation(program, "u_rotate")!;
  const uZoom = gl.getUniformLocation(program, "u_zoom")!;
  const uTwist = gl.getUniformLocation(program, "u_twist")!;
  const uKxScale = gl.getUniformLocation(program, "u_kxScale")!;
  const uKyScale = gl.getUniformLocation(program, "u_kyScale")!;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const state: WaveShaderState = {
    theta: 0,
    speed: 1,
    ripple: 0.04,
    freq: 2.2,
    harmonics: 4,
    amplitude: 1.15,
    stops: [
      { color: [0.04, 0.06, 0.12], pos: 0 },
      { color: [0.25, 0.65, 0.98], pos: 0.5 },
      { color: [0.95, 0.45, 0.72], pos: 1 },
    ],
    gradientMirror: false,
    view: {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      zoom: 1,
      twist: 0,
      kxScale: 1,
      kyScale: 1,
    },
  };

  function uploadStops() {
    const n = Math.min(state.stops.length, MAX_GRADIENT_STOPS);
    const fallback = state.stops[n - 1] ??
      state.stops[0] ?? {
        color: [0, 0, 0] as const,
        pos: 1,
      };
    for (let i = 0; i < MAX_GRADIENT_STOPS; i++) {
      const stop = state.stops[i] ?? fallback;
      stopsFlat[i * 3] = stop.color[0];
      stopsFlat[i * 3 + 1] = stop.color[1];
      stopsFlat[i * 3 + 2] = stop.color[2];
      positionsFlat[i] = stop.pos;
    }
    gl.uniform3fv(uStops, stopsFlat);
    gl.uniform1fv(uStopPositions, positionsFlat);
    gl.uniform1i(uStopCount, n);
    gl.uniform1f(uGradientMirror, state.gradientMirror ? 1 : 0);
  }

  function uploadUniforms(timeSec: number) {
    const v = state.view;
    gl.useProgram(program);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeSec);
    gl.uniform1f(uTheta, state.theta);
    uploadStops();
    gl.uniform1f(uSpeed, state.speed);
    gl.uniform1f(uRipple, state.ripple);
    gl.uniform1f(uFreq, state.freq);
    gl.uniform1f(uHarmonics, state.harmonics);
    gl.uniform1f(uAmplitude, state.amplitude);
    gl.uniform2f(uTranslate, v.translateX, v.translateY);
    gl.uniform1f(uRotate, v.rotate);
    gl.uniform1f(uZoom, v.zoom);
    gl.uniform1f(uTwist, v.twist);
    gl.uniform1f(uKxScale, v.kxScale);
    gl.uniform1f(uKyScale, v.kyScale);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(timeSec: number) {
    uploadUniforms(timeSec);
    gl.clearColor(0.04, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function dispose() {
    gl.deleteProgram(program);
    gl.deleteBuffer(quad);
    canvas.remove();
  }

  resize();

  return {
    canvas,
    setState(partial) {
      Object.assign(state, partial);
      if (partial.stops) {
        state.stops = partial.stops.map((s) => ({
          color: [...s.color] as GradientStop["color"],
          pos: s.pos,
        }));
      }
      if (partial.view) state.view = { ...state.view, ...partial.view };
    },
    getState: () => ({
      ...state,
      stops: state.stops.map((s) => ({
        color: [...s.color] as GradientStop["color"],
        pos: s.pos,
      })),
      view: { ...state.view },
    }),
    resize,
    render,
    dispose,
  };
}
