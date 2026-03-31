/**
 * particles.js
 * Three.js particle field for "The Machine Room" hero.
 * Brain → Circuit → Eye → Dispersed as user scrolls.
 */

import { brainShape, circuitShape, eyeShape, dispersedShape, PARTICLE_COUNT, MOBILE_COUNT } from './particleShapes.js';

let renderer, scene, camera, particles, linesMesh;
let animId, clock;
let mouseX = 0, mouseY = 0;
let targetPositions = []; // array of Float32Arrays per shape
let currentPositions;     // live working copy
let velocities;           // per-particle velocity for repulsion spring
let scrollProgress = 0;

const SHAPES = 4; // brain=0, circuit=1, eye=2, dispersed=3
const SHAPE_NAMES = ['brain', 'circuit', 'eye', 'dispersed'];
const REPULSION_RADIUS = 2.2;
const REPULSION_FORCE  = 1.8;
const DAMPING          = 0.05;
const LINE_DIST        = 2.5;

export function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const count = window.innerWidth < 768 ? MOBILE_COUNT : PARTICLE_COUNT;

  // ── Three.js setup ──
  scene    = new THREE.Scene();
  clock    = new THREE.Clock();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 12;

  // ── Compute shapes ──
  targetPositions[0] = brainShape(count);
  targetPositions[1] = circuitShape(count);
  targetPositions[2] = eyeShape(count);
  targetPositions[3] = dispersedShape(count);

  // Working copy starts at brain shape
  currentPositions = new Float32Array(targetPositions[0]);
  velocities       = new Float32Array(count * 3);

  // ── Particle geometry ──
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x00E5FF,
    size: 0.06,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // ── Connection lines ──
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(count * count * 6); // upper bound, will be trimmed
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(linesMesh);

  // ── Mouse tracking ──
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  // ── Scroll morphing via GSAP ScrollTrigger ──
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { scrollProgress = self.progress; },
    });
  } else {
    // Fallback: manual scroll listener
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
  }

  // ── Resize ──
  window.addEventListener('resize', onResize);

  // ── Visibility pause ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animId); }
    else { animate(); }
  });

  animate();
}

function onMouseMove(e) {
  // Normalized device coords -1 to 1
  mouseX = (e.clientX / window.innerWidth)  * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getTargetForScroll(progress) {
  // 0–0.25 → brain, 0.25–0.5 → circuit, 0.5–0.75 → eye, 0.75–1.0 → dispersed
  if (progress < 0.25) return { from: 0, to: 1, t: progress / 0.25 };
  if (progress < 0.50) return { from: 1, to: 2, t: (progress - 0.25) / 0.25 };
  if (progress < 0.75) return { from: 2, to: 3, t: (progress - 0.50) / 0.25 };
  return { from: 3, to: 3, t: 0 };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateLines(pos, count) {
  const linePos = linesMesh.geometry.attributes.position.array;
  let lineIdx = 0;
  const maxLines = Math.min(count, 120); // cap for perf

  for (let i = 0; i < maxLines; i++) {
    for (let j = i + 1; j < maxLines; j++) {
      const dx = pos[i*3]   - pos[j*3];
      const dy = pos[i*3+1] - pos[j*3+1];
      const dz = pos[i*3+2] - pos[j*3+2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < LINE_DIST && lineIdx + 6 < linePos.length) {
        linePos[lineIdx++] = pos[i*3];
        linePos[lineIdx++] = pos[i*3+1];
        linePos[lineIdx++] = pos[i*3+2];
        linePos[lineIdx++] = pos[j*3];
        linePos[lineIdx++] = pos[j*3+1];
        linePos[lineIdx++] = pos[j*3+2];
      }
    }
  }
  // Zero out remaining
  for (let k = lineIdx; k < linePos.length; k++) linePos[k] = 0;
  linesMesh.geometry.attributes.position.needsUpdate = true;
}

function animate() {
  animId = requestAnimationFrame(animate);
  const count = currentPositions.length / 3;

  // ── Determine target shape from scroll ──
  const { from, to, t } = getTargetForScroll(scrollProgress);
  const et = easeInOutCubic(Math.min(t, 1));

  // ── Mouse repulsion in view-space ──
  const repelX = mouseX * 8;
  const repelY = mouseY * 5;

  // ── Update positions ──
  for (let i = 0; i < count; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

    // Target: lerp between two shape positions
    const tx = targetPositions[from][ix]   + (targetPositions[to][ix]   - targetPositions[from][ix])   * et;
    const ty = targetPositions[from][iy]   + (targetPositions[to][iy]   - targetPositions[from][iy])   * et;
    const tz = targetPositions[from][iz]   + (targetPositions[to][iz]   - targetPositions[from][iz])   * et;

    // Repulsion from mouse
    const dx = currentPositions[ix] - repelX;
    const dy = currentPositions[iy] - repelY;
    const distSq = dx * dx + dy * dy;
    if (distSq < REPULSION_RADIUS * REPULSION_RADIUS && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS * REPULSION_FORCE;
      velocities[ix] += (dx / dist) * force;
      velocities[iy] += (dy / dist) * force;
    }

    // Spring back to target + apply velocity
    velocities[ix] += (tx - currentPositions[ix]) * 0.04;
    velocities[iy] += (ty - currentPositions[iy]) * 0.04;
    velocities[iz] += (tz - currentPositions[iz]) * 0.04;

    // Damping
    velocities[ix] *= (1 - DAMPING);
    velocities[iy] *= (1 - DAMPING);
    velocities[iz] *= (1 - DAMPING);

    currentPositions[ix] += velocities[ix];
    currentPositions[iy] += velocities[iy];
    currentPositions[iz] += velocities[iz];
  }

  particles.geometry.attributes.position.needsUpdate = true;

  // Slow rotation
  particles.rotation.y += 0.0008;
  particles.rotation.x  = Math.sin(clock.getElapsedTime() * 0.15) * 0.08;

  // Update connection lines (throttled: every 3 frames)
  if (Math.round(clock.getElapsedTime() * 60) % 3 === 0) {
    updateLines(currentPositions, count);
  }

  renderer.render(scene, camera);
}
