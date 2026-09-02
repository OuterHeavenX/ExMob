import { MUSIC_STATES } from '../data/audio/audioRegistry.js';

/**
 * Dynamic layered music (placeholder synth layers). Each layer is a looping oscillator
 * pattern whose gain crossfades in/out by state (docs/GAME_DESIGN.md Music).
 * Layers: drone, pulse, rhythm, lead, stabs.
 */
export class MusicDirector {
  constructor(ctx, bus) {
    this.ctx = ctx;
    this.bus = bus;
    this.state = 'silence';
    this.layers = {};
    this.tempo = 96;
    this._beat = 0;
    this._nextBeatTime = 0;
    this._build();
  }

  _layer(name, gain0 = 0) {
    const g = this.ctx.createGain();
    g.gain.value = gain0;
    g.connect(this.bus);
    this.layers[name] = { gain: g, target: 0 };
    return g;
  }

  _build() {
    const ctx = this.ctx;
    // drone: two detuned saws through a lowpass
    const drone = this._layer('drone');
    for (const det of [-6, 5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 55;
      o.detune.value = det;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      o.connect(f); f.connect(drone);
      o.start();
    }
    this._layer('pulse');
    this._layer('rhythm');
    this._layer('lead');
    this._layer('stabs');
    this._nextBeatTime = ctx.currentTime + 0.1;
  }

  setState(state) {
    if (!MUSIC_STATES[state]) return;
    this.state = state;
    const active = new Set(MUSIC_STATES[state].layers);
    const levels = { drone: 0.16, pulse: 0.09, rhythm: 0.1, lead: 0.07, stabs: 0.12 };
    for (const [name, l] of Object.entries(this.layers)) {
      l.target = active.has(name) ? levels[name] : 0;
      l.gain.gain.setTargetAtTime(l.target, this.ctx.currentTime, active.has(name) ? 1.2 : 0.8);
    }
    this.tempo = state === 'combat_high' ? 128 : state === 'combat_mid' ? 116 : state === 'combat_low' ? 104 : 88;
  }

  _hit(layerName, freq, dur, type = 'square', gain = 1) {
    const l = this.layers[layerName];
    if (!l || l.target <= 0) return;
    const t = this._nextBeatTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(l.gain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  update() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const beatLen = 60 / this.tempo / 2; // eighth notes
    while (this._nextBeatTime < now + 0.15) {
      const b = this._beat % 16;
      // pulse: low kick-ish on 1 and 9
      if (b % 4 === 0) this._hit('pulse', 55, 0.25, 'sine', 1.2);
      // rhythm: hats every eighth, accent on offbeats
      this._hit('rhythm', 3200 + (b % 2) * 600, 0.05, 'square', b % 2 ? 0.35 : 0.2);
      // lead: sparse minor motif
      const motif = [0, null, 3, null, null, 7, null, 10, null, null, 7, null, 3, null, null, null];
      const n = motif[b];
      if (n !== null) this._hit('lead', 220 * Math.pow(2, n / 12), beatLen * 1.8, 'triangle', 0.8);
      // stabs: on 1 and 7
      if (b === 0 || b === 6) this._hit('stabs', 110, 0.4, 'sawtooth', 0.9);
      this._nextBeatTime += beatLen;
      this._beat++;
    }
  }
}
