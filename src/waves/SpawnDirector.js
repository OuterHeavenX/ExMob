import { Vehicle } from '../entities/Vehicle.js';
import { EV } from '../core/Events.js';

/**
 * Executes group arrivals for the WaveDirector in the Three.js world: vehicles drive the
 * driveway and park (enemies step out beside the doors), foot groups emerge from treeline route
 * points. Enemies never materialize from nowhere.
 */
export class SpawnDirector {
  constructor(world, property) {
    this.world = world;
    this.property = property;
    this.vehicles = [];
    this.usedSlots = new Set();
  }

  arrive(group, wave, enqueue) {
    const route = this.property.routes[group.arrival.route];
    const flat = [];
    for (const e of group.enemies) for (let i = 0; i < e.count; i++) flat.push(e.type);
    if (group.arrival.type === 'vehicle') {
      let slot = route.slots[group.arrival.slot];
      if (this.usedSlots.has(group.arrival.slot)) {
        // slot occupied by a previous wave's car: park further down the driveway
        const free = Object.entries(route.slots).find(([k]) => !this.usedSlots.has(k));
        slot = free ? free[1] : { x: slot.x + 3.5, z: slot.z + 6, rot: slot.rot };
        if (free) this.usedSlots.add(free[0]);
      } else this.usedSlots.add(group.arrival.slot);
      const v = new Vehicle(this.world, { asset: group.arrival.vehicle || 'VEH_Sedan_A' });
      this.vehicles.push(v);
      v.drive(route.path, slot);
      const onParked = (e) => {
        if (e.vehicle !== v) return;
        off();
        const spots = v.doorPositions(flat.length);
        enqueue(flat.map((type, i) => ({ type, x: spots[i].x, z: spots[i].z, vehicle: v })));
        this.world.cinematics.vehicleArrived(v);
      };
      const off = this.world.events.on(EV.VEHICLE_PARKED, onParked);
      this.world.cinematics.vehicleApproaching(v);
    } else {
      const pts = route.points;
      enqueue(flat.map((type, i) => {
        const p = pts[i % pts.length];
        return { type, x: p.x + (Math.random() - 0.5) * 2.5, z: p.z + (Math.random() - 0.5) * 2.5 };
      }));
      this.world.events.emit(EV.TOAST, { text: `MOVEMENT: ${group.arrival.route.replace('_', ' ').toUpperCase()}` });
    }
  }

  spawnOne(entry) {
    const e = this.world.enemies.spawn(entry.type, entry.x, entry.z);
    this.world.events.emit(EV.ENEMY_SPAWN, { enemy: e });
    return e;
  }

  /** Remove arrival vehicles (chapter restart). The player's car is not managed here. */
  clearVehicles() {
    for (const v of this.vehicles) v.dispose();
    this.vehicles.length = 0;
    this.usedSlots.clear();
    // each dispose() removed its collider, which queues its area for an incremental re-bake
  }

  update(dt) { for (const v of this.vehicles) v.update(dt); }
}
