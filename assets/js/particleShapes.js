/**
 * particleShapes.js
 * Pre-computed particle position arrays for Three.js morphing.
 * Each shape returns a Float32Array of [x, y, z, x, y, z, ...] for N particles.
 */

const PARTICLE_COUNT = 1200;
const MOBILE_COUNT   = 400;

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return ((s >>> 0) / 0xFFFFFFFF);
  };
}

/**
 * Brain / neural network — organic sphere with noise displacement
 */
function brainShape(count) {
  const pos = new Float32Array(count * 3);
  const rng = seededRandom(42);
  for (let i = 0; i < count; i++) {
    const theta = Math.acos(2 * rng() - 1);
    const phi   = 2 * Math.PI * rng();
    const r     = 4.5 + (rng() - 0.5) * 2.5 + Math.sin(theta * 4 + phi * 3) * 0.8;
    pos[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
    pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi) * 0.75; // slightly squished = brain-ish
    pos[i * 3 + 2] = r * Math.cos(theta);
  }
  return pos;
}

/**
 * Circuit board / PCB — grid pattern with right-angle jitter
 */
function circuitShape(count) {
  const pos = new Float32Array(count * 3);
  const rng = seededRandom(137);
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const rows = Math.ceil(count / cols);
  const spacingX = 10 / cols;
  const spacingY = 10 / rows;
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Snap to grid with slight quantized jitter (PCB feel)
    const jitterX = Math.round((rng() - 0.5) * 3) * spacingX * 0.5;
    const jitterY = Math.round((rng() - 0.5) * 3) * spacingY * 0.5;
    pos[i * 3]     = (col - cols / 2) * spacingX + jitterX;
    pos[i * 3 + 1] = (row - rows / 2) * spacingY + jitterY;
    pos[i * 3 + 2] = (rng() - 0.5) * 0.8; // very shallow Z = flat PCB
  }
  return pos;
}

/**
 * Camera lens / eye — concentric rings forming iris
 */
function eyeShape(count) {
  const pos = new Float32Array(count * 3);
  const rng = seededRandom(256);
  const rings = 8;
  const perRing = Math.floor(count * 0.85 / rings);
  let idx = 0;

  for (let r = 0; r < rings; r++) {
    const radius = 0.5 + (r / rings) * 5;
    const n = (r === rings - 1) ? count - idx - Math.floor(count * 0.15) : perRing;
    for (let j = 0; j < n && idx < count; j++, idx++) {
      const angle = (j / n) * 2 * Math.PI + rng() * 0.1;
      const noise = (rng() - 0.5) * 0.3;
      pos[idx * 3]     = (radius + noise) * Math.cos(angle);
      pos[idx * 3 + 1] = (radius + noise) * Math.sin(angle) * 0.6; // slight ellipse
      pos[idx * 3 + 2] = (rng() - 0.5) * 1.2;
    }
  }
  // Fill remaining with scattered outer particles
  while (idx < count) {
    const angle  = rng() * 2 * Math.PI;
    const radius = 5.5 + rng() * 1.5;
    pos[idx * 3]     = radius * Math.cos(angle);
    pos[idx * 3 + 1] = radius * Math.sin(angle) * 0.6;
    pos[idx * 3 + 2] = (rng() - 0.5) * 2;
    idx++;
  }
  return pos;
}

/**
 * Dispersed — calm floating particles in wide random scatter
 */
function dispersedShape(count) {
  const pos = new Float32Array(count * 3);
  const rng = seededRandom(999);
  const spread = 18;
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (rng() - 0.5) * spread;
    pos[i * 3 + 1] = (rng() - 0.5) * spread * 0.7;
    pos[i * 3 + 2] = (rng() - 0.5) * spread * 0.5;
  }
  return pos;
}

export { brainShape, circuitShape, eyeShape, dispersedShape, PARTICLE_COUNT, MOBILE_COUNT };
