import * as THREE from 'three';

/**
 * Owns the WebGLRenderer (WebGL2). Applies quality settings (render scale, antialias, shadows).
 * Antialias requires context recreation, so it is read once at creation; other settings are live.
 * WebGPU is deliberately deferred (docs/DECISIONS.md ADR-002).
 */
export class Renderer {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.quality = quality;
    const preset = quality.preset;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: preset.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      logarithmicDepthBuffer: false,
    });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.gl.shadowMap.enabled = preset.shadows;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.setClearColor(0x05070c, 1);
    this.width = 1;
    this.height = 1;
    this.applyQuality(preset);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    quality.onChange((p) => { this.applyQuality(p); this.resize(); });
  }

  static isSupported() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2'));
    } catch { return false; }
  }

  applyQuality(preset) {
    this.renderScale = preset.renderScale;
    this.gl.shadowMap.enabled = preset.shadows;
    this.gl.shadowMap.needsUpdate = true;
  }

  resize() {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.width = w;
    this.height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.renderScale);
    this.gl.setPixelRatio(dpr);
    this.gl.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.onResize) this.onResize(w, h);
  }

  render(scene, camera) {
    this.gl.render(scene, camera);
  }

  get info() { return this.gl.info; }

  dispose() { this.gl.dispose(); }
}
