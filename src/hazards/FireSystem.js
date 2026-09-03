import * as THREE from 'three';
import { HAZARDS } from '../data/hazards/hazardRegistry.js';
import { EV } from '../core/Events.js';

/**
 * A flat additive disc with a hard edge reads as a bug, not as fire, so the pool is drawn with a
 * radial falloff and a couple of cheap rotating lobes that keep the edge moving. One material
 * instance per pooled fire (each needs its own time and opacity), which is at most `maxActive`.
 */
const FIRE_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FIRE_FRAG = `
uniform float uTime; uniform float uOpacity;
uniform vec3 uHot; uniform vec3 uCool;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  // wobbling edge: two lobes turning at different rates
  float edge = 0.72 + 0.16 * sin(a * 3.0 + uTime * 2.3) + 0.08 * sin(a * 5.0 - uTime * 3.7);
  float body = 1.0 - smoothstep(edge * 0.45, edge, r);
  float core = 1.0 - smoothstep(0.0, edge * 0.55, r);
  float alpha = body * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(mix(uCool, uHot, core), alpha);
}`;

/**
 * Pools of burning ground left by molotovs (docs/ENEMY_DESIGN.md, Arsonist).
 *
 * Fire is area denial, not a simulation. A pool burns for a fixed life, damages anyone standing in
 * it on a tick rather than per frame, and pushes AI back out. It does not spread, does not set the
 * cabin alight and does not touch the navigation grid: enemies are steered out of it by a
 * repulsion force, which costs nothing and avoids a re-bake per bottle (docs/DECISIONS.md ADR-013).
 */
export class FireSystem {
  constructor(world) {
    this.world = world;
    this.def = HAZARDS.fire;
    this.active = [];
    this.group = new THREE.Group();
    this.group.name = 'fires';
    world.scene.add(this.group);
    this._pool = [];
    this.bottles = [];
    this._bottlePool = [];
  }

  get count() { return this.active.length; }

  /** Light a pool at (x,z). Returns the fire record. */
  light(x, z, opts = {}) {
    const d = this.def;
    if (this.active.length >= d.maxActive) this._retire(this.active[0]);
    const fire = this._take();
    fire.x = x; fire.z = z;
    fire.t = 0;
    fire.life = opts.life || d.life;
    fire.radius = opts.radius || d.radius;
    fire.tickT = 0;
    fire.mesh.position.set(x, this.world.property.groundHeight(x, z) + 0.03, z);
    fire.mesh.scale.setScalar(0.1);
    fire.mesh.material.uniforms.uOpacity.value = 0.55;
    fire.mesh.visible = true;
    if (fire.light) {
      fire.light.position.set(x, fire.mesh.position.y + 0.9, z);
      fire.light.intensity = this.def.light.intensity;
      fire.light.visible = true;
    }
    this.active.push(fire);
    this.world.ctx.audio.play('molotov_break', { x, z });
    this.world.vfx.emit('flame', x, fire.mesh.position.y + 0.2, z, 0, 1, 0, 2.0);
    this.world.events.emit(EV.FIRE_STARTED, { x, z, radius: fire.radius });
    return fire;
  }

  /**
   * Arc a bottle from `thrower` to (target.x, target.z) over `flightTime` seconds, then light a
   * pool where it lands. The bottle is a real object in the air so the throw can be read and
   * dodged, and it is intercepted by nothing: the fire is the threat, not the glass.
   */
  throwBottle(thrower, target, flightTime = 0.9) {
    const from = { x: thrower.x, y: thrower.y + 1.3, z: thrower.z };
    const mesh = this._takeBottle();
    mesh.position.set(from.x, from.y, from.z);
    mesh.visible = true;
    this.bottles.push({ mesh, from, to: { x: target.x, z: target.z }, t: 0, life: flightTime });
  }

  _takeBottle() {
    const m = this._bottlePool.pop();
    if (m) return m;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d5a3a, emissive: 0xff6a20, emissiveIntensity: 1.4, roughness: 0.3 }),
    );
    mesh.visible = false;
    this.group.add(mesh);
    return mesh;
  }

  _updateBottles(dt) {
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.life);
      const groundY = this.world.property.groundHeight(b.to.x, b.to.z);
      b.mesh.position.set(
        b.from.x + (b.to.x - b.from.x) * k,
        b.from.y + (groundY - b.from.y) * k + Math.sin(k * Math.PI) * 2.6,
        b.from.z + (b.to.z - b.from.z) * k,
      );
      b.mesh.rotation.z += dt * 12;
      this.world.vfx.emit('flame', b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0, 0.4, 0, 0.25);
      if (k >= 1) {
        b.mesh.visible = false;
        this._bottlePool.push(b.mesh);
        this.bottles.splice(i, 1);
        this.light(b.to.x, b.to.z);
      }
    }
  }

  /** Push vector for an AI standing in or near a pool. Returns {x,z} (zero when clear). */
  repulsion(x, z) {
    let rx = 0, rz = 0;
    for (const f of this.active) {
      const dx = x - f.x, dz = z - f.z;
      const d = Math.hypot(dx, dz);
      const reach = f.radius + this.def.edge;
      if (d > reach) continue;
      const strength = (1 - d / reach) * this.def.repulsion;
      if (d < 1e-3) { rx += strength; continue; }
      rx += (dx / d) * strength;
      rz += (dz / d) * strength;
    }
    return { x: rx, z: rz };
  }

  /** True when (x,z) is inside a burning pool. */
  burning(x, z) {
    for (const f of this.active) if (Math.hypot(x - f.x, z - f.z) <= f.radius) return true;
    return false;
  }

  update(dt) {
    const d = this.def;
    this._updateBottles(dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i];
      f.t += dt;
      if (f.t >= f.life) { this._retire(f); continue; }
      const grow = Math.min(1, f.t / d.fadeIn);
      const fade = Math.min(1, (f.life - f.t) / 1.2);
      // the plane is 2 units across, so half the radius scales it to the damage radius
      f.mesh.scale.setScalar(f.radius * 0.5 * grow * (0.92 + 0.08 * Math.sin(f.t * 9)));
      f.mesh.material.uniforms.uTime.value = f.t;
      f.mesh.material.uniforms.uOpacity.value = 0.55 * fade;
      if (f.light) f.light.intensity = d.light.intensity * fade * (0.75 + 0.25 * Math.sin(f.t * 13));
      const px = f.x + (Math.random() - 0.5) * f.radius * 1.4, pz = f.z + (Math.random() - 0.5) * f.radius * 1.4;
      if (Math.random() < dt * 24) this.world.vfx.emit('flame', px, f.mesh.position.y + 0.1, pz, 0, 1, 0, 0.6);
      if (Math.random() < dt * 5) this.world.vfx.emit('smoke', px, f.mesh.position.y + 0.5, pz, 0, 1, 0, 0.5);
      // damage ticks
      f.tickT -= dt;
      if (f.tickT <= 0) {
        f.tickT = d.tickInterval;
        const p = this.world.player;
        if (!p.health.dead && Math.hypot(p.x - f.x, p.z - f.z) <= f.radius) {
          p.health.damage(d.playerDamagePerSec * d.tickInterval, { x: p.x - f.x, z: p.z - f.z, fire: true });
        }
        for (const e of this.world.enemies.alive()) {
          if (Math.hypot(e.x - f.x, e.z - f.z) > f.radius) continue;
          e.takeDamage(d.enemyDamagePerSec * d.tickInterval, e.x - f.x, e.z - f.z, 0.4, null, { isFire: true });
        }
      }
    }
  }

  _take() {
    const f = this._pool.pop();
    if (f) return f;
    const geo = new THREE.PlaneGeometry(2, 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0.55 },
        uHot: { value: new THREE.Color(0xffd08a) }, uCool: { value: new THREE.Color(0xd8451a) },
      },
      vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    mesh.visible = false;
    this.group.add(mesh);
    // one light per pooled fire, and only where the quality preset already pays for point lights
    let light = null;
    if (this.world.ctx.quality.preset.muzzleLights > 0) {
      light = new THREE.PointLight(this.def.light.color, 0, this.def.light.distance, 2);
      light.visible = false;
      this.group.add(light);
    }
    return { mesh, light, x: 0, z: 0, t: 0, life: 0, radius: 1, tickT: 0 };
  }

  _retire(f) {
    const i = this.active.indexOf(f);
    if (i >= 0) this.active.splice(i, 1);
    f.mesh.visible = false;
    if (f.light) { f.light.visible = false; f.light.intensity = 0; }
    this._pool.push(f);
    this.world.events.emit(EV.FIRE_OUT, { x: f.x, z: f.z });
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) this._retire(this.active[i]);
    for (const b of this.bottles) { b.mesh.visible = false; this._bottlePool.push(b.mesh); }
    this.bottles.length = 0;
  }
}
