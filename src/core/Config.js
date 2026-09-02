/**
 * Global configuration and build metadata. Bump VERSION with package.json (AGENTS.md rule 6).
 */
export const VERSION = '0.1.0';
export const BUILD_NAME = 'CABIN VERTICAL SLICE';

function readFlag(name) {
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    if (params.has(name)) return params.get(name) !== '0';
    return globalThis.localStorage?.getItem('exmob_' + name) === '1';
  } catch { return false; }
}

export const CONFIG = Object.freeze({
  fixedDt: 1 / 60,
  maxSubsteps: 4,
  maxFrameDt: 0.1,
  devMode: readFlag('dev'),
  smokeTest: readFlag('smoke'),
  experimentalGPU: readFlag('gpu'),
  skipIntro: readFlag('nointro'),
  forceTouch: readFlag('touch'),
  saveKey: 'main',
  dbName: 'exmob',
});
