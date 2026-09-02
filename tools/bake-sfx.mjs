// Offline SFX baker: renders layered, processed sound effects to WAV files in assets/audio/sfx and
// writes assets/audio/manifest.json. These are SYNTHESIZED placeholders rendered with more DSP than
// the realtime fallback (multi-layer bodies, filtered tails, comb reverb, soft clipping). Recorded
// SFX drop in by replacing the files for an id without touching game code (docs/DECISIONS.md ADR-007).
// Usage: node tools/bake-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 32000;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'assets', 'audio', 'sfx');
mkdirSync(outDir, { recursive: true });

// ----------------------------------------------------------------------------- DSP helpers
let seed = 1337;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rr = (a, b) => a + rnd() * (b - a);

function biquad(type, f0, Q = 0.707) {
  const w0 = 2 * Math.PI * f0 / SR, cw = Math.cos(w0), sw = Math.sin(w0), alpha = sw / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; } // bandpass
  a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

function env(t, attack, decay, curve = 3) {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  const d = (t - attack) / decay;
  return d >= 1 ? 0 : Math.pow(1 - d, curve);
}

class Track {
  constructor(seconds) { this.buf = new Float32Array(Math.ceil(seconds * SR)); }
  /** gen(t, i) returns a sample; added into the buffer. */
  add(gen, start = 0, len = null) {
    const s0 = Math.floor(start * SR), n = len ? Math.min(this.buf.length - s0, Math.floor(len * SR)) : this.buf.length - s0;
    for (let i = 0; i < n; i++) this.buf[s0 + i] += gen(i / SR, i);
  }
  noise(gain, filters, attack, decay, start = 0, len = null, curve = 3) {
    const fs = filters.map(([type, f, q]) => biquad(type, f, q));
    this.add((t) => { let x = rnd() * 2 - 1; for (const f of fs) x = f(x); return x * gain * env(t, attack, decay, curve); }, start, len);
  }
  tone(gain, freq, freqEnd, attack, decay, type = 'sine', start = 0, len = null) {
    let ph = 0;
    this.add((t, i) => {
      const k = Math.min(1, t / Math.max(0.001, decay));
      const f = freq * Math.pow((freqEnd || freq) / freq, k);
      ph += 2 * Math.PI * f / SR;
      const s = type === 'sine' ? Math.sin(ph) : type === 'square' ? Math.sign(Math.sin(ph)) : type === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : ((ph / Math.PI) % 2) - 1;
      return s * gain * env(t, attack, decay);
    }, start, len);
  }
  reverb(mix = 0.25, decaySec = 0.35) {
    const delays = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => Math.floor(d * SR));
    const out = new Float32Array(this.buf.length);
    for (const d of delays) {
      const fb = Math.pow(0.001, d / SR / decaySec);
      const line = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < this.buf.length; i++) {
        const y = line[idx];
        line[idx] = this.buf[i] + y * fb;
        idx = (idx + 1) % d;
        out[i] += y / delays.length;
      }
    }
    for (let i = 0; i < this.buf.length; i++) this.buf[i] = this.buf[i] * (1 - mix) + out[i] * mix;
  }
  finish(peak = 0.9) {
    // soft clip + normalize
    let mx = 0;
    for (let i = 0; i < this.buf.length; i++) { this.buf[i] = Math.tanh(this.buf[i] * 1.4); mx = Math.max(mx, Math.abs(this.buf[i])); }
    const g = mx > 0 ? peak / mx : 1;
    for (let i = 0; i < this.buf.length; i++) this.buf[i] *= g;
    // fade tail
    const tail = Math.min(this.buf.length, Math.floor(0.02 * SR));
    for (let i = 0; i < tail; i++) this.buf[this.buf.length - 1 - i] *= i / tail;
    return this.buf;
  }
}

function wav(samples) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return b;
}

// ----------------------------------------------------------------------------- recipes

function gunshot({ body = 1, crack = 1, tail = 0.4, pitch = 1, seconds = 0.9 }) {
  const t = new Track(seconds);
  t.noise(1.2 * crack, [['hp', 1600 * pitch, 0.7]], 0.0005, 0.045, 0, 0.12, 2);
  t.noise(1.0 * body, [['lp', 900 * pitch, 0.8], ['hp', 60, 0.7]], 0.001, 0.16 * body, 0, 0.5, 3);
  t.noise(0.5 * body, [['bp', 300 * pitch, 1.2]], 0.002, 0.28 * body, 0, 0.6, 2);
  t.tone(0.8 * body, 150 * pitch, 38, 0.001, 0.15, 'sine');
  t.noise(0.25, [['bp', 700 * pitch, 0.8], ['lp', 3000, 0.7]], 0.01, 0.55 * tail + 0.2, 0.01, null, 2);
  t.reverb(0.3 + tail * 0.2, 0.3 + tail * 0.3);
  return t.finish();
}
function click({ pitch = 1 }) {
  const t = new Track(0.15);
  t.tone(0.5, 1800 * pitch, 600 * pitch, 0.0005, 0.03, 'square');
  t.noise(0.5, [['hp', 3000, 0.7]], 0.0005, 0.02);
  return t.finish(0.6);
}
function reload({ steps = 2 }) {
  const t = new Track(0.32 * steps + 0.2);
  for (let i = 0; i < steps; i++) {
    t.noise(0.6, [['bp', 2200 + i * 400, 2]], 0.001, 0.05, i * 0.32);
    t.tone(0.3, 900 + i * 300, 400, 0.001, 0.06, 'tri', i * 0.32 + 0.01);
    t.noise(0.2, [['lp', 500, 0.7]], 0.002, 0.08, i * 0.32 + 0.02);
  }
  return t.finish(0.7);
}
function pump() {
  const t = new Track(0.4);
  t.noise(0.7, [['bp', 1400, 1.5]], 0.001, 0.07);
  t.noise(0.35, [['lp', 400, 0.7]], 0.002, 0.08, 0.005);
  t.noise(0.8, [['bp', 1000, 1.5]], 0.001, 0.07, 0.14);
  t.noise(0.35, [['lp', 350, 0.7]], 0.002, 0.09, 0.145);
  return t.finish(0.75);
}
function impact({ tone = 'wood', pitch = 1 }) {
  const cfg = { wood: [700, 0.09, 1.2], metal: [2600, 0.16, 6], flesh: [260, 0.1, 1.0], dirt: [420, 0.09, 0.9] }[tone];
  const t = new Track(0.4);
  t.noise(0.9, [['bp', cfg[0] * pitch, cfg[2]]], 0.0005, cfg[1], 0, null, 2);
  if (tone === 'wood') { t.noise(0.4, [['hp', 2500, 0.7]], 0.0005, 0.03); t.tone(0.25, 180, 90, 0.001, 0.06); }
  if (tone === 'metal') { t.tone(0.25, 3200 * pitch, 2400, 0.0005, 0.2, 'sine'); t.tone(0.15, 5100 * pitch, 4700, 0.0005, 0.12, 'sine'); }
  if (tone === 'flesh') { t.tone(0.45, 180 * pitch, 60, 0.001, 0.08); t.noise(0.3, [['lp', 600, 0.7]], 0.002, 0.12); }
  if (tone === 'dirt') t.noise(0.5, [['lp', 900, 0.7]], 0.002, 0.14);
  return t.finish(0.8);
}
function glass() {
  const t = new Track(0.7);
  for (let i = 0; i < 9; i++) t.tone(0.15, rr(2800, 7000), rr(1800, 3000), 0.0005, rr(0.08, 0.22), 'tri', rr(0, 0.28));
  t.noise(0.7, [['hp', 3500, 0.7]], 0.0005, 0.25, 0, null, 2);
  t.noise(0.3, [['bp', 1800, 2]], 0.001, 0.12, 0.01);
  t.reverb(0.2, 0.3);
  return t.finish(0.85);
}
function thud({ pitch = 1 }) {
  const t = new Track(0.45);
  t.tone(0.9, 110 * pitch, 42, 0.001, 0.2);
  t.noise(0.6, [['lp', 500 * pitch, 0.8]], 0.001, 0.12);
  t.noise(0.25, [['bp', 1200, 1.5]], 0.0005, 0.03);
  t.reverb(0.15, 0.25);
  return t.finish(0.9);
}
function breakSfx({ pitch = 1 }) {
  const t = new Track(0.9);
  t.tone(0.8, 90 * pitch, 35, 0.001, 0.25);
  t.noise(0.9, [['lp', 1800 * pitch, 0.8]], 0.001, 0.4, 0, null, 2);
  for (let i = 0; i < 7; i++) t.noise(0.4, [['bp', rr(700, 2400), 3]], 0.0005, rr(0.04, 0.09), rr(0.03, 0.35));
  t.reverb(0.25, 0.35);
  return t.finish(0.9);
}
function creak() {
  const t = new Track(0.5);
  t.tone(0.12, 220, 330, 0.05, 0.35, 'saw');
  t.tone(0.06, 440, 660, 0.05, 0.3, 'saw');
  return t.finish(0.5);
}
function engine() {
  const t = new Track(7.2);
  let ph = 0;
  t.add((tt) => {
    const f = tt < 3.5 ? 38 + (70 - 38) * (tt / 3.5) : 70 - (70 - 30) * Math.min(1, (tt - 3.5) / 3);
    ph += 2 * Math.PI * f / SR;
    const g = tt < 1.5 ? tt / 1.5 : tt < 5 ? 1 : Math.max(0, 1 - (tt - 5) / 2);
    const s = ((ph / Math.PI) % 2) - 1;
    return (s * 0.5 + Math.sin(ph * 2) * 0.2 + (rnd() * 2 - 1) * 0.08) * g * 0.6;
  });
  const lp = biquad('lp', 260, 0.8);
  for (let i = 0; i < t.buf.length; i++) t.buf[i] = lp(t.buf[i]);
  return t.finish(0.7);
}
function cash({ pitch = 1 }) {
  const t = new Track(0.3);
  t.noise(0.35, [['bp', 5000 * pitch, 2]], 0.001, 0.1);
  t.tone(0.2, 1300 * pitch, 1700 * pitch, 0.002, 0.16, 'tri', 0.04);
  return t.finish(0.6);
}
function hit() {
  const t = new Track(0.7);
  t.tone(0.9, 70, 40, 0.001, 0.45);
  t.noise(0.4, [['lp', 800, 0.7]], 0.001, 0.25);
  t.reverb(0.2, 0.4);
  return t.finish(0.9);
}
function buzz() {
  const t = new Track(1.1);
  for (let i = 0; i < 2; i++) t.tone(0.1, 180, 180, 0.01, 0.28, 'square', i * 0.5, 0.3);
  return t.finish(0.5);
}
function heartbeat() {
  const t = new Track(0.5);
  t.tone(0.7, 60, 40, 0.001, 0.13);
  t.tone(0.5, 55, 38, 0.001, 0.12, 'sine', 0.22);
  return t.finish(0.8);
}
function whoosh() {
  const t = new Track(0.4);
  t.noise(0.35, [['bp', 900, 0.6]], 0.05, 0.25);
  return t.finish(0.5);
}
function grunt() {
  const t = new Track(0.35);
  t.tone(0.15, rr(150, 210), 70, 0.01, 0.2, 'saw');
  t.noise(0.15, [['bp', 500, 1]], 0.005, 0.18);
  return t.finish(0.6);
}

// ----------------------------------------------------------------------------- catalogue
const RECIPES = {
  pistol_fire: [3, () => gunshot({ body: 0.55, crack: 1.0, tail: 0.35, pitch: rr(0.96, 1.04) })],
  revolver_fire: [3, () => gunshot({ body: 1.0, crack: 0.8, tail: 0.6, pitch: rr(0.68, 0.74), seconds: 1.1 })],
  shotgun_fire: [3, () => gunshot({ body: 1.3, crack: 0.6, tail: 0.7, pitch: rr(0.52, 0.58), seconds: 1.2 })],
  smg_fire: [4, () => gunshot({ body: 0.35, crack: 0.9, tail: 0.2, pitch: rr(1.1, 1.2), seconds: 0.5 })],
  dry_fire: [1, () => click({ pitch: 1 })],
  pistol_reload: [1, () => reload({ steps: 2 })],
  revolver_reload: [1, () => reload({ steps: 3 })],
  smg_reload: [1, () => reload({ steps: 2 })],
  shotgun_shell: [2, () => click({ pitch: 0.8 })],
  shotgun_pump: [1, () => pump()],
  impact_wood: [4, () => impact({ tone: 'wood', pitch: rr(0.9, 1.1) })],
  impact_metal: [3, () => impact({ tone: 'metal', pitch: rr(0.9, 1.1) })],
  impact_glass: [2, () => glass()],
  impact_flesh: [3, () => impact({ tone: 'flesh', pitch: rr(0.9, 1.1) })],
  impact_dirt: [3, () => impact({ tone: 'dirt', pitch: rr(0.9, 1.1) })],
  door_kick: [3, () => thud({ pitch: rr(0.95, 1.05) })],
  door_break: [2, () => breakSfx({ pitch: 1 })],
  board_hit: [3, () => thud({ pitch: 1.3 })],
  door_open: [2, () => creak()],
  prop_break: [3, () => breakSfx({ pitch: rr(1.2, 1.4) })],
  engine_arrive: [1, () => engine()],
  car_door: [2, () => thud({ pitch: 0.8 })],
  cash_pickup: [2, () => cash({ pitch: 1 })],
  ui_click: [1, () => click({ pitch: 1.6 })],
  ui_buy: [1, () => cash({ pitch: 1.2 })],
  ui_denied: [1, () => click({ pitch: 0.5 })],
  wave_banner: [1, () => hit()],
  phone_buzz: [1, () => buzz()],
  player_hurt: [3, () => impact({ tone: 'flesh', pitch: 0.8 })],
  heartbeat: [1, () => heartbeat()],
  dodge: [1, () => whoosh()],
  enemy_death: [4, () => grunt()],
};

const manifest = { generated: new Date().toISOString(), sampleRate: SR, note: 'Synthesized placeholders rendered offline. Replace files per id with recorded SFX.', sfx: {} };
let bytes = 0;
for (const [id, [count, fn]] of Object.entries(RECIPES)) {
  const files = [];
  for (let i = 0; i < count; i++) {
    const name = `${id}_${i + 1}.wav`;
    const data = wav(fn());
    writeFileSync(join(outDir, name), data);
    bytes += data.length;
    files.push(`sfx/${name}`);
  }
  manifest.sfx[id] = files;
}
writeFileSync(join(root, 'assets', 'audio', 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Baked ${Object.keys(RECIPES).length} sfx ids, ${(bytes / 1024).toFixed(0)} KB`);
