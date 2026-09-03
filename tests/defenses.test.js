import { describe, it, expect } from 'vitest';
import { ColliderSet } from '../src/world/Colliders.js';
import { NavGrid } from '../src/ai/NavGrid.js';
import { DEFENSES } from '../src/data/defenses/defenseRegistry.js';
import { ENEMIES } from '../src/data/enemies/enemyRegistry.js';
import { ECONOMY } from '../src/data/economy/economyRegistry.js';
import { WORLD_PURCHASES, SHOP_ITEMS } from '../src/data/upgrades/shopItems.js';
import { HAZARDS } from '../src/data/hazards/hazardRegistry.js';
import { PropertyManager } from '../src/property/PropertyManager.js';

/**
 * A property manager over a two-portal stub. No Three.js: portal visuals are plain objects with
 * the fields the systems actually touch, so the barricade layer can be exercised in node.
 */
function makeProperty() {
  const colliders = new ColliderSet();
  const mkVis = (box) => ({ box, paneBox: box, barricade: { visible: false }, group: { userData: {}, rotation: { set() {} }, position: {} }, door: {}, knob: {}, stub: {}, pane: {}, boards: {}, shards: {}, sillBox: box });
  const doorBox = colliders.add(ColliderSet.box(0, 4, 1, 0.2, { kind: 'door', walk: true, portal: 'door_front' }));
  const winBox = colliders.add(ColliderSet.box(-3.5, 4, 1.2, 0.2, { kind: 'pane', walk: false, portal: 'win_s' }));
  const data = {
    bounds: { minX: -6, maxX: 6, minZ: -4, maxZ: 4 },
    rooms: [{ id: 'living', minX: -6, maxX: 6, minZ: -4, maxZ: 4 }],
    portals: {
      door_front: { id: 'door_front', kind: 'door', name: 'FRONT DOOR', x: 0, z: 4, axis: 'x', facing: { x: 0, z: 1 }, hp: 150, exterior: true, room: 'living', hinge: -1 },
      win_s: { id: 'win_s', kind: 'window', name: 'WINDOW', x: -3.5, z: 4, axis: 'x', facing: { x: 0, z: 1 }, hp: 1, boardHp: 90, exterior: true, room: 'living' },
    },
    props: [],
  };
  const builder = { colliders, portalVisuals: { door_front: mkVis(doorBox), win_s: mkVis(winBox) }, propVisuals: {}, groundHeight: () => 0, M: {} };
  const audio = { played: [], play(id) { this.played.push(id); } };
  const ctx = { events: { emit() {}, on: () => () => {} }, audio, camera: { shake() {} } };
  return new PropertyManager(data, builder, ctx, { lighting: {} });
}

describe('barricades', () => {
  it('stands on top of a portal instead of replacing its state', () => {
    const pm = makeProperty();
    const door = pm.portals.get('door_front');
    expect(door.state).toBe('closed');
    pm.barricades.place(door);
    expect(door.barricadeHp).toBe(DEFENSES.barricade.hp);
    expect(door.state).toBe('closed'); // untouched
    expect(door.vis.barricade.visible).toBe(true);
    expect(pm.breach.isPassable('door_front')).toBe(false);
  });

  it('blocks an open door and survives the door being broken', () => {
    const pm = makeProperty();
    const door = pm.portals.get('door_front');
    pm.doors.setState(door, 'open');
    pm.barricades.place(door);
    expect(pm.breach.isPassable('door_front')).toBe(false);
    pm.doors.setState(door, 'broken', 0);
    expect(door.barricadeHp).toBe(DEFENSES.barricade.hp);
    expect(pm.breach.isPassable('door_front')).toBe(false);
  });

  it('takes the damage before whatever is behind it, then hands over', () => {
    const pm = makeProperty();
    const door = pm.portals.get('door_front');
    pm.barricades.place(door);
    const hp0 = door.hp;
    pm.damagePortal('door_front', 100, 'breach');
    expect(door.hp).toBe(hp0);                       // the door has not been touched yet
    expect(door.barricadeHp).toBe(DEFENSES.barricade.hp - 100);
    pm.damagePortal('door_front', 200, 'breach');    // over-kills the barricade
    expect(door.barricadeHp).toBe(0);
    expect(door.hp).toBe(hp0);                       // no damage carries over into the door
    pm.damagePortal('door_front', 50, 'breach');
    expect(door.hp).toBe(hp0 - 50);
  });

  it('adds and removes exactly one collider, and only dirties that opening', () => {
    const pm = makeProperty();
    const door = pm.portals.get('door_front');
    const n = pm.colliders.boxes.length;
    pm.colliders.takeDirty();
    pm.barricades.place(door);
    expect(pm.colliders.boxes.length).toBe(n + 1);
    let dirty = pm.colliders.takeDirty();
    expect(dirty.full).toBe(false);
    expect(dirty.rects.length).toBe(1);
    pm.barricades.destroy(door);
    expect(pm.colliders.boxes.length).toBe(n);
    dirty = pm.colliders.takeDirty();
    expect(dirty.full).toBe(false);
    expect(dirty.rects.length).toBe(1);
  });

  it('re-bakes only the cells around the opening, never the whole grid', () => {
    const pm = makeProperty();
    const grid = new NavGrid({ minX: -12, maxX: 12, minZ: -12, maxZ: 12, cell: 0.5 }, pm.colliders, pm.portals);
    const full = grid.walk.length;
    pm.barricades.place(pm.portals.get('door_front'));
    const cells = grid.applyDirty(pm.colliders);
    expect(cells).toBeGreaterThan(0);
    expect(cells).toBeLessThan(full / 20);
  });

  it('survives a snapshot and restore', () => {
    const pm = makeProperty();
    pm.barricades.place(pm.portals.get('door_front'));
    pm.damagePortal('door_front', 90, 'breach');
    const snap = pm.snapshot();
    pm.barricades.destroy(pm.portals.get('door_front'));
    expect(pm.portals.get('door_front').barricadeHp).toBe(0);
    pm.restore(snap);
    expect(pm.portals.get('door_front').barricadeHp).toBe(DEFENSES.barricade.hp - 90);
    expect(pm.portals.get('door_front').barricadeBox).toBeTruthy();
  });
});

describe('portal cost with a barricade', () => {
  const pm = makeProperty();
  const generic = ENEMIES.goon.profile;
  const specialist = ENEMIES.breacher.profile;

  it('deters a normal attacker and attracts the breacher', () => {
    const door = pm.portals.get('door_front');
    const before = pm.portalCost('door_front', generic);
    pm.barricades.place(door);
    expect(pm.portalCost('door_front', generic)).toBeGreaterThan(before);
    expect(pm.portalCost('door_front', specialist)).toBeLessThan(pm.portalCost('door_front', generic));
    pm.barricades.destroy(door);
  });

  it('shuts out anyone who cannot breach doors at all', () => {
    const door = pm.portals.get('door_front');
    pm.barricades.place(door);
    expect(pm.portalCost('door_front', ENEMIES.sniper.profile)).toBe(Infinity);
    pm.barricades.destroy(door);
  });
});

describe('interaction offers', () => {
  it('offers boards first and a barricade only once the window is boarded', () => {
    const pm = makeProperty();
    expect(pm.interactableNear(-3.5, 3.2, 'prep').type).toBe('board');
    pm.windows.board(pm.portals.get('win_s'));
    expect(pm.interactableNear(-3.5, 3.2, 'prep').type).toBe('barricade');
  });

  it('keeps a door usable during prep, with the barricade on the hold', () => {
    const pm = makeProperty();
    const it = pm.interactableNear(0, 3.2, 'prep');
    expect(it.type).toBe('open');
    expect(it.holdType).toBe('barricade');
    // outside prep there is nothing to buy, only the door itself
    expect(pm.interactableNear(0, 3.2, 'active').holdType).toBeUndefined();
  });

  it('offers nothing at an already barricaded opening', () => {
    const pm = makeProperty();
    pm.barricades.place(pm.portals.get('door_front'));
    expect(pm.interactableNear(0, 3.2, 'prep')).toBeNull();
  });
});

describe('defense registry and pricing', () => {
  it('marks exactly the Chapter 1 defenses as implemented', () => {
    const impl = Object.values(DEFENSES).filter((d) => d.implemented).map((d) => d.id).sort();
    expect(impl).toEqual(['alarm', 'barricade', 'boards', 'door_repair', 'exterior_lights']);
    for (const d of Object.values(DEFENSES)) {
      if (d.implemented) expect(d.chapter).toBe(1);
      else expect(d.chapter).toBeGreaterThan(1);
    }
  });

  it('prices a barricade above the boards it backs up', () => {
    expect(ECONOMY.costs.barricade).toBeGreaterThan(ECONOMY.costs.windowBoards);
    expect(WORLD_PURCHASES.barricade.price).toBe(ECONOMY.costs.barricade);
    expect(WORLD_PURCHASES.barricade.holdTime).toBeGreaterThan(WORLD_PURCHASES.window_boards.holdTime);
  });

  it('sells the two standing installations once each', () => {
    const defenseItems = SHOP_ITEMS.filter((i) => i.action.type === 'defense');
    expect(defenseItems.map((i) => i.action.defense).sort()).toEqual(['alarm', 'exterior_lights']);
    for (const i of defenseItems) expect(DEFENSES[i.action.defense].permanent).toBe(true);
  });
});

describe('fire', () => {
  it('is survivable for a moment and fatal if ignored', () => {
    const f = HAZARDS.fire;
    expect(f.playerDamagePerSec * f.tickInterval).toBeLessThan(10); // one tick never spikes
    expect(f.playerDamagePerSec * f.life).toBeGreaterThan(100);     // a whole pool kills
    expect(f.enemyDamagePerSec).toBeGreaterThan(0);                 // it is not friendly fire
  });

  it('pushes AI out faster than the pool is wide', () => {
    // repulsion is m/s; it has to clear the radius well inside the pool's life
    expect(HAZARDS.fire.repulsion).toBeGreaterThan(HAZARDS.fire.radius / 2);
  });
});
