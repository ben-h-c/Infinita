import * as THREE from 'three';

// ═══════════════════════════════════════════════
//  UFO EASTER EGG (extracted from SceneManager)
// ═══════════════════════════════════════════════

let _scene  = null;
let _camera = null;
let _getState = null; // () => { currentScale, exploreMode, started }

let _ufoGroup   = null;
let _ufoLights  = [];
let _ufoActive  = false;
let _ufoVel     = new THREE.Vector3();
let _ufoLife    = 0;
let _ufoMax     = 6;
let _ufoAlertT  = 0;
let _ufoPassive = 70 + Math.random() * 80; // seconds until passive spawn

function _buildUFO() {
  const g = new THREE.Group();
  // Classic disc hull — wide, very flat
  const hullGeo = new THREE.SphereGeometry(1, 24, 10);
  const hullMat = new THREE.MeshPhongMaterial({ color:0xaaaaaa, shininess:90, specular:0x888888, emissive:0x111111 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1, 0.18, 1);
  g.add(hull);
  // Lower disc rim — slightly wider, tapered like a lens edge
  const rimGeo = new THREE.CylinderGeometry(1.1, 0.9, 0.12, 24);
  const rimMat = new THREE.MeshPhongMaterial({ color:0x999999, shininess:120 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = -0.06;
  g.add(rim);
  // Small bubble dome on top
  const domeGeo = new THREE.SphereGeometry(0.32, 12, 7, 0, Math.PI*2, 0, Math.PI*0.55);
  const domeMat = new THREE.MeshPhongMaterial({ color:0x223311, transparent:true, opacity:0.8, shininess:200, specular:0x44aa44, emissive:0x081208 });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0.14;
  g.add(dome);
  // Soft green underglow — very subtle, like propulsion glow
  const gc = document.createElement('canvas'); gc.width=64; gc.height=64;
  const gctx=gc.getContext('2d'),gg=gctx.createRadialGradient(32,32,0,32,32,32);
  gg.addColorStop(0,'rgba(80,255,100,0.35)'); gg.addColorStop(0.5,'rgba(80,255,100,0.08)'); gg.addColorStop(1,'rgba(0,0,0,0)');
  gctx.fillStyle=gg; gctx.fillRect(0,0,64,64);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gc),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));
  glow.scale.setScalar(2.8); glow.position.y=-0.15; g.add(glow);
  _ufoLights = [];
  g.visible = false;
  _scene.add(g);
  return g;
}

const _UFO_MSGS = [
  'UNIDENTIFIED CRAFT DETECTED',
  'UNKNOWN VESSEL INTERCEPTED',
  'ANOMALOUS OBJECT IN VICINITY',
  'UNREGISTERED SHIP ON SENSORS',
  'CONTACT SIGNAL — ORIGIN UNKNOWN',
];

/**
 * Store scene/camera refs and a state accessor. No immediate action.
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {Function} getState  — () => { currentScale, exploreMode, started }
 */
export function initUFO(scene, camera, getState) {
  _scene    = scene;
  _camera   = camera;
  _getState = getState;
}

export function spawnUFO() {
  if (!_ufoGroup) _ufoGroup = _buildUFO();
  if (_ufoActive) return;

  const { currentScale } = _getState();

  // Scale relative to scale level so it's always visually prominent
  const sc = currentScale <= 1 ? 0.28 : currentScale === 2 ? 3200 : _camera.far * 0.0008;
  _ufoGroup.scale.setScalar(sc);

  const fwd   = new THREE.Vector3(0,0,-1).applyQuaternion(_camera.quaternion);
  const right = new THREE.Vector3(1,0,0).applyQuaternion(_camera.quaternion);
  const up    = new THREE.Vector3(0,1,0);

  const side  = (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 5) * sc;
  const depth = (14 + Math.random() * 6) * sc;
  const vert  = (Math.random() - 0.5) * 4 * sc;

  const sp = _camera.position.clone()
    .addScaledVector(fwd, depth)
    .addScaledVector(right, side)
    .add(up.clone().multiplyScalar(vert));

  _ufoGroup.position.copy(sp);

  // Fly across + slightly forward — always visibly crosses the view
  const crossDir = right.clone().multiplyScalar(-Math.sign(side))
    .addScaledVector(fwd, 0.35 + Math.random()*0.25)
    .addScaledVector(up, (Math.random()-0.5)*0.15)
    .normalize();

  _ufoVel.copy(crossDir).multiplyScalar(sc * 5.8);
  _ufoGroup.rotation.y = Math.atan2(_ufoVel.x, _ufoVel.z);
  _ufoGroup.visible = true;
  _ufoActive = true;
  _ufoLife   = 0;
  _ufoMax    = 5 + Math.random() * 2.5;

  // Alert notification
  _ufoAlertT = 4.5;
  const alertEl = document.getElementById('ufo-alert');
  alertEl.querySelector('.ufo-msg').textContent = _UFO_MSGS[Math.floor(Math.random()*_UFO_MSGS.length)];
  alertEl.classList.add('show');
}

export function updateUFO(dt) {
  const { exploreMode, started } = _getState();

  // Passive spawn when not in explore mode
  if (!exploreMode && started) {
    _ufoPassive -= dt;
    if (_ufoPassive <= 0) { _ufoPassive = 70 + Math.random()*90; spawnUFO(); }
  }

  if (_ufoActive && _ufoGroup) {
    _ufoLife += dt;
    if (_ufoLife >= _ufoMax) {
      _ufoGroup.visible = false;
      _ufoActive = false;
    } else {
      _ufoGroup.position.addScaledVector(_ufoVel, dt);
      // Slow steady rotation — classic saucer spin
      _ufoGroup.rotation.y += dt * 0.9;
      // Very gentle hover bob
      _ufoGroup.position.y += Math.sin(_ufoLife * 3.8) * _ufoGroup.scale.x * 0.004;
    }
  }

  if (_ufoAlertT > 0) {
    _ufoAlertT -= dt;
    if (_ufoAlertT <= 0) document.getElementById('ufo-alert').classList.remove('show');
  }
}
