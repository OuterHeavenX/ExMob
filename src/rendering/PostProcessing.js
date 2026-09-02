/**
 * Post-processing is deliberately NOT enabled in v0.1.0 (docs/GRAPHICS_TECHNOLOGY.md).
 * Tone mapping (ACES) and fog happen in the main pass. This module is the seam where an
 * EffectComposer (bloom on HIGH/ULTRA) will be attached once measured on target hardware.
 */
export class PostProcessing {
  constructor(renderer, quality) {
    this.renderer = renderer;
    this.quality = quality;
    this.enabled = false;
  }

  /** Render passthrough. */
  render(scene, camera) {
    this.renderer.render(scene, camera);
  }
}
