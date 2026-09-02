import * as THREE from 'three';
import { damp, clamp, degToRad } from '../utils/math.js';

/**
 * Cinematic elevated follow camera (perspective, fixed yaw looking north).
 * Smooth follow, aim look-ahead, shake, zoom multiplier, and cinematic overrides.
 * See docs/GAME_DESIGN.md (Camera).
 */
export class CameraManager {
  constructor(settings = {}) {
    this.camera = new THREE.PerspectiveCamera(settings.fov || 42, 1, 0.1, 220);
    this.pitch = degToRad(settings.pitchDeg || 56);
    this.height = settings.height || 13.5;
    this.back = settings.back || 8.5;
    this.lookAheadMax = settings.lookAhead || 2.4;
    this.target = new THREE.Vector3();
    this.aimDir = new THREE.Vector2(0, -1);
    this.focus = new THREE.Vector3();
    this.zoom = 1;
    this.zoomTarget = 1;
    this.shakeAmp = 0;
    this.shakeTime = 0;
    this.shakeScale = 1;
    this._override = null;
    this._overrideBlend = 0;
    this._overridePos = new THREE.Vector3();
    this._overrideLook = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this.firstFrame = true;
  }

  setAspect(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  snap() { this.firstFrame = true; }

  shake(intensity) {
    this.shakeAmp = Math.min(1.2, this.shakeAmp + intensity * this.shakeScale);
  }

  /** Cinematic override: position/lookAt in world; blend in seconds. Pass null to release. */
  setOverride(pos, lookAt, blend = 1) {
    if (!pos) { this._override = null; return; }
    this._override = { pos: pos.clone(), lookAt: lookAt.clone(), blend };
  }

  update(dt) {
    // look-ahead toward aim
    const la = this.lookAheadMax;
    const fx = this.target.x + this.aimDir.x * la;
    const fz = this.target.z + this.aimDir.y * la;
    const lambda = 6;
    if (this.firstFrame) {
      this.focus.set(fx, this.target.y, fz);
    } else {
      this.focus.x = damp(this.focus.x, fx, lambda, dt);
      this.focus.z = damp(this.focus.z, fz, lambda, dt);
      this.focus.y = damp(this.focus.y, this.target.y, lambda, dt);
    }
    this.zoom = damp(this.zoom, this.zoomTarget, 3, dt);

    const h = this.height * this.zoom;
    const b = this.back * this.zoom;
    this._pos.set(this.focus.x, this.focus.y + h, this.focus.z + b);
    this._look.copy(this.focus);

    if (this._override) {
      this._overrideBlend = clamp(this._overrideBlend + dt / this._override.blend, 0, 1);
    } else {
      this._overrideBlend = clamp(this._overrideBlend - dt / 1.2, 0, 1);
    }
    if (this._overrideBlend > 0 && this._override) {
      this._overridePos.copy(this._override.pos);
      this._overrideLook.copy(this._override.lookAt);
    }
    if (this._overrideBlend > 0) {
      const t = this._overrideBlend * this._overrideBlend * (3 - 2 * this._overrideBlend);
      this._pos.lerp(this._overridePos, t);
      this._look.lerp(this._overrideLook, t);
    }

    // shake
    if (this.shakeAmp > 0.001) {
      this.shakeTime += dt * 40;
      const a = this.shakeAmp;
      this._pos.x += Math.sin(this.shakeTime * 1.3) * a * 0.25;
      this._pos.y += Math.cos(this.shakeTime * 1.7) * a * 0.18;
      this._pos.z += Math.sin(this.shakeTime * 0.9) * a * 0.2;
      this.shakeAmp = damp(this.shakeAmp, 0, 9, dt);
    }

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
    this.firstFrame = false;
  }

  /** Project a screen point onto the plane y=planeY. Returns THREE.Vector3 or null. */
  screenToGround(sx, sy, width, height, planeY = 0, out = new THREE.Vector3()) {
    const ndc = this._tmp.set((sx / width) * 2 - 1, -(sy / height) * 2 + 1, 0.5);
    ndc.unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    if (Math.abs(dir.y) < 1e-6) return null;
    const t = (planeY - this.camera.position.y) / dir.y;
    if (t < 0) return null;
    return out.copy(this.camera.position).addScaledVector(dir, t);
  }
}
