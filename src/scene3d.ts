import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const TAU = Math.PI * 2;
const HELIX_Z_SCALE = 0.35;

export type Scene3D = {
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  setTheta: (theta: number) => void;
  setShowHelix: (show: boolean) => void;
  resize: () => void;
  render: () => void;
  dispose: () => void;
};

export function createScene3D(container: HTMLElement): Scene3D {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b10);
  scene.fog = new THREE.Fog(0x0a0b10, 12, 28);

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(4.2, 3.5, 5.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0, 0.8);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6080ff, 0.35);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  const grid = new THREE.GridHelper(6, 24, 0x2a3050, 0x1a1e30);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const axes = new THREE.AxesHelper(2.8);
  axes.setColors(new THREE.Color(0x34d399), new THREE.Color(0xfbbf24), new THREE.Color(0x818cf8));
  scene.add(axes);

  const circlePts: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * TAU;
    circlePts.push(new THREE.Vector3(Math.cos(t), Math.sin(t), 0));
  }
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(circlePts),
      new THREE.LineBasicMaterial({ color: 0x818cf8 }),
    ),
  );

  const helixPts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments * 2; i++) {
    const t = (i / (segments * 2)) * TAU;
    helixPts.push(new THREE.Vector3(Math.cos(t), Math.sin(t), t * HELIX_Z_SCALE));
  }
  const helixLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(helixPts),
    new THREE.LineBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.55,
    }),
  );
  scene.add(helixLine);

  const projRealGeo = new THREE.BufferGeometry();
  const projImagGeo = new THREE.BufferGeometry();
  const dashOpts = { dashSize: 0.08, gapSize: 0.05, transparent: true, opacity: 0.85 };
  const projReal = new THREE.Line(
    projRealGeo,
    new THREE.LineDashedMaterial({ color: 0x34d399, ...dashOpts }),
  );
  const projImag = new THREE.Line(
    projImagGeo,
    new THREE.LineDashedMaterial({ color: 0xfbbf24, ...dashOpts }),
  );
  scene.add(projReal, projImag);

  const phasorGeo = new THREE.BufferGeometry();
  const phasor = new THREE.Line(phasorGeo, new THREE.LineBasicMaterial({ color: 0x60a5fa }));
  scene.add(phasor);

  const pointMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x2060c0,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.35,
    }),
  );
  scene.add(pointMesh);

  const maxTrail = 256;
  const trailPositions = new Float32Array(maxTrail * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
    }),
  );
  scene.add(trail);

  function setTheta(theta: number) {
    const x = Math.cos(theta);
    const y = Math.sin(theta);
    const z = theta * HELIX_Z_SCALE;

    phasorGeo.setFromPoints([new THREE.Vector3(0, 0, z), new THREE.Vector3(x, y, z)]);

    projRealGeo.setFromPoints([new THREE.Vector3(0, 0, z), new THREE.Vector3(x, 0, z)]);
    projReal.computeLineDistances();

    projImagGeo.setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y, z)]);
    projImag.computeLineDistances();

    pointMesh.position.set(x, y, z);

    const trailCount = Math.max(2, Math.floor((theta / TAU) * maxTrail) + 1);
    for (let i = 0; i < trailCount; i++) {
      const t = (i / (trailCount - 1)) * theta;
      trailPositions[i * 3] = Math.cos(t);
      trailPositions[i * 3 + 1] = Math.sin(t);
      trailPositions[i * 3 + 2] = t * HELIX_Z_SCALE;
    }
    trailGeo.setDrawRange(0, trailCount);
    trailGeo.attributes.position!.needsUpdate = true;
  }

  function setShowHelix(show: boolean) {
    helixLine.visible = show;
    trail.visible = show;
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    controls.dispose();
  }

  setTheta(0);

  return { renderer, controls, setTheta, setShowHelix, resize, render, dispose };
}
