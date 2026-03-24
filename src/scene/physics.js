import * as THREE from 'three';

export function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

export function getOrbitalPosition(planet, timeYears) {
  const n = 2 * Math.PI / planet.T;
  const M = n * timeYears;
  const E = solveKepler(M % (2 * Math.PI), planet.e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const x = planet.a * (cosE - planet.e);
  const y = planet.a * Math.sqrt(1 - planet.e * planet.e) * sinE;
  const inc = planet.inc * Math.PI / 180;
  return new THREE.Vector3(x, y * Math.sin(inc), y * Math.cos(inc));
}

export function tempToColor(temp) {
  // Attempt at blackbody approximation
  let r, g, b;
  const t = temp / 100;
  if (t <= 66) { r = 255; } else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); }
  if (t <= 66) { g = 99.4708025861 * Math.log(t) - 161.1195681661; } else { g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) { b = 255; } else if (t <= 19) { b = 0; } else { b = 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  return new THREE.Color(
    Math.min(1, Math.max(0, r / 255)),
    Math.min(1, Math.max(0, g / 255)),
    Math.min(1, Math.max(0, b / 255))
  );
}

export function spTypeToTemp(sp) {
  const t = ((sp || '').trim()[0] || 'G').toUpperCase();
  return {O:35000,B:20000,A:8500,F:6700,G:5500,K:4000,M:3000}[t] || 5778;
}
