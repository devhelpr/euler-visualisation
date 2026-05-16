/** 2D canvas Argand diagram for e^(iθ) = cos θ + i sin θ */

const TAU = Math.PI * 2;

export function drawArgand(ctx: CanvasRenderingContext2D, size: number, theta: number): void {
  const pad = 36;
  const r = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
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
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(pad, cy);
  ctx.lineTo(size - pad, cy);
  ctx.moveTo(cx, pad);
  ctx.lineTo(cx, size - pad);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("Re", size - pad - 18, cy - 6);
  ctx.fillText("Im", cx + 6, pad + 14);

  // unit circle
  ctx.strokeStyle = "#818cf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  const x = Math.cos(theta);
  const y = -Math.sin(theta); // canvas y is flipped

  const px = cx + x * r;
  const py = cy + y * r;

  // projections
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#34d399";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, cy);
  ctx.stroke();

  ctx.strokeStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.setLineDash([]);

  // radius
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // arc for θ
  if (Math.abs(theta) > 0.02) {
    ctx.strokeStyle = "rgba(244,114,182,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, -theta, true);
    ctx.stroke();
    ctx.fillStyle = "#f472b6";
    ctx.font = "12px ui-monospace, monospace";
    const lx = cx + r * 0.38 * Math.cos(-theta / 2);
    const ly = cy + r * 0.38 * Math.sin(-theta / 2);
    ctx.fillText("θ", lx - 4, ly + 4);
  }

  // point
  ctx.fillStyle = "#60a5fa";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText(
    `(${x.toFixed(2)}, ${Math.sin(theta).toFixed(2)}i)`,
    Math.min(px + 8, size - pad - 70),
    py - 10,
  );
}
