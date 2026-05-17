/** 2D canvas Argand diagram for e^(iθ) = cos θ + i sin θ */

const TAU = Math.PI * 2;

export function drawArgand(ctx: CanvasRenderingContext2D, size: number, theta: number): void {
  const pad = 38;
  const r = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // grid
  ctx.strokeStyle = "rgba(203,213,225,0.12)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const o = (i / 2) * r;
    ctx.beginPath();
    ctx.moveTo(cx + o, pad);
    ctx.lineTo(cx + o, size - pad);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, cy - o);
    ctx.lineTo(size - pad, cy - o);
    ctx.stroke();
  }

  // axes
  ctx.strokeStyle = "rgba(226,232,240,0.42)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pad, cy);
  ctx.lineTo(size - pad, cy);
  ctx.moveTo(cx, pad);
  ctx.lineTo(cx, size - pad);
  ctx.stroke();

  ctx.fillStyle = "rgba(226,232,240,0.82)";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText("Re", size - pad - 18, cy - 6);
  ctx.fillText("Im", cx + 6, pad + 14);

  // unit circle
  ctx.strokeStyle = "#a5b4fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  const x = Math.cos(theta);
  const y = -Math.sin(theta); // canvas y is flipped

  const px = cx + x * r;
  const py = cy + y * r;

  // projections
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "#5eead4";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#99f6e4";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("real = cos θ", cx + (px - cx) * 0.42 - 34, cy - 8);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#fef08a";
  ctx.fillText("imag = sin θ", px + 8, cy + (py - cy) * 0.5);

  // radius
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // arc for θ
  if (Math.abs(theta) > 0.02) {
    ctx.strokeStyle = "rgba(251,113,133,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, -theta, true);
    ctx.stroke();
    ctx.fillStyle = "#fda4af";
    ctx.font = "13px ui-monospace, monospace";
    const lx = cx + r * 0.38 * Math.cos(-theta / 2);
    const ly = cy + r * 0.38 * Math.sin(-theta / 2);
    ctx.fillText("θ", lx - 4, ly + 4);
  }

  // point
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.arc(px, py, 6.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(241,245,249,0.92)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(
    `(${x.toFixed(2)}, ${Math.sin(theta).toFixed(2)}i)`,
    Math.min(px + 8, size - pad - 70),
    py - 10,
  );
}

export function drawTrigWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theta: number,
): void {
  const padX = 34;
  const padY = 22;
  const plotW = width - padX * 2;
  const midY = height / 2;
  const amp = (height - padY * 2) / 2;
  const thetaX = padX + (theta / TAU) * plotW;

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(203,213,225,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = padX + (i / 4) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padY);
    ctx.lineTo(x, height - padY);
    ctx.stroke();
  }
  for (const y of [midY - amp, midY, midY + amp]) {
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
  }

  function plot(fn: (t: number) => number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const t = (i / plotW) * TAU;
      const x = padX + i;
      const y = midY - fn(t) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  plot(Math.cos, "#5eead4");
  plot(Math.sin, "#fde047");

  ctx.strokeStyle = "#fda4af";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(thetaX, padY - 4);
  ctx.lineTo(thetaX, height - padY + 4);
  ctx.stroke();

  ctx.fillStyle = "#99f6e4";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("cos θ", padX, padY - 8);
  ctx.fillStyle = "#fef08a";
  ctx.fillText("sin θ", padX + 58, padY - 8);
  ctx.fillStyle = "rgba(241,245,249,0.9)";
  ctx.fillText("θ", Math.min(thetaX + 5, width - padX), height - 8);
}
