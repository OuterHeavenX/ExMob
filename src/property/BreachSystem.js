/**
 * Mediates enemy attacks on portals. An enemy in BREACH calls `hit(enemy, portalId)` on its
 * breach interval. Returns true when the portal is now passable.
 */
export class BreachSystem {
  constructor(pm) { this.pm = pm; }

  isPassable(portalId) {
    const p = this.pm.portals.get(portalId);
    if (!p) return true;
    if (p.barricadeHp > 0) return false; // a barricade beats whatever is behind it
    if (p.kind === 'door') return p.state !== 'closed';
    return p.state === 'shattered';
  }

  /** Where an enemy should stand to breach a portal (outside the property). */
  standPoint(portalId, fromX, fromZ) {
    const p = this.pm.portals.get(portalId);
    if (!p) return null;
    const inside = this.pm.isInside(fromX, fromZ);
    const side = inside ? -1 : 1;
    // interior doors: choose the side the enemy is on
    if (!p.exterior) {
      const dx = fromX - p.x, dz = fromZ - p.z;
      const dot = dx * p.facing.x + dz * p.facing.z;
      const s = dot >= 0 ? 1 : -1;
      return { x: p.x + p.facing.x * 0.7 * s, z: p.z + p.facing.z * 0.7 * s };
    }
    return { x: p.x + p.facing.x * 0.75 * side, z: p.z + p.facing.z * 0.75 * side };
  }

  /** Point on the far side of the portal (used for ENTER_BUILDING). */
  throughPoint(portalId, fromX, fromZ) {
    const p = this.pm.portals.get(portalId);
    if (!p) return null;
    const dx = fromX - p.x, dz = fromZ - p.z;
    const dot = dx * p.facing.x + dz * p.facing.z;
    const s = dot >= 0 ? -1 : 1;
    return { x: p.x + p.facing.x * 0.9 * s, z: p.z + p.facing.z * 0.9 * s };
  }

  hit(enemy, portalId) {
    const p = this.pm.portals.get(portalId);
    if (!p) return true;
    if (this.isPassable(portalId)) return true;
    const dmg = enemy.def.profile.breachDamage;
    this.pm.damagePortal(portalId, dmg, 'breach', { x: p.x, y: 1.0, z: p.z });
    return this.isPassable(portalId);
  }

  /** What an enemy is currently chewing through, for HUD/bark purposes. */
  layerOf(portalId) {
    const p = this.pm.portals.get(portalId);
    if (!p) return null;
    if (p.barricadeHp > 0) return 'barricade';
    if (p.kind === 'window' && p.state === 'boarded') return 'boards';
    return p.kind;
  }
}
