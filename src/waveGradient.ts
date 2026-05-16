import { hexToRgb, rgbToHex, type Rgb } from "./wavePresets.ts";

export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 12;

export type GradientStopsUI = {
  mirrorCheckbox: HTMLInputElement;
  getStops: () => Rgb[];
  getMirror: () => boolean;
  setStops: (stops: Rgb[], mirror?: boolean) => void;
};

export function createGradientStopsUI(parent: HTMLElement, onChange: () => void): GradientStopsUI {
  const sectionLabel = document.createElement("label");
  sectionLabel.className = "section-label";
  sectionLabel.textContent = "Gradient stops";

  const preview = document.createElement("div");
  preview.className = "gradient-preview";
  preview.setAttribute("role", "presentation");

  const stopsList = document.createElement("div");
  stopsList.className = "gradient-stops-list";

  const controls = document.createElement("div");
  controls.className = "gradient-stops-controls";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+ Add stop";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "− Remove stop";

  const mirrorLabel = document.createElement("label");
  mirrorLabel.className = "checkbox-field";
  const mirrorCheckbox = document.createElement("input");
  mirrorCheckbox.type = "checkbox";
  mirrorCheckbox.id = "gradient-mirror";
  const mirrorText = document.createElement("span");
  mirrorText.textContent = "Mirror gradient (reverse stops)";
  mirrorLabel.append(mirrorCheckbox, mirrorText);

  controls.append(addBtn, removeBtn);
  parent.append(sectionLabel, preview, stopsList, controls, mirrorLabel);

  let stops: Rgb[] = [
    [0.04, 0.06, 0.12],
    [0.25, 0.65, 0.98],
    [0.95, 0.45, 0.72],
  ];

  function updatePreview() {
    const parts = stops.map((s) => rgbToHex(s));
    if (mirrorCheckbox.checked) {
      const mirrored = [...parts, ...[...parts].reverse().slice(1)];
      preview.style.background = `linear-gradient(90deg, ${mirrored.join(", ")})`;
    } else {
      preview.style.background = `linear-gradient(90deg, ${parts.join(", ")})`;
    }
  }

  function renderRows() {
    stopsList.replaceChildren();
    stops.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "gradient-stop-row";

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
      input.addEventListener("input", () => {
        stops[index] = hexToRgb(input.value);
        updatePreview();
        onChange();
      });

      row.append(indexLabel, lbl, input);
      stopsList.append(row);
    });

    addBtn.disabled = stops.length >= MAX_GRADIENT_STOPS;
    removeBtn.disabled = stops.length <= MIN_GRADIENT_STOPS;
    updatePreview();
  }

  addBtn.addEventListener("click", () => {
    if (stops.length >= MAX_GRADIENT_STOPS) return;
    const last = stops[stops.length - 1]!;
    const prev = stops[stops.length - 2] ?? last;
    stops.push([(last[0] + prev[0]) * 0.5, (last[1] + prev[1]) * 0.5, (last[2] + prev[2]) * 0.5]);
    renderRows();
    onChange();
  });

  removeBtn.addEventListener("click", () => {
    if (stops.length <= MIN_GRADIENT_STOPS) return;
    stops.pop();
    renderRows();
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
    renderRows();
  }

  renderRows();

  return {
    mirrorCheckbox,
    getStops: () => stops.map((s) => [...s] as Rgb),
    getMirror: () => mirrorCheckbox.checked,
    setStops,
  };
}
