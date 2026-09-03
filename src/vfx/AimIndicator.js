import * as THREE from 'three';

/**
 * Where am I pointing? A touch player has no cursor, so the aim direction has to be drawn in the
 * world: a ground line from Ray along the aim, trimmed where it meets a wall, plus a ring on the
 * assisted target. Two draw calls, no per-frame allocation.
 * Shown on touch by default (docs/MOBILE_REQUIREMENTS.md, Aiming).
 */
const LINE_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const LINE_FRAG = `
uniform vec3 uColor; uniform float uOpacity;
varying vec2 vUv;
void main() {
  // fade along the length and soften the edges across the width
  float along = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  float across = 1.0 - smoothstep(0.25, 0.5, abs(vUv.x - 0.5));
  float a = along * across * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export class AimIndicator {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);      // lie flat
    geo.translate(0, 0, 0.5);        // extend along +z from the origin
    this.lineMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xe8a94a) }, uOpacity: { value: 0.5 } },
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.line = new THREE.Mesh(geo, this.lineMat);
    this.line.frustumCulled = false;
    this.line.renderOrder = 3;
    this.line.visible = false;
    scene.add(this.line);

    const ring = new THREE.RingGeometry(0.42, 0.52, 24);
    ring.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xe8a94a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    this.ring = new THREE.Mesh(ring, this.ringMat);
    this.ring.frustumCulled = false;
    this.ring.renderOrder = 3;
    this.ring.visible = false;
    scene.add(this.ring);
    this.t = 0;
    this.maxLength = 7.5;
  }

  /**
   * player: { x, y, z }, aim: { x, z }, target: Enemy or null, world for wall trimming.
   * `visible` false hides both parts (desktop, cinematics, death).
   */
  update(dt, player, aim, target, world, visible) {
    this.t += dt;
    if (!visible) {
      this.line.visible = false;
      this.ring.visible = false;
      return;
    }
    // trim the line where it meets a wall so it never points through the cabin
    let length = this.maxLength;
    const hit = world.colliders.raycastBullets(player.x, player.z, aim.x, aim.z, this.maxLength);
    if (hit) length = Math.max(0.8, hit.t - 0.1);
    if (target) length = Math.min(length, Math.max(1.0, Math.hypot(target.x - player.x, target.z - player.z) - 0.35));

    this.line.visible = true;
    this.line.position.set(player.x, player.y + 0.035, player.z);
    this.line.rotation.y = Math.atan2(aim.x, aim.z);
    this.line.scale.set(0.16, 1, length);
    this.lineMat.uniforms.uOpacity.value = target ? 0.72 : 0.42;

    if (target && !target.dead) {
      this.ring.visible = true;
      const pulse = 1 + Math.sin(this.t * 7) * 0.06;
      this.ring.position.set(target.x, world.property.groundHeight(target.x, target.z) + 0.04, target.z);
      this.ring.scale.setScalar(pulse);
      this.ringMat.opacity = 0.55 + Math.sin(this.t * 7) * 0.15;
    } else {
      this.ring.visible = false;
    }
  }

  dispose() {
    this.line.geometry.dispose();
    this.lineMat.dispose();
    this.ring.geometry.dispose();
    this.ringMat.dispose();
  }
}
