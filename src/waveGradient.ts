import { hexToRgb, rgbToHex, type Rgb } from "./wavePresets.ts";

export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 12;

export type GradientStopsUI = {
  mirrorCheckbox: HTMLInputElement;
  getStops: () => Rgb[];
  getMirror: () => boolean;
  setStops: (stops: Rgb[], mirror?: boolean) => void;
};

function stopPositionRatio(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return index / (count - 1);
}

function nearestStopIndex(t: number, count: number): number {
  if (count <= 1) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    const dist = Math.abs(stopPositionRatio(i, count) - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function createGradientStopsUI(parent: HTMLElement, onChange: () => void): GradientStopsUI {
  const sectionLabel = document.createElement("label");
  sectionLabel.className = "section-label";
  sectionLabel.textContent = "Gradient stops";

  const previewWrap = document.createElement("div");
  previewWrap.className = "gradient-preview-wrap";
  previewWrap.setAttribute("role", "group");
  previewWrap.setAttribute(
    "aria-label",
    "Gradient preview — click bar or handles to select a stop",
  );

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
  mirrorText.textContent = "Mirror gradient (reverse stops)";
  mirrorLabel.append(mirrorCheckbox, mirrorText);

  controls.append(addBtn, removeBtn);
  parent.append(sectionLabel, previewWrap, stopsList, controls, mirrorLabel);

  let stops: Rgb[] = [
    [0.04, 0.06, 0.12],
    [0.25, 0.65, 0.98],
    [0.95, 0.45, 0.72],
  ];
  let selectedIndex = 0;

  function selectStop(index: number) {
    selectedIndex = Math.max(0, Math.min(index, stops.length - 1));
    renderRows();
    updateMarkers();
  }

  function updatePreview() {
    const parts = stops.map((s) => rgbToHex(s));
    if (mirrorCheckbox.checked) {
      const mirrored = [...parts, ...[...parts].reverse().slice(1)];
      preview.style.background = `linear-gradient(90deg, ${mirrored.join(", ")})`;
    } else {
      preview.style.background = `linear-gradient(90deg, ${parts.join(", ")})`;
    }
  }

  function updateMarkers() {
    markers.replaceChildren();
    stops.forEach((color, index) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "gradient-preview-marker";
      marker.classList.toggle("selected", index === selectedIndex);
      marker.style.left = `${stopPositionRatio(index, stops.length) * 100}%`;
      marker.style.backgroundColor = rgbToHex(color);
      marker.title = `Stop ${index + 1}`;
      marker.setAttribute("aria-label", `Select stop ${index + 1}`);
      marker.setAttribute("aria-pressed", String(index === selectedIndex));
      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        selectStop(index);
      });
      markers.append(marker);
    });
  }

  function renderRows() {
    stopsList.replaceChildren();
    stops.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "gradient-stop-row";
      if (index === selectedIndex) row.classList.add("selected");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.setAttribute("aria-pressed", String(index === selectedIndex));

      const indexLabel = document.createElement("span");
      indexLabel.className = "stop-index";
      indexLabel.textContent = String(index + 1);

      const lbl = document.createElement("label");
      lbl.textContent = `Stop ${index + 1}`;
      lbl.htmlFor = `gradient-stop-${index}`;

      const input = document.createElement("input");
      input.type = "color";
      input.id = `gradient-stop-${index}`;
      input.value = rgbToHex(color);
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("input", () => {
        stops[index] = hexToRgb(input.value);
        updatePreview();
        updateMarkers();
        onChange();
      });

      row.append(indexLabel, lbl, input);
      row.addEventListener("click", () => selectStop(index));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectStop(index);
        }
      });

      stopsList.append(row);
    });

    stopsList.querySelector(".gradient-stop-row.selected")?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });

    addBtn.disabled = stops.length >= MAX_GRADIENT_STOPS;
    removeBtn.disabled = stops.length <= MIN_GRADIENT_STOPS;
    updatePreview();
    updateMarkers();
  }

  previewWrap.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".gradient-preview-marker")) return;
    const rect = preview.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    selectStop(nearestStopIndex(t, stops.length));
  });

  previewWrap.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectStop(selectedIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      selectStop(selectedIndex + 1);
    }
  });
  previewWrap.tabIndex = 0;

  addBtn.addEventListener("click", () => {
    if (stops.length >= MAX_GRADIENT_STOPS) return;
    const last = stops[stops.length - 1]!;
    const prev = stops[stops.length - 2] ?? last;
    stops.push([(last[0] + prev[0]) * 0.5, (last[1] + prev[1]) * 0.5, (last[2] + prev[2]) * 0.5]);
    selectStop(stops.length - 1);
    onChange();
  });

  removeBtn.addEventListener("click", () => {
    if (stops.length <= MIN_GRADIENT_STOPS) return;
    stops.splice(selectedIndex, 1);
    selectStop(Math.min(selectedIndex, stops.length - 1));
    onChange();
  });

  mirrorCheckbox.addEventListener("change", () => {
    updatePreview();
    onChange();
  });

  function setStops(next: Rgb[], mirror = false) {
    stops = next.slice(0, MAX_GRADIENT_STOPS).map((s) => [...s] as Rgb);
    while (stops.length < MIN_GRADIENT_STOPS) {
      stops.push([...stops[stops.length - 1]!] as Rgb);
    }
    mirrorCheckbox.checked = mirror;
    selectStop(0);
  }

  selectStop(0);

  return {
    mirrorCheckbox,
    getStops: () => stops.map((s) => [...s] as Rgb),
    getMirror: () => mirrorCheckbox.checked,
    setStops,
  };
}
