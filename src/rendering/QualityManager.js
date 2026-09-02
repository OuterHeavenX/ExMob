import { QUALITY_PRESETS, QUALITY_ORDER } from '../data/quality.js';
import { detectDevice, gpuRendererString, classifyGPU } from '../utils/DeviceDetect.js';

/**
 * Owns the active quality preset. Every system reads caps from `preset`.
 * AUTO picks a tier from device heuristics (docs/GRAPHICS_TECHNOLOGY.md).
 */
export class QualityManager {
  constructor(initial = 'auto') {
    this.device = detectDevice();
    this.requested = initial;
    this.presetId = initial === 'auto' ? this.autoDetect(null) : initial;
    this.preset = QUALITY_PRESETS[this.presetId] || QUALITY_PRESETS.medium;
    this._listeners = new Set();
    this.gpuString = '';
  }

  autoDetect(renderer) {
    const d = this.device;
    if (renderer) this.gpuString = gpuRendererString(renderer.gl || renderer);
    const gpu = classifyGPU(this.gpuString);
    if (d.isMobile && !d.isTablet) return d.memory >= 6 && d.isIOS ? 'medium' : 'low';
    if (d.isTablet) return 'medium';
    if (gpu === 'discrete') return 'high';
    if (gpu === 'integrated') return 'medium';
    return d.cores >= 8 && d.memory >= 8 ? 'high' : 'medium';
  }

  /** Re-run AUTO after the renderer exists (GPU string available). */
  refineAuto(renderer) {
    if (this.requested !== 'auto') return;
    const id = this.autoDetect(renderer);
    if (id !== this.presetId) this._apply(id);
  }

  set(id) {
    this.requested = id;
    const resolved = id === 'auto' ? this.autoDetect(null) : id;
    if (!QUALITY_PRESETS[resolved]) return;
    this._apply(resolved);
  }

  _apply(id) {
    this.presetId = id;
    this.preset = QUALITY_PRESETS[id];
    for (const fn of this._listeners) fn(this.preset);
  }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }

  stepDown() {
    const i = QUALITY_ORDER.indexOf(this.presetId);
    if (i > 0) this._apply(QUALITY_ORDER[i - 1]);
  }

  get label() { return this.requested === 'auto' ? `AUTO (${this.preset.label})` : this.preset.label; }
}
