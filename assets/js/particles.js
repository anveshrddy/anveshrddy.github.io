/**
 * particles.js
 * Three.js particle field for "The Machine Room" hero.
 * Brain → Circuit → Eye → Dispersed as user scrolls.
 *
 * Performance notes:
 * - Line buffer capped at MAX_LINES * 6 floats (not count² * 6)
 * - setDrawRange avoids zeroing unused buffer entries each frame
 * - DynamicDrawUsage hints GPU for frequently updated attributes
 * - antialias disabled on mobile (no visible benefit, meaningful cost)
 * - Mouse repulsion skipped on touch devices
 * - Frame counter replaces float clock comparison for throttling
 */

import { brainShape, circuitShape, eyeShape, dispersedShape } from './particleShapes.js';

const PARTICLE_COUNT_DESKTOP = 1200;
const PARTICLE_COUNT_MOBILE  = 400;
const MAX_LINES       = 300;   // max connection lines to draw
const LINE_DIST       = 2.0;   // connection threshold (world units)
const REPULSION_RADIUS = 2.2;
const REPULSION_FORCE  = 1.8;
const DAMPING          = 0.05;
const LINE_CHECK_CAP   = 100;  // only check first N particles for connections

let renderer, scene, camera, particles, linesMesh, lineAttr;
let animId, frameCount = 0;
let mouseX = 0, mouseY = 0;
let targetPositions = [];
let currentPositions, velocities;
let scrollProgress = 0;
let isTouchDevice = false;

export function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const isMobile = window.innerWidth < 768;
  const count    = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  // ── Three.js setup ──
  scene    = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias:       !isMobile,   // antialias only on desktop
    alpha:           true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 12;

  // ── Shape targets ──
  targetPositions[0] = brainShape(count);
  targetPositions[1] = circuitShape(count);
  targetPositions[2] = eyeShape(count);
  targetPositions[3] = dispersedShape(count);

  currentPositions = new Float32Array(targetPositions[0]);
  velocities       = new Float32Array(count * 3);

  // ── Particles ──
  const ptGeo  = new THREE.BufferGeometry();
  const ptAttr = new THREE.BufferAttribute(currentPositions, 3);
  ptAttr.setUsage(THREE.DynamicDrawUsage);
  ptGeo.setAttribute('position', ptAttr);

  particles = new THREE.Points(ptGeo, new THREE.PointsMaterial({
    color:    0x00E5FF,
    size:     0.06,
    transparent: true,
    opacity:  0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(particles);

  // ── Connection lines — fixed-size buffer, no runtime allocation ──
  const lineGeo  = new THREE.BufferGeometry();
  const lineBuf  = new Float32Array(MAX_LINES * 6); // 300 lines × 2 verts × 3 floats = 1800 floats
  lineAttr = new THREE.BufferAttribute(lineBuf, 3);
  lineAttr.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', lineAttr);
  lineGeo.setDrawRange(0, 0); // start with nothing drawn

  linesMesh = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color:    0x00E5FF,
    transparent: true,
    opacity:  0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(linesMesh);

  // ── Events ──
  if (!isTouchDevice) {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  // ── Scroll progress via GSAP or fallback ──
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { scrollProgress = self.progress; },
    });
  } else {
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
  }

  animate();
}

// ── Helpers ──

function onMouseMove(e) {
  mouseX = (e.clientX  / window.innerWidth)  * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onVisibility() {
  if (document.hidden) cancelAnimationFrame(animId);
  else animate();
}

function getScrollTargets(progress) {
  if (progress < 0.25) return { from: 0, to: 1, t: progress / 0.25 };
  if (progress < 0.50) return { from: 1, to: 2, t: (progress - 0.25) / 0.25 };
  if (progress < 0.75) return { from: 2, to: 3, t: (progress - 0.50) / 0.25 };
  return { from: 3, to: 3, t: 0 };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateLines(pos) {
  const buf  = lineAttr.array;
  let lineIdx = 0;
  const cap  = Math.min(pos.length / 3, LINE_CHECK_CAP);

  for (let i = 0; i < cap && lineIdx < MAX_LINES * 6; i++) {
    for (let j = i + 1; j < cap && lineIdx < MAX_LINES * 6; j++) {
      const dx = pos[i*3]   - pos[j*3];
      const dy = pos[i*3+1] - pos[j*3+1];
      const dz = pos[i*3+2] - pos[j*3+2];
      if (dx*dx + dy*dy + dz*dz < LINE_DIST * LINE_DIST) {
        buf[lineIdx++] = pos[i*3];   buf[lineIdx++] = pos[i*3+1]; buf[lineIdx++] = pos[i*3+2];
        buf[lineIdx++] = pos[j*3];   buf[lineIdx++] = pos[j*3+1]; buf[lineIdx++] = pos[j*3+2];
      }
    }
  }

  // setDrawRange replaces the need to zero-fill remaining slots
  linesMesh.geometry.setDrawRange(0, lineIdx / 3);
  lineAttr.needsUpdate = true;
}

// ── Main loop ──

function animate() {
  animId = requestAnimationFrame(animate);
  frameCount++;

  const count = currentPositions.length / 3;
  const { from, to, t } = getScrollTargets(scrollProgress);
  const et = easeInOutCubic(Math.min(t, 1));
  const repelX = mouseX * 8;
  const repelY = mouseY * 5;
  const rr     = REPULSION_RADIUS * REPULSION_RADIUS;

  for (let i = 0; i < count; i++) {
    const ix = i*3, iy = i*3+1, iz = i*3+2;

    // Lerp target between shapes
    const tx = targetPositions[from][ix] + (targetPositions[to][ix] - targetPositions[from][ix]) * et;
    const ty = targetPositions[from][iy] + (targetPositions[to][iy] - targetPositions[from][iy]) * et;
    const tz = targetPositions[from][iz] + (targetPositions[to][iz] - targetPositions[from][iz]) * et;

    // Mouse repulsion — desktop only
    if (!isTouchDevice) {
      const dx = currentPositions[ix] - repelX;
      const dy = currentPositions[iy] - repelY;
      const dSq = dx*dx + dy*dy;
      if (dSq < rr && dSq > 0.001) {
        const d     = Math.sqrt(dSq);
        const force = (REPULSION_RADIUS - d) / REPULSION_RADIUS * REPULSION_FORCE;
        velocities[ix] += (dx / d) * force;
        velocities[iy] += (dy / d) * force;
      }
    }

    // Spring toward target
    velocities[ix] += (tx - currentPositions[ix]) * 0.04;
    velocities[iy] += (ty - currentPositions[iy]) * 0.04;
    velocities[iz] += (tz - currentPositions[iz]) * 0.04;

    // Damping
    velocities[ix] *= 1 - DAMPING;
    velocities[iy] *= 1 - DAMPING;
    velocities[iz] *= 1 - DAMPING;

    currentPositions[ix] += velocities[ix];
    currentPositions[iy] += velocities[iy];
    currentPositions[iz] += velocities[iz];
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.rotation.y += 0.0008;
  particles.rotation.x  = Math.sin(frameCount * 0.009) * 0.08;

  // Update lines every 4th frame (reliable frame counter, not float clock)
  if (frameCount % 4 === 0) {
    updateLines(currentPositions);
  }

  renderer.render(scene, camera);
}
