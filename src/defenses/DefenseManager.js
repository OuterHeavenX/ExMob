import * as THREE from 'three';
import { DEFENSES } from '../data/defenses/defenseRegistry.js';
import { EV } from '../core/Events.js';

/**
 * Property upgrades bought from the shop and kept between waves (docs/PROPERTY_SYSTEM.md).
 * Barricades and boards live on their own portals; this owns the two standing installations:
 *
 *  - TRIPWIRE ALARM: bells across the treeline. Adds `warningBonus` seconds to every warning
 *    phase and names the route the moment a group is dispatched, instead of when it arrives.
 *  - FLOODLIGHTS: two work lamps on opposite corners. Anyone inside a lit lamp's radius takes
 *    longer to line up a shot, and the lamps can be shot out, which is the counterplay.
 */
export class DefenseManager {
  constructor(world, data) {
    this.world = world;
    this.data = data;
    this.installed = new Set();
    this.lamps = [];
  }

  has(id) { return this.installed.has(id); }
  get warningBonus() { return this.has('alarm') ? DEFENSES.alarm.warningBonus : 0; }

  /** Install a defense. `silent` skips audio/toast (used when loading a save). */
  install(id, silent = false) {
    if (this.installed.has(id)) return false;
    const def = DEFENSES[id];
    if (!def || !def.implemented) return false;
    this.installed.add(id);
    if (id === 'exterior_lights') this._buildFloodlights();
    if (!silent) {
      this.world.ctx.audio.play(id === 'exterior_lights' ? 'floodlight_on' : 'alarm_trip');
      this.world.events.emit(EV.TOAST, { text: `${def.name} INSTALLED` });
    }
    this.world.events.emit(EV.DEFENSE_INSTALLED, { id, def });
    return true;
  }

  /**
   * Reaction-time multiplier for an enemy standing at (x,z). 1 = unaffected. Only lamps that are
   * still alight count, so shooting them out restores the attackers' reaction time.
   */
  dazzleMul(x, z) {
    if (!this.lamps.length) return 1;
    const def = DEFENSES.exterior_lights;
    for (const l of this.lamps) {
      if (l.hp <= 0) continue;
      if (Math.hypot(x - l.x, z - l.z) <= def.radius) return def.dazzleReactionMul;
    }
    return 1;
  }

  /** A bullet hit a lamp. Returns true when it was destroyed by this hit. */
  damageLamp(lampId, amount) {
    const l = this.lamps.find((n) => n.id === lampId);
    if (!l || l.hp <= 0) return false;
    l.hp -= amount;
    if (l.hp > 0) return false;
    l.light.visible = false;
    l.light.intensity = 0;
    l.bulb.material = this.world.builder.M.lampOff;
    this.world.ctx.audio.play('impact_glass', { x: l.x, z: l.z });
    this.world.events.emit(EV.DEFENSE_LOST, { id: 'exterior_lights', lamp: lampId });
    this.world.events.emit(EV.TOAST, { text: 'FLOODLIGHT SHOT OUT' });
    return true;
  }

  /** All lamps relit and repaired (between waves: the bulbs are cheap, the install was not). */
  resetLamps() {
    const def = DEFENSES.exterior_lights;
    for (const l of this.lamps) {
      l.hp = def.hp;
      l.light.visible = true;
      l.light.intensity = l.intensity;
      l.bulb.material = this.world.builder.M.lampShade;
    }
  }

  _buildFloodlights() {
    const mounts = this.data.exterior.floodlights || [];
    const scene = this.world.scene;
    for (const m of mounts) {
      const light = new THREE.SpotLight(0xdfe6ff, 130, DEFENSES.exterior_lights.radius + 6, Math.PI / 3.4, 0.6, 1.3);
      light.position.set(m.x, m.y, m.z);
      light.target.position.set(m.x + m.aim.x * 10, 0, m.z + m.aim.z * 10);
      scene.add(light, light.target);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.16), this.world.builder.M.lampShade);
      bulb.position.set(m.x, m.y, m.z);
      bulb.lookAt(m.x + m.aim.x, m.y - 0.4, m.z + m.aim.z);
      scene.add(bulb);
      const box = this.world.colliders.add({
        minX: m.x - 0.2, maxX: m.x + 0.2, minZ: m.z - 0.2, maxZ: m.z + 0.2,
        kind: 'floodlight', walk: false, bullets: true, los: false, surface: 'metal',
        floodlight: m.id, height: m.y + 0.2,
      });
      this.lamps.push({ id: m.id, x: m.x, z: m.z, hp: DEFENSES.exterior_lights.hp, light, bulb, box, intensity: 130 });
    }
  }

  /** Ids to persist in the save (`property.upgrades`). */
  toSave() { return Array.from(this.installed); }

  fromSave(ids = []) { for (const id of ids) this.install(id, true); }
}
