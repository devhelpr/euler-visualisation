import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const TAU = Math.PI * 2;
const HELIX_Z_SCALE = 0.35;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export type Scene3D = {
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  setTheta: (theta: number) => void;
  setShowHelix: (show: boolean) => void;
  resize: () => void;
  render: () => void;
  dispose: () => void;
};

function createSegmentTube(radius: number, color: number, opacity: number) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 1, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
    }),
  );
}

function updateSegmentTube(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = delta.length();

  mesh.visible = length > 0.001;
  if (!mesh.visible) return;

  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, delta.normalize());
}

export function createScene3D(container: HTMLElement): Scene3D {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.Fog(0x070a12, 12, 28);

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

  scene.add(new THREE.AmbientLight(0xffffff, 0.58));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(5, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7dd3fc, 0.4);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  const grid = new THREE.GridHelper(6, 24, 0x334155, 0x1e293b);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const axes = new THREE.AxesHelper(2.8);
  axes.setColors(new THREE.Color(0x5eead4), new THREE.Color(0xfde047), new THREE.Color(0xa5b4fc));
  scene.add(axes);

  const circlePts: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * TAU;
    circlePts.push(new THREE.Vector3(Math.cos(t), Math.sin(t), 0));
  }
  const circleTube = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(circlePts, true), 128, 0.01, 8, true),
    new THREE.MeshBasicMaterial({ color: 0xa5b4fc }),
  );
  scene.add(circleTube);

  const helixPts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments * 2; i++) {
    const t = (i / (segments * 2)) * TAU;
    helixPts.push(new THREE.Vector3(Math.cos(t), Math.sin(t), t * HELIX_Z_SCALE));
  }
  const helixLine = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 192, 0.011, 8, false),
    new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.72,
    }),
  );
  scene.add(helixLine);

  const projRealGeo = new THREE.BufferGeometry();
  const projImagGeo = new THREE.BufferGeometry();
  const dashOpts = { dashSize: 0.08, gapSize: 0.05, transparent: true, opacity: 0.95 };
  const projReal = new THREE.Line(
    projRealGeo,
    new THREE.LineDashedMaterial({ color: 0x5eead4, ...dashOpts }),
  );
  const projImag = new THREE.Line(
    projImagGeo,
    new THREE.LineDashedMaterial({ color: 0xfde047, ...dashOpts }),
  );
  scene.add(projReal, projImag);

  const phasorGeo = new THREE.BufferGeometry();
  const phasor = new THREE.Line(phasorGeo, new THREE.LineBasicMaterial({ color: 0x7dd3fc }));
  scene.add(phasor);

  const phasorTube = createSegmentTube(0.018, 0x7dd3fc, 1);
  const projRealTube = createSegmentTube(0.011, 0x5eead4, 0.75);
  const projImagTube = createSegmentTube(0.011, 0xfde047, 0.75);
  scene.add(projRealTube, projImagTube, phasorTube);

  const pointMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 28, 28),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.35,
    }),
  );
  scene.add(pointMesh);

  const pointHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 28),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  scene.add(pointHalo);

  const maxTrail = 256;
  const trailPositions = new Float32Array(maxTrail * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scene.add(trail);

  function setTheta(theta: number) {
    const x = Math.cos(theta);
    const y = Math.sin(theta);
    const z = theta * HELIX_Z_SCALE;

    const origin = new THREE.Vector3(0, 0, z);
    const realPoint = new THREE.Vector3(x, 0, z);
    const point = new THREE.Vector3(x, y, z);

    phasorGeo.setFromPoints([origin, point]);
    updateSegmentTube(phasorTube, origin, point);

    projRealGeo.setFromPoints([origin, realPoint]);
    projReal.computeLineDistances();
    updateSegmentTube(projRealTube, origin, realPoint);

    projImagGeo.setFromPoints([realPoint, point]);
    projImag.computeLineDistances();
    updateSegmentTube(projImagTube, realPoint, point);

    pointMesh.position.copy(point);
    pointHalo.position.copy(point);

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
