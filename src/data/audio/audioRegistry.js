/**
 * Audio registry. Buses and SFX recipes. SFX are currently synthesized (docs/DECISIONS.md ADR-007);
 * each recipe describes the synth so that a future file-based SFX can replace it by id without
 * touching callers.
 */
export const AUDIO_BUSES = Object.freeze([
  'MASTER', 'MUSIC', 'PLAYER_WEAPONS', 'ENEMY_WEAPONS', 'IMPACTS', 'ENVIRONMENT', 'UI', 'DIALOGUE', 'VEHICLES',
]);

export const SFX = Object.freeze({
  pistol_fire:    { bus: 'PLAYER_WEAPONS', synth: 'gunshot', body: 0.5, crack: 1.0, tail: 0.35, pitch: 1.0, gain: 0.9 },
  revolver_fire:  { bus: 'PLAYER_WEAPONS', synth: 'gunshot', body: 1.0, crack: 0.8, tail: 0.6, pitch: 0.7, gain: 1.0 },
  shotgun_fire:   { bus: 'PLAYER_WEAPONS', synth: 'gunshot', body: 1.3, crack: 0.6, tail: 0.7, pitch: 0.55, gain: 1.0 },
  smg_fire:       { bus: 'PLAYER_WEAPONS', synth: 'gunshot', body: 0.35, crack: 0.9, tail: 0.2, pitch: 1.15, gain: 0.7 },
  dry_fire:       { bus: 'PLAYER_WEAPONS', synth: 'click', gain: 0.5 },
  pistol_reload:  { bus: 'PLAYER_WEAPONS', synth: 'reload', steps: 2, gain: 0.5 },
  revolver_reload:{ bus: 'PLAYER_WEAPONS', synth: 'reload', steps: 3, gain: 0.5 },
  smg_reload:     { bus: 'PLAYER_WEAPONS', synth: 'reload', steps: 2, gain: 0.5 },
  shotgun_shell:  { bus: 'PLAYER_WEAPONS', synth: 'click', gain: 0.5, pitch: 0.8 },
  shotgun_pump:   { bus: 'PLAYER_WEAPONS', synth: 'pump', gain: 0.6 },
  melee_swing:    { bus: 'PLAYER_WEAPONS', synth: 'whoosh', gain: 0.7, pitch: 1.2 },
  melee_hit:      { bus: 'IMPACTS', synth: 'thud', gain: 1.0, pitch: 1.15 },
  impact_wood:    { bus: 'IMPACTS', synth: 'impact', tone: 'wood', gain: 0.5 },
  impact_metal:   { bus: 'IMPACTS', synth: 'impact', tone: 'metal', gain: 0.5 },
  impact_glass:   { bus: 'IMPACTS', synth: 'glass', gain: 0.8 },
  impact_flesh:   { bus: 'IMPACTS', synth: 'impact', tone: 'flesh', gain: 0.6 },
  impact_dirt:    { bus: 'IMPACTS', synth: 'impact', tone: 'dirt', gain: 0.35 },
  door_kick:      { bus: 'IMPACTS', synth: 'thud', gain: 0.9 },
  door_break:     { bus: 'IMPACTS', synth: 'break', gain: 1.0 },
  board_hit:      { bus: 'IMPACTS', synth: 'thud', gain: 0.6, pitch: 1.3 },
  door_open:      { bus: 'ENVIRONMENT', synth: 'creak', gain: 0.4 },
  prop_break:     { bus: 'IMPACTS', synth: 'break', gain: 0.7, pitch: 1.3 },
  engine_arrive:  { bus: 'VEHICLES', synth: 'engine', gain: 0.7 },
  car_door:       { bus: 'VEHICLES', synth: 'thud', gain: 0.5, pitch: 0.8 },
  cash_pickup:    { bus: 'UI', synth: 'cash', gain: 0.6 },
  ui_click:       { bus: 'UI', synth: 'click', gain: 0.35, pitch: 1.6 },
  ui_buy:         { bus: 'UI', synth: 'cash', gain: 0.6, pitch: 1.2 },
  ui_denied:      { bus: 'UI', synth: 'click', gain: 0.5, pitch: 0.5 },
  wave_banner:    { bus: 'UI', synth: 'hit', gain: 0.8 },
  phone_buzz:     { bus: 'ENVIRONMENT', synth: 'buzz', gain: 0.6 },
  player_hurt:    { bus: 'IMPACTS', synth: 'impact', tone: 'flesh', gain: 0.8, pitch: 0.8 },
  heartbeat:      { bus: 'ENVIRONMENT', synth: 'heartbeat', gain: 0.5 },
  dodge:          { bus: 'ENVIRONMENT', synth: 'whoosh', gain: 0.4 },
  enemy_death:    { bus: 'DIALOGUE', synth: 'grunt', gain: 0.5 },
});

export const MUSIC_STATES = Object.freeze({
  silence: { layers: [] },
  title: { layers: ['drone'] },
  prep: { layers: ['drone', 'pulse'] },
  combat_low: { layers: ['drone', 'pulse', 'rhythm'] },
  combat_mid: { layers: ['drone', 'pulse', 'rhythm', 'lead'] },
  combat_high: { layers: ['drone', 'pulse', 'rhythm', 'lead', 'stabs'] },
  gameover: { layers: ['drone'] },
});

export const AMBIENCE = Object.freeze({
  exterior: ['wind', 'insects'],
  interior: ['fridge_hum', 'creaks'],
});
