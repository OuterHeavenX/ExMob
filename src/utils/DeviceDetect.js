/** Device capability sniffing for QualityManager AUTO and input mode defaults. */
export function detectDevice() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  const isTablet = /iPad/.test(ua) || (isIOS && Math.min(screen.width, screen.height) >= 700) || (isAndroid && !/Mobile/.test(ua));
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return {
    ua, isIOS, isAndroid, isMobile, isTablet, touch,
    dpr: window.devicePixelRatio || 1,
    cores: navigator.hardwareConcurrency || 4,
    memory: navigator.deviceMemory || (isMobile ? 4 : 8),
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}

/** Reads the unmasked GPU string from a WebGL context, if allowed. */
export function gpuRendererString(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    return gl.getParameter(gl.RENDERER) || '';
  } catch { return ''; }
}

export function classifyGPU(str) {
  const s = (str || '').toLowerCase();
  if (/apple m\d|apple gpu|nvidia|geforce|radeon rx|radeon pro|arc a/.test(s)) return 'discrete';
  if (/intel|iris|uhd|adreno|mali|powervr|apple a\d/.test(s)) return 'integrated';
  return 'unknown';
}
