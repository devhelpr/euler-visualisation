import {
  hexToRgb,
  normalizeGradientStops,
  rescaleStopPositions,
  rgbToHex,
  stopsFromColors,
  type GradientStop,
  type Rgb,
} from "./wavePresets.ts";

export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 12;
const MIN_STOP_GAP = 0.02;

export type GradientStopsUI = {
  mirrorCheckbox: HTMLInputElement;
  getStops: () => GradientStop[];
  getMirror: () => boolean;
  setStops: (stops: GradientStop[] | Rgb[], mirror?: boolean) => void;
};

function nearestStopIndex(t: number, stops: GradientStop[]): number {
  if (stops.length <= 1) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const dist = Math.abs(stops[i]!.pos - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function gradientCss(stops: GradientStop[]): string {
  const parts = stops.map((s) => `${rgbToHex(s.color)} ${s.pos * 100}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

function isEdgeStop(index: number, count: number): boolean {
  return index === 0 || index === count - 1;
}

function positionBounds(index: number, stops: GradientStop[]): { min: number; max: number } {
  if (index <= 0) return { min: 0, max: 0 };
  if (index >= stops.length - 1) return { min: 1, max: 1 };
  return {
    min: stops[index - 1]!.pos + MIN_STOP_GAP,
    max: stops[index + 1]!.pos - MIN_STOP_GAP,
  };
}

export function createGradientStopsUI(parent: HTMLElement, onChange: () => void): GradientStopsUI {
  const sectionLabel = document.createElement("label");
  sectionLabel.className = "section-label";
  sectionLabel.textContent = "Gradient stops";

  const previewWrap = document.createElement("div");
  previewWrap.className = "gradient-preview-wrap";
  previewWrap.setAttribute("role", "group");
  previewWrap.setAttribute("aria-label", "Gradient preview — drag handles to reposition stops");

  const preview = document.createElement("div");
  preview.className = "gradient-preview";
  preview.setAttribute("aria-hidden", "true");

  const markers = document.createElement("div");
  markers.className = "gradient-preview-markers";

  previewWrap.append(preview, markers);

  const stopsList = document.createElement("div");
  stopsList.className = "gradient-stops-list";

  const controls = document.createElement("div");
  controls.className = "gradient-stops-controls";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+ Add stop";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "− Remove selected";

  const mirrorLabel = document.createElement("label");
  mirrorLabel.className = "checkbox-field";
  const mirrorCheckbox = document.createElement("input");
  mirrorCheckbox.type = "checkbox";
  mirrorCheckbox.id = "gradient-mirror";
  const mirrorText = document.createElement("span");
  mirrorText.textContent = "Mirror in wave view (shader only)";
  mirrorLabel.append(mirrorCheckbox, mirrorText);

  controls.append(addBtn, removeBtn);
  parent.append(sectionLabel, previewWrap, stopsList, controls, mirrorLabel);

  let stops: GradientStop[] = normalizeGradientStops(
    stopsFromColors([
      [0.04, 0.06, 0.12],
      [0.25, 0.65, 0.98],
      [0.95, 0.45, 0.72],
    ]),
  );
  let selectedIndex = 0;
  let dragIndex = -1;

  function refreshUi() {
    updatePreview();
    updateMarkers();
    renderRows();
  }

  function emitChange() {
    stops = normalizeGradientStops(stops);
    refreshUi();
    onChange();
  }

  function selectStop(index: number) {
    selectedIndex = Math.max(0, Math.min(index, stops.length - 1));
    refreshUi();
  }

  function setStopPosition(index: number, pos: number) {
    if (isEdgeStop(index, stops.length)) return;
    const { min, max } = positionBounds(index, stops);
    if (max <= min) return;
    stops[index]!.pos = Math.max(min, Math.min(max, pos));
    emitChange();
  }

  function updatePreview() {
    preview.style.background = gradientCss(stops);
  }

  function updateMarkers() {
    markers.replaceChildren();
    stops.forEach((stop, index) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "gradient-preview-marker";
      marker.classList.toggle("selected", index === selectedIndex);
      const edge = isEdgeStop(index, stops.length);
      marker.classList.toggle("locked", edge);
      marker.style.left = `${stop.pos * 100}%`;
      marker.style.backgroundColor = rgbToHex(stop.color);
      marker.title = edge
        ? `Stop ${index + 1} (start/end — 0% or 100%)`
        : `Stop ${index + 1} — drag to reposition`;
      marker.setAttribute("aria-label", marker.title);
      marker.setAttribute("aria-pressed", String(index === selectedIndex));

      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        selectStop(index);
      });

      if (!edge) {
        marker.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          dragIndex = index;
          selectStop(index);
          marker.setPointerCapture(e.pointerId);
        });
      }

      markers.append(marker);
    });
  }

  function renderRows() {
    stopsList.replaceChildren();
    const onlyTwo = stops.length <= MIN_GRADIENT_STOPS;

    stops.forEach((stop, index) => {
      const row = document.createElement("div");
      row.className = "gradient-stop-row";
      if (index === selectedIndex) row.classList.add("selected");

      const head = document.createElement("div");
      head.className = "gradient-stop-head";
      head.setAttribute("role", "button");
      head.tabIndex = 0;
      head.setAttribute("aria-pressed", String(index === selectedIndex));

      const indexLabel = document.createElement("span");
      indexLabel.className = "stop-index";
      indexLabel.textContent = String(index + 1);

      const lbl = document.createElement("label");
      lbl.textContent = `Stop ${index + 1}`;
      lbl.htmlFor = `gradient-stop-${index}`;

      const input = document.createElement("input");
      input.type = "color";
      input.id = `gradient-stop-${index}`;
      input.value = rgbToHex(stop.color);
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("input", () => {
        stops[index]!.color = hexToRgb(input.value);
        refreshUi();
        onChange();
      });

      head.append(indexLabel, lbl, input);
      head.addEventListener("click", () => selectStop(index));
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectStop(index);
        }
      });

      row.append(head);

      const edge = isEdgeStop(index, stops.length);
      const posField = document.createElement("div");
      posField.className = "gradient-stop-pos";

      const posLabel = document.createElement("label");
      posLabel.htmlFor = `gradient-pos-${index}`;

      const posSlider = document.createElement("input");
      posSlider.type = "range";
      posSlider.id = `gradient-pos-${index}`;
      posSlider.step = "1";

      if (edge || onlyTwo) {
        posLabel.textContent = `Position ${Math.round(stop.pos * 100)}% (start/end)`;
        posSlider.min = String(Math.round(stop.pos * 100));
        posSlider.max = String(Math.round(stop.pos * 100));
        posSlider.value = posSlider.min;
        posSlider.disabled = true;
      } else {
        const { min, max } = positionBounds(index, stops);
        const minPct = Math.ceil(min * 100);
        const maxPct = Math.floor(max * 100);
        const valPct = Math.round(Math.max(minPct, Math.min(maxPct, stop.pos * 100)));
        posLabel.textContent = `Position ${valPct}%`;
        posSlider.min = String(minPct);
        posSlider.max = String(Math.max(minPct, maxPct));
        posSlider.value = String(valPct);
        posSlider.disabled = maxPct <= minPct;
        posSlider.addEventListener("input", () => {
          setStopPosition(index, Number(posSlider.value) / 100);
        });
      }

      posField.append(posLabel, posSlider);
      row.append(posField);
      stopsList.append(row);
    });

    stopsList.querySelector(".gradient-stop-row.selected")?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });

    addBtn.disabled = stops.length >= MAX_GRADIENT_STOPS;
    removeBtn.disabled = stops.length <= MIN_GRADIENT_STOPS;
  }

  previewWrap.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".gradient-preview-marker")) return;
    const rect = preview.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    selectStop(nearestStopIndex(t, stops));
  });

  previewWrap.addEventListener("pointermove", (e) => {
    if (dragIndex < 0) return;
    const rect = preview.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setStopPosition(dragIndex, t);
  });

  previewWrap.addEventListener("pointerup", () => {
    dragIndex = -1;
  });
  previewWrap.addEventListener("pointercancel", () => {
    dragIndex = -1;
  });

  previewWrap.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (!isEdgeStop(selectedIndex, stops.length)) {
        setStopPosition(selectedIndex, stops[selectedIndex]!.pos - step);
      } else {
        selectStop(selectedIndex - 1);
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!isEdgeStop(selectedIndex, stops.length)) {
        setStopPosition(selectedIndex, stops[selectedIndex]!.pos + step);
      } else {
        selectStop(selectedIndex + 1);
      }
    }
  });
  previewWrap.tabIndex = 0;

  addBtn.addEventListener("click", () => {
    if (stops.length >= MAX_GRADIENT_STOPS) return;
    const i = selectedIndex;
    const next = Math.min(i + 1, stops.length - 1);
    const pos = (stops[i]!.pos + stops[next]!.pos) * 0.5;
    const color = lerpRgb(stops[i]!.color, stops[next]!.color, 0.5);
    stops.splice(next, 0, { color, pos });
    selectStop(next);
    emitChange();
  });

  removeBtn.addEventListener("click", () => {
    if (stops.length <= MIN_GRADIENT_STOPS) return;
    const wasEdge = isEdgeStop(selectedIndex, stops.length);
    stops.splice(selectedIndex, 1);
    if (wasEdge) {
      stops = rescaleStopPositions(stops);
    }
    selectedIndex = Math.min(selectedIndex, stops.length - 1);
    emitChange();
  });

  mirrorCheckbox.addEventListener("change", () => {
    updatePreview();
    onChange();
  });

  function setStops(next: GradientStop[] | Rgb[], mirror = false) {
    const isRgbOnly = next.length > 0 && Array.isArray(next[0]) && !("pos" in (next[0] as object));
    stops = normalizeGradientStops(
      isRgbOnly ? stopsFromColors(next as Rgb[]) : (next as GradientStop[]),
    );
    mirrorCheckbox.checked = mirror;
    selectStop(0);
  }

  selectStop(0);

  return {
    mirrorCheckbox,
    getStops: () => stops.map((s) => ({ color: [...s.color] as Rgb, pos: s.pos })),
    getMirror: () => mirrorCheckbox.checked,
    setStops,
  };
}
