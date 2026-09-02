/**
 * Procedurally synthesized placeholder SFX (docs/DECISIONS.md ADR-007).
 * Each recipe schedules Web Audio nodes into `out` at time `t0`. `p` is the SFX registry entry
 * merged with per-call options {pitch, gain}.
 */

let _noiseBuffer = null;
function noiseBuffer(ctx) {
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate) return _noiseBuffer;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  _noiseBuffer = buf;
  return buf;
}

function noise(ctx, out, t0, dur, { gain = 1, filter = null, q = 1, attack = 0.001, decay = dur, pitchEnv = null } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  src.playbackRate.value = 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + Math.max(attack + 0.005, decay));
  let node = src;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.setValueAtTime(filter.freq, t0);
    if (pitchEnv) f.frequency.exponentialRampToValueAtTime(Math.max(30, pitchEnv), t0 + decay);
    f.Q.value = q;
    node.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function tone(ctx, out, t0, dur, { type = 'sine', freq = 200, freqEnd = null, gain = 0.5, attack = 0.002, decay = dur } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + decay);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const SYNTHS = {
  gunshot(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    const g = p.gain || 1;
    // crack (high transient)
    noise(ctx, out, t0, 0.08, { gain: 1.2 * g * (p.crack || 1), filter: { type: 'highpass', freq: 1800 * pitch }, attack: 0.001, decay: 0.06 });
    // body (mid boom)
    noise(ctx, out, t0, 0.25 * (p.body || 1), { gain: 0.9 * g * (p.body || 1), filter: { type: 'lowpass', freq: 900 * pitch }, q: 0.7, attack: 0.002, decay: 0.2 * (p.body || 1), pitchEnv: 120 });
    // sub thump
    tone(ctx, out, t0, 0.18, { type: 'sine', freq: 140 * pitch, freqEnd: 40, gain: 0.7 * g * (p.body || 1), decay: 0.16 });
    // tail
    noise(ctx, out, t0 + 0.02, 0.6 * (p.tail || 0.4), { gain: 0.18 * g, filter: { type: 'bandpass', freq: 600 * pitch }, q: 0.8, attack: 0.01, decay: 0.55 * (p.tail || 0.4) });
  },
  click(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    tone(ctx, out, t0, 0.05, { type: 'square', freq: 1800 * pitch, freqEnd: 600 * pitch, gain: 0.25 * (p.gain || 1), decay: 0.04 });
    noise(ctx, out, t0, 0.03, { gain: 0.3 * (p.gain || 1), filter: { type: 'highpass', freq: 3000 }, decay: 0.025 });
  },
  reload(ctx, out, t0, p) {
    const steps = p.steps || 2;
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * 0.32;
      noise(ctx, out, t, 0.06, { gain: 0.5 * (p.gain || 1), filter: { type: 'bandpass', freq: 2200 + i * 400 }, q: 2, decay: 0.05 });
      tone(ctx, out, t + 0.01, 0.06, { type: 'triangle', freq: 900 + i * 300, freqEnd: 400, gain: 0.2 * (p.gain || 1), decay: 0.05 });
    }
  },
  pump(ctx, out, t0, p) {
    noise(ctx, out, t0, 0.09, { gain: 0.6 * (p.gain || 1), filter: { type: 'bandpass', freq: 1400 }, q: 1.5, decay: 0.08 });
    noise(ctx, out, t0 + 0.14, 0.09, { gain: 0.7 * (p.gain || 1), filter: { type: 'bandpass', freq: 1000 }, q: 1.5, decay: 0.08 });
  },
  impact(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    const g = p.gain || 1;
    const tones = { wood: [700, 0.08], metal: [2600, 0.14], flesh: [260, 0.1], dirt: [420, 0.09] };
    const [f, d] = tones[p.tone] || tones.wood;
    noise(ctx, out, t0, d + 0.05, { gain: 0.8 * g, filter: { type: 'bandpass', freq: f * pitch }, q: p.tone === 'metal' ? 6 : 1.2, decay: d });
    if (p.tone === 'metal') tone(ctx, out, t0, 0.2, { type: 'sine', freq: 3200 * pitch, freqEnd: 2400, gain: 0.12 * g, decay: 0.18 });
    if (p.tone === 'flesh') tone(ctx, out, t0, 0.08, { type: 'sine', freq: 180 * pitch, freqEnd: 60, gain: 0.35 * g, decay: 0.07 });
  },
  glass(ctx, out, t0, p) {
    const g = p.gain || 1;
    for (let i = 0; i < 7; i++) {
      const t = t0 + Math.random() * 0.25;
      tone(ctx, out, t, 0.2, { type: 'triangle', freq: 3000 + Math.random() * 4000, freqEnd: 2000, gain: 0.12 * g, decay: 0.12 + Math.random() * 0.15 });
    }
    noise(ctx, out, t0, 0.3, { gain: 0.6 * g, filter: { type: 'highpass', freq: 3500 }, decay: 0.25 });
  },
  thud(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    const g = p.gain || 1;
    tone(ctx, out, t0, 0.2, { type: 'sine', freq: 110 * pitch, freqEnd: 45, gain: 0.9 * g, decay: 0.18 });
    noise(ctx, out, t0, 0.12, { gain: 0.5 * g, filter: { type: 'lowpass', freq: 500 * pitch }, decay: 0.1 });
  },
  break(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    const g = p.gain || 1;
    tone(ctx, out, t0, 0.25, { type: 'sine', freq: 90 * pitch, freqEnd: 35, gain: 0.8 * g, decay: 0.22 });
    noise(ctx, out, t0, 0.5, { gain: 0.9 * g, filter: { type: 'lowpass', freq: 1800 * pitch }, decay: 0.4 });
    for (let i = 0; i < 5; i++) noise(ctx, out, t0 + 0.05 + Math.random() * 0.3, 0.08, { gain: 0.35 * g, filter: { type: 'bandpass', freq: 900 + Math.random() * 1500 }, q: 3, decay: 0.07 });
  },
  creak(ctx, out, t0, p) {
    tone(ctx, out, t0, 0.35, { type: 'sawtooth', freq: 220, freqEnd: 320, gain: 0.08 * (p.gain || 1), attack: 0.05, decay: 0.3 });
  },
  engine(ctx, out, t0, p) {
    const g = p.gain || 1;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(38, t0);
    o.frequency.linearRampToValueAtTime(70, t0 + 3.5);
    o.frequency.linearRampToValueAtTime(30, t0 + 6.5);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(0.5 * g, t0 + 1.5);
    gn.gain.setValueAtTime(0.5 * g, t0 + 5);
    gn.gain.linearRampToValueAtTime(0, t0 + 7);
    o.connect(f); f.connect(gn); gn.connect(out);
    o.start(t0); o.stop(t0 + 7.2);
  },
  cash(ctx, out, t0, p) {
    const pitch = p.pitch || 1;
    noise(ctx, out, t0, 0.12, { gain: 0.35 * (p.gain || 1), filter: { type: 'bandpass', freq: 5000 * pitch }, q: 2, decay: 0.1 });
    tone(ctx, out, t0 + 0.04, 0.16, { type: 'triangle', freq: 1300 * pitch, freqEnd: 1700 * pitch, gain: 0.12 * (p.gain || 1), decay: 0.14 });
  },
  hit(ctx, out, t0, p) {
    tone(ctx, out, t0, 0.5, { type: 'sine', freq: 70, freqEnd: 40, gain: 0.9 * (p.gain || 1), decay: 0.45 });
    noise(ctx, out, t0, 0.3, { gain: 0.4 * (p.gain || 1), filter: { type: 'lowpass', freq: 800 }, decay: 0.25 });
  },
  buzz(ctx, out, t0, p) {
    for (let i = 0; i < 2; i++) tone(ctx, out, t0 + i * 0.5, 0.3, { type: 'square', freq: 180, gain: 0.08 * (p.gain || 1), attack: 0.01, decay: 0.28 });
  },
  heartbeat(ctx, out, t0, p) {
    tone(ctx, out, t0, 0.15, { type: 'sine', freq: 60, freqEnd: 40, gain: 0.7 * (p.gain || 1), decay: 0.13 });
    tone(ctx, out, t0 + 0.22, 0.15, { type: 'sine', freq: 55, freqEnd: 38, gain: 0.5 * (p.gain || 1), decay: 0.12 });
  },
  whoosh(ctx, out, t0, p) {
    noise(ctx, out, t0, 0.3, { gain: 0.35 * (p.gain || 1), filter: { type: 'bandpass', freq: 900 }, q: 0.6, attack: 0.05, decay: 0.25, pitchEnd: 300 });
  },
  grunt(ctx, out, t0, p) {
    tone(ctx, out, t0, 0.22, { type: 'sawtooth', freq: 150 + Math.random() * 60, freqEnd: 70, gain: 0.12 * (p.gain || 1), attack: 0.01, decay: 0.2 });
    noise(ctx, out, t0, 0.2, { gain: 0.15 * (p.gain || 1), filter: { type: 'bandpass', freq: 500 }, q: 1, decay: 0.18 });
  },
};
