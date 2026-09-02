import * as THREE from 'three';

/** Muzzle flash: additive sprite at the muzzle for two frames + pooled point light. */
function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,250,220,1)');
  grd.addColorStop(0.25, 'rgba(255,210,120,0.9)');
  grd.addColorStop(0.6, 'rgba(255,140,40,0.35)');
  grd.addColorStop(1, 'rgba(255,100,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  // spikes
  g.strokeStyle = 'rgba(255,230,160,0.8)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MuzzleFlash {
  constructor(scene, lighting) {
    this.lighting = lighting;
    const tex = flashTexture();
    this.sprites = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.visible = false;
      scene.add(s);
      this.sprites.push({ sprite: s, t: 0 });
    }
    this.cursor = 0;
  }

  flash(x, y, z, dx, dz, weapon) {
    const it = this.sprites[this.cursor];
    this.cursor = (this.cursor + 1) % this.sprites.length;
    const s = it.sprite;
    const sc = 0.45 * weapon.muzzle.flashScale * (0.8 + Math.random() * 0.5);
    s.position.set(x + dx * 0.15, y, z + dz * 0.15);
    s.scale.set(sc, sc, sc);
    s.material.rotation = Math.random() * Math.PI;
    s.visible = true;
    it.t = 0.045;
    this.lighting.flash(x + dx * 0.3, y, z + dz * 0.3, weapon.muzzle.lightColor, weapon.muzzle.lightIntensity, 0.07);
  }

  update(dt) {
    for (const it of this.sprites) {
      if (!it.sprite.visible) continue;
      it.t -= dt;
      if (it.t <= 0) it.sprite.visible = false;
    }
  }
}
