# Euler's Formula — Interactive Visualiser

*Build with AI*

An interactive web app for exploring **Euler's formula** and the geometry of complex exponentials. Drag the angle θ, watch **e<sup>iθ</sup>** move on the unit circle, and see the same idea extended in time as a 3D helix. A second mode turns sums of rotating complex waves into full-screen gradient art via a custom WebGL shader.

**Live idea:** e<sup>iθ</sup> = cos θ + i sin θ — and at θ = π, the famous identity **e<sup>iπ</sup> + 1 = 0**.




## Features

### Explore mode

- **3D scene** (Three.js): unit circle in the complex plane, a phasor for e<sup>iθ</sup>, and an optional **helix** (θ mapped along the z-axis).
- **Argand diagram** (2D canvas): real and imaginary components, arc swept by θ, and live numeric readouts for cos θ and sin θ.
- **Controls**: θ slider, animate, jump to θ = π, toggle helix, orbit the 3D view with the mouse.

### Wave Preview mode

- **GPU shader** that sums complex exponentials Σ e<sup>iφ</sup> and maps the result to a colour gradient.
- **Presets**: Aurora, Sunset, Ocean, Euler, Identity, Neon — each with tuned colours, speed, frequency, and harmonics.
- **Gradient editor**: add, remove, drag, and mirror colour stops.
- **Wave parameters**: speed ω, ripple shimmer, frequency k, harmonics, amplitude, and phase offset θ.
- **View transform**: pan, zoom, rotate, twist, and per-axis wave scale — via sliders or trackpad/mouse gestures.

## Tech stack

| Layer | Tools |
|-------|--------|
| Build | [Vite+](https://viteplus.dev/) (`vp` CLI) |
| Language | TypeScript |
| 3D | [Three.js](https://threejs.org/) + OrbitControls |
| 2D / UI | Canvas API, vanilla DOM |
| Waves | WebGL 2 fragment shader (custom GLSL) |

## Getting started

Requires [Node.js](https://nodejs.org/) and npm. This repo uses the **Vite+** toolchain (`vp`).

```bash
# Install dependencies
vp install

# Development server
vp dev

# Production build
vp build

# Preview production build
vp preview
```

After `vp dev`, open the URL shown in the terminal (typically `http://localhost:5173`).


## Project structure

```
src/
  main.ts          App shell, mode switching, controls wiring
  argand.ts        2D Argand (complex plane) canvas
  scene3d.ts       Three.js unit circle, phasor, helix
  waveShader.ts    WebGL wave / gradient renderer
  waveGradient.ts  Gradient stop UI (drag, mirror, etc.)
  wavePresets.ts   Named colour & wave presets
  waveView.ts      View transform + pointer / trackpad gestures
  style.css        Layout and theme
```

## How it works (brief)

In **Explore**, θ parameterises a point on the unit circle: (cos θ, sin θ). The 3D view adds a time-like axis so repeated rotation becomes a helix — the same e<sup>iθ</sup> idea in one higher dimension.

In **Wave Preview**, the fragment shader evaluates a superposition of complex waves (with configurable k, ω, harmonics, and phase θ), takes magnitude or phase-like quantities, and samples a user-defined gradient. Presets and the stop editor only change uniforms and colours; the same shader drives every look.
