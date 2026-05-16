/** View transform for wave preview + pointer / trackpad gestures */

export type WaveViewTransform = {
  translateX: number;
  translateY: number;
  rotate: number;
  zoom: number;
  twist: number;
  kxScale: number;
  kyScale: number;
};

export const DEFAULT_WAVE_VIEW: WaveViewTransform = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  zoom: 1,
  twist: 0,
  kxScale: 1,
  kyScale: 1,
};

export type WaveViewSliders = {
  translateX: HTMLInputElement;
  translateY: HTMLInputElement;
  rotate: HTMLInputElement;
  zoom: HTMLInputElement;
  twist: HTMLInputElement;
  kxScale: HTMLInputElement;
  kyScale: HTMLInputElement;
};

export type WaveViewHandlers = {
  getTransform: () => WaveViewTransform;
  setTransform: (partial: Partial<WaveViewTransform>) => void;
  syncSliders: () => void;
};

const TAU = Math.PI * 2;

export function createWaveViewHandlers(
  sliders: WaveViewSliders,
  onUpdate: () => void,
): WaveViewHandlers {
  const state: WaveViewTransform = { ...DEFAULT_WAVE_VIEW };

  function clampTransform() {
    state.zoom = Math.min(4, Math.max(0.25, state.zoom));
    state.translateX = Math.min(2, Math.max(-2, state.translateX));
    state.translateY = Math.min(2, Math.max(-2, state.translateY));
    state.rotate = ((state.rotate % TAU) + TAU) % TAU;
    state.twist = Math.min(3, Math.max(-3, state.twist));
    state.kxScale = Math.min(2.5, Math.max(0.2, state.kxScale));
    state.kyScale = Math.min(2.5, Math.max(0.2, state.kyScale));
  }

  function syncSliders() {
    sliders.translateX.value = String(state.translateX);
    sliders.translateY.value = String(state.translateY);
    sliders.rotate.value = String(state.rotate);
    sliders.zoom.value = String(state.zoom);
    sliders.twist.value = String(state.twist);
    sliders.kxScale.value = String(state.kxScale);
    sliders.kyScale.value = String(state.kyScale);
  }

  function setTransform(partial: Partial<WaveViewTransform>) {
    Object.assign(state, partial);
    clampTransform();
    syncSliders();
    onUpdate();
  }

  for (const key of Object.keys(sliders) as (keyof WaveViewSliders)[]) {
    sliders[key].addEventListener("input", () => {
      setTransform({ [key]: Number(sliders[key].value) } as Partial<WaveViewTransform>);
    });
  }

  syncSliders();

  return {
    getTransform: () => ({ ...state }),
    setTransform,
    syncSliders,
  };
}

interface GestureEvent extends Event {
  scale: number;
  rotation: number;
}

export function bindWaveGestures(
  canvas: HTMLCanvasElement,
  view: WaveViewHandlers,
  isWaveMode: () => boolean,
): () => void {
  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let gestureStartZoom = 1;
  let gestureStartRotate = 0;

  const read = () => view.getTransform();

  function pan(dx: number, dy: number, scale = 1) {
    const t = read();
    const z = t.zoom;
    view.setTransform({
      translateX: t.translateX + ((dx / canvas.clientWidth) * 3.2 * scale) / z,
      translateY: t.translateY - ((dy / canvas.clientHeight) * 3.2 * scale) / z,
    });
  }

  function addRotate(delta: number) {
    const t = read();
    view.setTransform({ rotate: t.rotate + delta });
  }

  function addTwist(delta: number) {
    const t = read();
    view.setTransform({ twist: t.twist + delta });
  }

  function onPointerDown(e: PointerEvent) {
    if (!isWaveMode()) return;
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("grabbing");
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (e.shiftKey) {
      addRotate((dx - dy) * 0.008);
    } else if (e.altKey) {
      addTwist((dx - dy) * 0.012);
    } else {
      pan(dx, dy);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = -1;
    canvas.classList.remove("grabbing");
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function onWheel(e: WheelEvent) {
    if (!isWaveMode()) return;
    e.preventDefault();

    const t = read();

    // Pinch-zoom (trackpad pinch sends ctrl+wheel on macOS)
    if (e.ctrlKey) {
      const factor = Math.exp(-e.deltaY * 0.01);
      view.setTransform({ zoom: t.zoom * factor });
      return;
    }

    // Cmd + horizontal scroll → rotate (some trackpad rotate gestures)
    if (e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
      addRotate(-e.deltaX * 0.006);
      return;
    }

    // Shift + vertical scroll → twist
    if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      addTwist(-e.deltaY * 0.004);
      return;
    }

    // Two-finger scroll → translate
    if (Math.abs(e.deltaX) > 0.5 || Math.abs(e.deltaY) > 0.5) {
      pan(-e.deltaX, -e.deltaY, 0.85);
    }
  }

  function onGestureStart(e: Event) {
    if (!isWaveMode()) return;
    e.preventDefault();
    const t = read();
    gestureStartZoom = t.zoom;
    gestureStartRotate = t.rotate;
  }

  function onGestureChange(e: Event) {
    if (!isWaveMode()) return;
    e.preventDefault();
    const ge = e as GestureEvent;
    if (ge.scale !== 1) {
      view.setTransform({ zoom: gestureStartZoom * ge.scale });
    }
    if (ge.rotation !== 0) {
      view.setTransform({
        rotate: gestureStartRotate + (ge.rotation * Math.PI) / 180,
      });
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("gesturestart", onGestureStart as EventListener);
  canvas.addEventListener("gesturechange", onGestureChange as EventListener);
  canvas.addEventListener("gestureend", (e) => e.preventDefault());

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("gesturestart", onGestureStart as EventListener);
    canvas.removeEventListener("gesturechange", onGestureChange as EventListener);
  };
}
