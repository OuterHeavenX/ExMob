/**
 * Chapter 1 property: THE CABIN. See docs/CABIN_VERTICAL_SLICE.md.
 * Coordinates in meters. +x east, +z south (toward the camera / driveway), +y up.
 * Cabin center is the origin. This file is the single source of truth for dimensions;
 * the Blender generator scripts read the same module sizes (docs/DECISIONS.md ADR-012).
 */
export const CABIN = Object.freeze({
  id: 'cabin',
  name: 'THE CABIN',
  chapter: 1,
  module: { wallHeight: 2.8, wallThickness: 0.2, windowSill: 0.9, windowHeight: 1.2, windowWidth: 1.2, doorWidth: 1.0, doorHeight: 2.1 },
  bounds: { minX: -6, maxX: 6, minZ: -4, maxZ: 4 },
  playerStart: { x: -3.2, z: 2.2, facing: Math.PI },
  camera: { pitchDeg: 56, height: 13.5, back: 8.5, lookAhead: 2.4, fov: 42 },

  rooms: Object.freeze([
    { id: 'living', name: 'LIVING ROOM', minX: -6, maxX: 1, minZ: 0, maxZ: 4 },
    { id: 'kitchen', name: 'KITCHEN', minX: 1, maxX: 6, minZ: 0, maxZ: 4 },
    { id: 'hall', name: 'HALLWAY', minX: -1, maxX: 1, minZ: -4, maxZ: 0 },
    { id: 'bedroom', name: 'BEDROOM', minX: -6, maxX: -1, minZ: -4, maxZ: 0 },
    { id: 'bathroom', name: 'BATHROOM', minX: 1, maxX: 6, minZ: -4, maxZ: 0 },
  ]),

  /**
   * Walls are centerlines with openings. `along` is the distance from (x1,z1) to the opening center.
   * Opening types: door (portal), window (portal), open (plain doorway, no portal).
   */
  walls: Object.freeze([
    // exterior
    { id: 'south', x1: -6, z1: 4, x2: 6, z2: 4, exterior: true, openings: [
      { type: 'window', portal: 'win_living_s', along: 2.5 },
      { type: 'door', portal: 'door_front', along: 5.0 },
    ] },
    { id: 'north', x1: -6, z1: -4, x2: 6, z2: -4, exterior: true, openings: [
      { type: 'window', portal: 'win_bedroom_n', along: 2.5 },
      { type: 'door', portal: 'door_back', along: 6.0 },
    ] },
    { id: 'west', x1: -6, z1: -4, x2: -6, z2: 4, exterior: true, openings: [
      { type: 'window', portal: 'win_bedroom_w', along: 2.0 },
      { type: 'window', portal: 'win_living_w', along: 6.0 },
    ] },
    { id: 'east', x1: 6, z1: -4, x2: 6, z2: 4, exterior: true, openings: [
      { type: 'window', portal: 'win_bathroom_e', along: 2.0 },
      { type: 'window', portal: 'win_kitchen_e', along: 6.0 },
    ] },
    // interior
    { id: 'mid', x1: -6, z1: 0, x2: 6, z2: 0, exterior: false, openings: [
      { type: 'open', along: 6.0, width: 2.0 }, // hallway mouth from the great room
    ] },
    { id: 'hall_w', x1: -1, z1: -4, x2: -1, z2: 0, exterior: false, openings: [
      { type: 'door', portal: 'door_bedroom', along: 2.0 },
    ] },
    { id: 'hall_e', x1: 1, z1: -4, x2: 1, z2: 0, exterior: false, openings: [
      { type: 'open', along: 2.0, width: 1.0 },
    ] },
    { id: 'kitchen_stub_s', x1: 1, z1: 4, x2: 1, z2: 3.2, exterior: false, openings: [] },
    { id: 'kitchen_stub_n', x1: 1, z1: 0, x2: 1, z2: 0.8, exterior: false, openings: [] },
  ]),

  /** Portals: doors and windows. `facing` is the outward normal for exterior portals. */
  portals: Object.freeze({
    door_front: { id: 'door_front', kind: 'door', name: 'FRONT DOOR', x: -1.0, z: 4, axis: 'x', facing: { x: 0, z: 1 }, hp: 150, exterior: true, room: 'living', hinge: -1 },
    door_back: { id: 'door_back', kind: 'door', name: 'BACK DOOR', x: 0.0, z: -4, axis: 'x', facing: { x: 0, z: -1 }, hp: 130, exterior: true, room: 'hall', hinge: 1 },
    door_bedroom: { id: 'door_bedroom', kind: 'door', name: 'BEDROOM DOOR', x: -1, z: -2, axis: 'z', facing: { x: 1, z: 0 }, hp: 80, exterior: false, room: 'bedroom', hinge: -1 },
    win_living_s: { id: 'win_living_s', kind: 'window', name: 'LIVING ROOM WINDOW (S)', x: -3.5, z: 4, axis: 'x', facing: { x: 0, z: 1 }, hp: 1, boardHp: 90, exterior: true, room: 'living' },
    win_living_w: { id: 'win_living_w', kind: 'window', name: 'LIVING ROOM WINDOW (W)', x: -6, z: 2, axis: 'z', facing: { x: -1, z: 0 }, hp: 1, boardHp: 90, exterior: true, room: 'living' },
    win_kitchen_e: { id: 'win_kitchen_e', kind: 'window', name: 'KITCHEN WINDOW', x: 6, z: 2, axis: 'z', facing: { x: 1, z: 0 }, hp: 1, boardHp: 90, exterior: true, room: 'kitchen' },
    win_bedroom_w: { id: 'win_bedroom_w', kind: 'window', name: 'BEDROOM WINDOW (W)', x: -6, z: -2, axis: 'z', facing: { x: -1, z: 0 }, hp: 1, boardHp: 90, exterior: true, room: 'bedroom' },
    win_bedroom_n: { id: 'win_bedroom_n', kind: 'window', name: 'BEDROOM WINDOW (N)', x: -3.5, z: -4, axis: 'x', facing: { x: 0, z: -1 }, hp: 1, boardHp: 90, exterior: true, room: 'bedroom' },
    win_bathroom_e: { id: 'win_bathroom_e', kind: 'window', name: 'BATHROOM WINDOW', x: 6, z: -2, axis: 'z', facing: { x: 1, z: 0 }, hp: 1, boardHp: 90, exterior: true, room: 'bathroom' },
  }),

  /** Furniture/props: id, asset, position, rotation (rad), collider size (x,z), hp (0 = indestructible), light. */
  props: Object.freeze([
    { id: 'couch', asset: 'PRP_Couch_A', x: -3.5, z: 1.0, rot: 0, size: { x: 2.2, z: 0.9 }, hp: 0, cover: true },
    { id: 'coffee_table', asset: 'PRP_Table_Coffee_A', x: -3.5, z: 2.4, rot: 0, size: { x: 1.2, z: 0.6 }, hp: 40 },
    { id: 'armchair', asset: 'PRP_Chair_Arm_A', x: -5.3, z: 2.6, rot: Math.PI / 2, size: { x: 0.8, z: 0.8 }, hp: 50 },
    { id: 'dining_table', asset: 'PRP_Table_A', x: 0.0, z: 2.6, rot: 0, size: { x: 1.4, z: 0.9 }, hp: 60, story: true },
    { id: 'chair_a', asset: 'PRP_Chair_A', x: -0.5, z: 3.4, rot: 0, size: { x: 0.45, z: 0.45 }, hp: 25 },
    { id: 'chair_b', asset: 'PRP_Chair_A', x: 0.5, z: 1.8, rot: Math.PI, size: { x: 0.45, z: 0.45 }, hp: 25 },
    { id: 'floor_lamp', asset: 'PRP_Lamp_Floor_A', x: -5.4, z: 0.6, rot: 0, size: { x: 0.35, z: 0.35 }, hp: 15, light: { color: 0xffb46a, intensity: 45, distance: 8, y: 1.6 } },
    { id: 'shelf', asset: 'PRP_Shelf_A', x: -1.6, z: 0.4, rot: 0, size: { x: 1.2, z: 0.35 }, hp: 45 },
    { id: 'tv', asset: 'PRP_TV_A', x: -3.5, z: 3.6, rot: Math.PI, size: { x: 1.0, z: 0.4 }, hp: 20 },
    { id: 'counter', asset: 'PRP_Counter_A', x: 3.5, z: 3.5, rot: 0, size: { x: 3.0, z: 0.7 }, hp: 0, cover: true },
    { id: 'island', asset: 'PRP_Counter_A', x: 3.5, z: 1.4, rot: 0, size: { x: 2.0, z: 0.7 }, hp: 0, cover: true },
    { id: 'fridge', asset: 'PRP_Fridge_A', x: 5.5, z: 3.4, rot: -Math.PI / 2, size: { x: 0.8, z: 0.8 }, hp: 0, cover: true },
    { id: 'cabinet', asset: 'PRP_Cabinet_A', x: 5.6, z: 0.6, rot: -Math.PI / 2, size: { x: 0.5, z: 1.0 }, hp: 50 },
    { id: 'kitchen_lamp', asset: 'PRP_Lamp_Ceiling_A', x: 3.5, z: 2.4, rot: 0, size: null, hp: 12, light: { color: 0xffc98a, intensity: 60, distance: 9, y: 2.5 } },
    { id: 'bed', asset: 'PRP_Bed_A', x: -4.2, z: -2.4, rot: 0, size: { x: 1.6, z: 2.0 }, hp: 0, cover: true },
    { id: 'nightstand', asset: 'PRP_Nightstand_A', x: -2.6, z: -3.4, rot: 0, size: { x: 0.5, z: 0.5 }, hp: 20, light: { color: 0xffa860, intensity: 28, distance: 6, y: 0.9 } },
    { id: 'dresser', asset: 'PRP_Cabinet_A', x: -1.6, z: -0.6, rot: Math.PI, size: { x: 1.0, z: 0.5 }, hp: 60 },
    { id: 'suitcase', asset: 'PRP_Suitcase_A', x: -5.4, z: -0.6, rot: 0.3, size: { x: 0.6, z: 0.3 }, hp: 0, story: true },
    { id: 'toilet', asset: 'PRP_Toilet_A', x: 5.4, z: -3.4, rot: -Math.PI / 2, size: { x: 0.5, z: 0.7 }, hp: 0 },
    { id: 'sink', asset: 'PRP_Sink_A', x: 5.5, z: -1.0, rot: -Math.PI / 2, size: { x: 0.5, z: 0.6 }, hp: 30 },
    { id: 'tub', asset: 'PRP_Tub_A', x: 2.2, z: -3.2, rot: 0, size: { x: 1.7, z: 0.8 }, hp: 0, cover: true },
    { id: 'hall_lamp', asset: 'PRP_Lamp_Ceiling_A', x: 0, z: -2, rot: 0, size: null, hp: 12, light: { color: 0xffc27a, intensity: 32, distance: 7, y: 2.5 } },
    { id: 'living_lamp', asset: 'PRP_Lamp_Ceiling_A', x: -3, z: 2, rot: 0, size: null, hp: 12, light: { color: 0xffbd78, intensity: 70, distance: 10, y: 2.5 } },
  ]),

  exterior: Object.freeze({
    porch: { minX: -3, maxX: 1.2, minZ: 4.2, maxZ: 6.4, height: 0.3, light: { x: -1.0, z: 4.35, y: 2.5, color: 0xffc070, intensity: 140, distance: 14 } },
    driveway: { x: 0, fromZ: 6.5, toZ: 46, width: 4.2 },
    playerCar: { asset: 'VEH_Sedan_A', x: 5.2, z: 8.6, rot: 0.35, size: { x: 2.0, z: 4.6 }, cover: true },
    /** Where the purchasable floodlights mount (docs/PROPERTY_SYSTEM.md, Defenses). */
    floodlights: [
      { id: 'flood_sw', x: -6.3, z: 4.3, y: 2.6, aim: { x: -0.6, z: 0.8 } },
      { id: 'flood_ne', x: 6.3, z: -4.3, y: 2.6, aim: { x: 0.6, z: -0.8 } },
    ],
    clearingRadius: 15,
    treeRing: { inner: 15, outer: 40, count: 260 },
    rocks: { count: 40, radius: 30 },
  }),

  /** Spawn routes. Vehicles drive `path` and park in `slots`. Foot routes use `points`. */
  routes: Object.freeze({
    driveway: {
      type: 'vehicle',
      path: [{ x: 0, z: 46 }, { x: 0.5, z: 30 }, { x: 0, z: 18 }],
      slots: {
        A: { x: -2.4, z: 13.5, rot: 0.15 },
        B: { x: 2.6, z: 16.5, rot: -0.2 },
        C: { x: -1.2, z: 21, rot: 0.05 },
      },
    },
    west_trees: { type: 'foot', points: [{ x: -17, z: 6 }, { x: -18, z: -2 }, { x: -16, z: 11 }] },
    east_trees: { type: 'foot', points: [{ x: 17, z: 5 }, { x: 18, z: -3 }, { x: 16, z: 11 }] },
    rear_trees: { type: 'foot', points: [{ x: -4, z: -17 }, { x: 3, z: -18 }, { x: 0, z: -16 }] },
  }),

  /** Hand-placed cover nodes (in addition to auto-generated ones). */
  coverNodes: Object.freeze([
    { x: -4.2, z: 6.2 }, { x: 2.6, z: 6.0 },        // porch corners
    { x: -8.5, z: 1.5 }, { x: 8.5, z: 1.5 },         // wall ends outside
    { x: -3.5, z: 0.2 }, { x: 3.5, z: 0.6 },         // behind couch / island (inside)
  ]),

  /** Story dressing (environmental storytelling), small props without colliders. */
  storyProps: Object.freeze([
    { id: 'clipping', asset: 'PRP_Paper_A', x: -0.3, z: 2.5, y: 0.76, rot: 0.4 },
    { id: 'coffee_can', asset: 'PRP_Can_A', x: 3.2, z: 3.5, y: 0.92, rot: 0 },
    { id: 'burner_phone', asset: 'PRP_Phone_A', x: 0.3, z: 2.7, y: 0.76, rot: -0.3, emissive: true },
    { id: 'photo', asset: 'PRP_Photo_A', x: -2.6, z: -3.4, y: 0.66, rot: 0.2 },
    { id: 'mail', asset: 'PRP_Paper_A', x: -1.6, z: 0.4, y: 1.0, rot: 1.2 },
    { id: 'map', asset: 'PRP_Paper_A', x: -1.6, z: -0.6, y: 0.9, rot: 2.0 },
  ]),

  navGrid: { minX: -24, maxX: 24, minZ: -24, maxZ: 50, cell: 0.5 },
});
