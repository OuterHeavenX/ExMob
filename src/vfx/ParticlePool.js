import * as THREE from 'three';

/**
 * One THREE.Points per particle family, CPU-simulated with typed arrays. Soft round sprites
 * via a small shader; size attenuates with distance. Allocation-free after construction.
 */
const VERT = `
attribute float aSize; attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor; uniform float uSoft;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = smoothstep(1.0, 1.0 - uSoft, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export class ParticlePool {
  constructor(scene, { capacity = 1000, color = 0xffffff, additive = false, soft = 0.6 } = {}) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.alive = 0;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uSoft: { value: soft } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, life, size, gravity = -9, drag = 1.5) {
    let i;
    if (this.alive < this.capacity) i = this.alive++;
    else i = Math.floor(Math.random() * this.capacity); // overwrite random
    const o = i * 3;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
    this.vel[o] = vx; this.vel[o + 1] = vy; this.vel[o + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.size[i] = size; this.alpha[i] = 1;
    this.gravity[i] = gravity; this.drag[i] = drag;
  }

  update(dt) {
    let n = this.alive;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap with last
        n--;
        if (i !== n) {
          const a = i * 3, b = n * 3;
          for (let k = 0; k < 3; k++) { this.pos[a + k] = this.pos[b + k]; this.vel[a + k] = this.vel[b + k]; }
          this.life[i] = this.life[n]; this.maxLife[i] = this.maxLife[n]; this.size[i] = this.size[n];
          this.gravity[i] = this.gravity[n]; this.drag[i] = this.drag[n];
        }
        i--;
        continue;
      }
      const o = i * 3;
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[o] *= dr; this.vel[o + 2] *= dr;
      this.vel[o + 1] += this.gravity[i] * dt;
      this.pos[o] += this.vel[o] * dt;
      this.pos[o + 1] += this.vel[o + 1] * dt;
      this.pos[o + 2] += this.vel[o + 2] * dt;
      if (this.pos[o + 1] < 0.02) { this.pos[o + 1] = 0.02; this.vel[o + 1] *= -0.25; this.vel[o] *= 0.6; this.vel[o + 2] *= 0.6; }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = t < 0.4 ? t / 0.4 : 1;
    }
    this.alive = n;
    this.geo.setDrawRange(0, n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() { this.alive = 0; this.geo.setDrawRange(0, 0); }
}
