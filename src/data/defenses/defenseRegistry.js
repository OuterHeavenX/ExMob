/**
 * Defense registry. See docs/PROPERTY_SYSTEM.md.
 * Only entries with `chapter: 1` are implemented in the Cabin. The rest are documented data.
 */
export const DEFENSES = Object.freeze({
  boards: { id: 'boards', name: 'WINDOW BOARDS', chapter: 1, implemented: true, hp: 90, blocksLOS: true, desc: 'Nail boards over a window. Slows anyone trying to climb in.' },
  door_repair: { id: 'door_repair', name: 'DOOR REPAIR', chapter: 1, implemented: true, desc: 'Rehang a broken door.' },
  barricade: { id: 'barricade', name: 'BARRICADE', chapter: 2, implemented: false, hp: 220, blocksLOS: true, desc: 'Furniture against a door or window.' },
  reinforced_door: { id: 'reinforced_door', name: 'REINFORCED DOOR', chapter: 2, implemented: false, hpMul: 2.5, desc: 'Steel-backed door. Takes longer to breach.' },
  alarm: { id: 'alarm', name: 'ALARM SYSTEM', chapter: 2, implemented: false, warningBonus: 6, desc: 'Earlier warning of incoming attacks.' },
  exterior_lights: { id: 'exterior_lights', name: 'EXTERIOR LIGHTING', chapter: 2, implemented: false, desc: 'Expose attackers in the dark.' },
  guard_dog: { id: 'guard_dog', name: 'GUARD DOG', chapter: 2, implemented: false, desc: 'Defends an assigned zone.' },
  motion_detectors: { id: 'motion_detectors', name: 'MOTION DETECTORS', chapter: 2, implemented: false, desc: 'Reveal a specific approach route.' },
  shutters: { id: 'shutters', name: 'WINDOW SHUTTERS', chapter: 3, implemented: false, hp: 300, desc: 'Temporary hard protection for windows.' },
  cameras: { id: 'cameras', name: 'SECURITY CAMERAS', chapter: 3, implemented: false, desc: 'Reveal approaching enemies.' },
  gun_cabinet: { id: 'gun_cabinet', name: 'GUN CABINET', chapter: 3, implemented: false, desc: 'Ammo and weapon access during combat.' },
  med_cabinet: { id: 'med_cabinet', name: 'MEDICAL CABINET', chapter: 3, implemented: false, desc: 'Healing during combat.' },
  safe_room: { id: 'safe_room', name: 'SAFE ROOM', chapter: 4, implemented: false, desc: 'Fallback defensive position.' },
  hired_muscle: { id: 'hired_muscle', name: 'HIRED MUSCLE', chapter: 4, implemented: false, desc: 'AI defender.' },
  reinforced_garage: { id: 'reinforced_garage', name: 'REINFORCED GARAGE', chapter: 4, implemented: false, desc: 'Protect vehicle/property access.' },
  gates: { id: 'gates', name: 'GATES', chapter: 5, implemented: false, desc: 'Delay vehicles and enemies.' },
  private_security: { id: 'private_security', name: 'PRIVATE SECURITY', chapter: 5, implemented: false, desc: 'Late-game defensive personnel.' },
  traps: { id: 'traps', name: 'IMPROVISED TRAPS', chapter: 3, implemented: false, desc: 'Setting-appropriate, limited.' },
});
