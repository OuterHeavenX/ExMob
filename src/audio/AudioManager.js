import { AUDIO_BUSES, SFX } from '../data/audio/audioRegistry.js';
import { SYNTHS } from './SynthSFX.js';
import { MusicDirector } from './MusicDirector.js';
import { clamp } from '../utils/math.js';

/**
 * Web Audio bus graph: MASTER <- MUSIC, PLAYER_WEAPONS, ENEMY_WEAPONS, IMPACTS, ENVIRONMENT, UI,
 * DIALOGUE, VEHICLES. Positional SFX use a cheap listener-relative pan + distance attenuation.
 * The context unlocks on the first user gesture.
 */
export class AudioManager {
  constructor(settings) {
    this.ctx = null;
    this.buses = {};
    this.settings = settings;
    this.listener = { x: 0, z: 0 };
    this.music = null;
    this.unlocked = false;
    this._ambience = [];
    this._pendingUnlock = () => this.unlock();
    window.addEventListener('pointerdown', this._pendingUnlock, { once: true });
    window.addEventListener('keydown', this._pendingUnlock, { once: true });
    this.maxVoices = 24;
    this._voices = 0;
  }

  unlock() {
    if (this.unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const master = this.ctx.createGain();
      master.connect(this.ctx.destination);
      this.buses.MASTER = master;
      for (const b of AUDIO_BUSES) {
        if (b === 'MASTER') continue;
        const g = this.ctx.createGain();
        g.connect(master);
        this.buses[b] = g;
      }
      this.music = new MusicDirector(this.ctx, this.buses.MUSIC);
      this.applySettings(this.settings);
      this.unlocked = true;
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { console.warn('[Audio] unlock failed', e); }
  }

  applySettings(s) {
    this.settings = s;
    if (!this.ctx) return;
    this.buses.MASTER.gain.value = s.masterVolume;
    this.buses.MUSIC.gain.value = s.musicVolume;
    for (const b of ['PLAYER_WEAPONS', 'ENEMY_WEAPONS', 'IMPACTS', 'ENVIRONMENT', 'UI', 'DIALOGUE', 'VEHICLES']) this.buses[b].gain.value = s.sfxVolume;
  }

  setListener(x, z) { this.listener.x = x; this.listener.z = z; }

  /**
   * Play an SFX by registry id. opts: { x, z, gain, pitch, bus }.
   * Position enables pan and distance attenuation.
   */
  play(id, opts = {}) {
    if (!this.ctx) return;
    const def = SFX[id];
    if (!def) { console.warn('[Audio] unknown sfx', id); return; }
    const synth = SYNTHS[def.synth];
    if (!synth) return;
    if (this._voices > this.maxVoices) return;
    let gain = (def.gain ?? 1) * (opts.gain ?? 1);
    let pan = 0;
    if (typeof opts.x === 'number') {
      const dx = opts.x - this.listener.x;
      const dz = opts.z - this.listener.z;
      const d = Math.hypot(dx, dz);
      const att = 1 / (1 + Math.pow(d / 12, 2));
      gain *= att;
      if (gain < 0.01) return;
      pan = clamp(dx / 14, -0.8, 0.8);
    }
    const bus = this.buses[opts.bus || def.bus] || this.buses.MASTER;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    let out = g;
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(bus);
    } else g.connect(bus);
    this._voices++;
    setTimeout(() => { this._voices--; try { g.disconnect(); } catch { /* ignore */ } }, 2500);
    synth(this.ctx, out, this.ctx.currentTime, { ...def, pitch: (def.pitch || 1) * (opts.pitch || 1), gain: 1 });
  }

  /** Looping filtered noise for wind / hum. Returns a handle with setGain(). */
  startAmbience(kind) {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    if (kind === 'wind') { f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0.16; }
    else if (kind === 'fridge_hum') { f.type = 'bandpass'; f.frequency.value = 120; f.Q.value = 8; g.gain.value = 0.05; }
    else { f.type = 'bandpass'; f.frequency.value = 4000; f.Q.value = 12; g.gain.value = 0.02; }
    // slow LFO on wind
    if (kind === 'wind') {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 0.08;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start();
    }
    src.connect(f); f.connect(g); g.connect(this.buses.ENVIRONMENT);
    src.start();
    const handle = { src, gain: g, setGain: (v) => { g.gain.setTargetAtTime(v, ctx.currentTime, 0.5); }, stop: () => { try { src.stop(); } catch { /* ignore */ } } };
    this._ambience.push(handle);
    return handle;
  }

  stopAllAmbience() {
    for (const a of this._ambience) a.stop();
    this._ambience.length = 0;
  }

  setMusicState(state) { if (this.music) this.music.setState(state); }

  update(dt) { if (this.music) this.music.update(dt); }
}
