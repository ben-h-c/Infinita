import * as THREE from 'three';

// ── Warp streak geometry (module-private state) ──────────────────────
const WARP_N = 340;
const _wZ = new Float32Array(WARP_N); // normalised depth
const _wR = new Float32Array(WARP_N); // normalised radius
const _wA = new Float32Array(WARP_N); // angle around axis
const _wS = new Float32Array(WARP_N); // per-streak speed multiplier (avoids uniform march)
const _wB = new Float32Array(WARP_N); // per-streak brightness
for (let i = 0; i < WARP_N; i++) {
  _wZ[i] = -(0.05 + Math.random() * 0.85);
  _wR[i] =   0.003 + Math.random() * 0.08;   // tighter radius band
  _wA[i] =   Math.random() * Math.PI * 2;
  _wS[i] =   0.35 + Math.random() * 1.3;     // 0.35× to 1.65× base speed
  _wB[i] =   0.25 + Math.random() * 0.75;    // 0.25 to 1.0 brightness
}
const warpBuf     = new Float32Array(WARP_N * 6);
const warpColBuf  = new Float32Array(WARP_N * 6); // per-vertex RGB
const warpGeo = new THREE.BufferGeometry();
warpGeo.setAttribute('position', new THREE.BufferAttribute(warpBuf,    3));
warpGeo.setAttribute('color',    new THREE.BufferAttribute(warpColBuf, 3));
// vertexColors drives all brightness; material opacity stays 1
const warpMat  = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
const warpMesh = new THREE.LineSegments(warpGeo, warpMat);

const _tD = new THREE.Vector3();
const _tR = new THREE.Vector3();
const _tU = new THREE.Vector3();

let _camera = null;

/**
 * Creates streak geometry, adds to scene, stores refs.
 * Call once after scene setup.
 */
export function initWarp(scene, camera) {
  _camera = camera;
  scene.add(warpMesh);
}

/**
 * Called each frame to animate warp streaks and update overlay opacity.
 * @param {number} dt - delta time in seconds
 * @param {boolean} travelActive - whether travel is currently active
 * @param {number} travelSpeed - current travel speed in AU/s
 * @param {number} cAuS - C_AU_S constant (speed of light in AU/s)
 * @param {THREE.Vector3} travelDirection - normalised direction vector (origin → dest)
 */
export function renderWarp(dt, travelActive, travelSpeed, cAuS, travelDirection) {
  const sf = Math.min(1, travelSpeed / cAuS);
  const intensity = sf * sf;
  document.getElementById('warp-overlay').style.opacity = Math.min(0.75, intensity * 0.7);
  if (intensity < 0.002) { warpMesh.visible = false; return; }
  warpMesh.visible = true;

  _tD.copy(travelDirection);

  _tR.set(_tD.z, 0, -_tD.x).normalize();
  if (_tR.lengthSq() < 0.001) _tR.set(1, 0, 0);
  _tU.crossVectors(_tR, _tD);

  const sc  = _camera.far * 0.65;
  const adv = Math.sqrt(intensity) * 0.016 + intensity * 0.014; // base advance
  const stk = Math.min(0.38, intensity * 0.28) * sc;            // softer streak length

  // Color shifts from pale blue → near-white at high speed
  const cr = 0.45 + intensity * 0.55;
  const cg = 0.62 + intensity * 0.38;
  const cb = 1.0;

  for (let i = 0; i < WARP_N; i++) {
    _wZ[i] += adv * _wS[i]; // each streak moves at its own rate → breaks up uniformity
    if (_wZ[i] > 0.06) {
      _wZ[i] = -(0.04 + Math.random() * 0.88);
      _wR[i] =   0.003 + Math.random() * 0.08;
      _wA[i] =   Math.random() * Math.PI * 2;
      _wS[i] =   0.35 + Math.random() * 1.3;
      _wB[i] =   0.25 + Math.random() * 0.75;
    }

    // Perspective: streaks splay outward as they approach the camera
    const spread = 1.0 + Math.max(0, _wZ[i] + 0.5) * 0.25;
    const z  = -_wZ[i] * sc;
    const r  = _wR[i] * sc * spread;
    const a  = _wA[i];
    const rx = r * Math.cos(a), ry = r * Math.sin(a);

    const hx = _camera.position.x + _tD.x*z + _tR.x*rx + _tU.x*ry;
    const hy = _camera.position.y + _tD.y*z + _tR.y*rx + _tU.y*ry;
    const hz = _camera.position.z + _tD.z*z + _tR.z*rx + _tU.z*ry;
    const tz2= Math.min(0, z - stk);
    const tx = _camera.position.x + _tD.x*tz2 + _tR.x*rx + _tU.x*ry;
    const ty = _camera.position.y + _tD.y*tz2 + _tR.y*rx + _tU.y*ry;
    const tw = _camera.position.z + _tD.z*tz2 + _tR.z*rx + _tU.z*ry;
    warpBuf[i*6]=hx; warpBuf[i*6+1]=hy; warpBuf[i*6+2]=hz;
    warpBuf[i*6+3]=tx; warpBuf[i*6+4]=ty; warpBuf[i*6+5]=tw;

    // Per-streak brightness: peaks as streak approaches camera (wZ → 0)
    const prox  = Math.max(0, 1.0 - Math.abs(_wZ[i] + 0.02) / 0.44);
    const brite = _wB[i] * intensity * (0.18 + prox * 0.52); // max ~0.7 total
    // Head bright, tail fades to ~3% → creates a comet-like trail
    warpColBuf[i*6]   = cr * brite;  warpColBuf[i*6+1] = cg * brite;  warpColBuf[i*6+2] = cb * brite;
    warpColBuf[i*6+3] = cr * brite * 0.03; warpColBuf[i*6+4] = cg * brite * 0.03; warpColBuf[i*6+5] = cb * brite * 0.03;
  }
  warpGeo.attributes.position.needsUpdate = true;
  warpGeo.attributes.color.needsUpdate    = true;
}

/**
 * Immediately hide warp streaks and reset overlay.
 * Call on travel abort/arrival.
 */
export function hideWarp() {
  warpMesh.visible = false;
  document.getElementById('warp-overlay').style.opacity = 0;
}
