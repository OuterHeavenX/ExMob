import * as THREE from 'three';
import { getMaterials } from './Materials.js';

/**
 * Procedural fallback meshes for props when a GLB is not available. Every asset name used in
 * src/data/properties/cabin.js has a builder here so the scene never shows a missing object.
 * These are deliberately simple but proportioned (docs/ART_DIRECTION.md).
 */
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export const PROP_HEIGHTS = {
  PRP_Fridge_A: 1.8, PRP_Cabinet_A: 1.6, PRP_Shelf_A: 1.8, PRP_Counter_A: 0.92, PRP_Couch_A: 0.85, PRP_Bed_A: 0.6,
  PRP_Table_A: 0.76, PRP_Table_Coffee_A: 0.45, PRP_Chair_A: 0.9, PRP_Chair_Arm_A: 0.9, PRP_Lamp_Floor_A: 1.7,
  PRP_TV_A: 0.8, PRP_Nightstand_A: 0.6, PRP_Suitcase_A: 0.35, PRP_Toilet_A: 0.75, PRP_Sink_A: 0.85, PRP_Tub_A: 0.55,
};

export function buildProp(asset) {
  const M = getMaterials();
  const g = new THREE.Group();
  switch (asset) {
    case 'PRP_Couch_A': {
      g.add(box(2.2, 0.4, 0.9, M.fabric, 0, 0.25, 0));
      g.add(box(2.2, 0.45, 0.25, M.fabric, 0, 0.62, -0.32));
      g.add(box(0.22, 0.3, 0.9, M.fabric, -0.99, 0.6, 0));
      g.add(box(0.22, 0.3, 0.9, M.fabric, 0.99, 0.6, 0));
      g.add(box(0.95, 0.12, 0.55, M.fabricDark, -0.5, 0.5, 0.1));
      g.add(box(0.95, 0.12, 0.55, M.fabricDark, 0.5, 0.5, 0.1));
      break;
    }
    case 'PRP_Table_Coffee_A':
      g.add(box(1.2, 0.05, 0.6, M.wallInt, 0, 0.43, 0));
      for (const [x, z] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) g.add(box(0.05, 0.42, 0.05, M.trim, x, 0.21, z));
      break;
    case 'PRP_Table_A':
      g.add(box(1.4, 0.06, 0.9, M.wallInt, 0, 0.73, 0));
      for (const [x, z] of [[-0.62, -0.38], [0.62, -0.38], [-0.62, 0.38], [0.62, 0.38]]) g.add(box(0.07, 0.72, 0.07, M.trim, x, 0.36, z));
      break;
    case 'PRP_Chair_A':
      g.add(box(0.45, 0.04, 0.45, M.wallInt, 0, 0.45, 0));
      g.add(box(0.45, 0.45, 0.04, M.wallInt, 0, 0.7, -0.2));
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.04, 0.45, 0.04, M.trim, x, 0.22, z));
      break;
    case 'PRP_Chair_Arm_A':
      g.add(box(0.8, 0.4, 0.8, M.fabricDark, 0, 0.22, 0));
      g.add(box(0.8, 0.5, 0.2, M.fabricDark, 0, 0.65, -0.3));
      g.add(box(0.18, 0.25, 0.8, M.fabricDark, -0.31, 0.55, 0));
      g.add(box(0.18, 0.25, 0.8, M.fabricDark, 0.31, 0.55, 0));
      break;
    case 'PRP_Lamp_Floor_A': {
      g.add(cyl(0.16, 0.18, 0.03, M.metalDark, 0, 0.015, 0));
      g.add(cyl(0.015, 0.015, 1.5, M.metalDark, 0, 0.77, 0, 6));
      const shade = cyl(0.14, 0.22, 0.32, M.lampShade, 0, 1.55, 0, 14);
      shade.name = 'shade';
      shade.castShadow = false;
      g.add(shade);
      break;
    }
    case 'PRP_Lamp_Ceiling_A': {
      g.add(cyl(0.01, 0.01, 0.4, M.metalDark, 0, 2.6, 0, 6));
      const shade = cyl(0.1, 0.22, 0.2, M.lampShade, 0, 2.4, 0, 14);
      shade.name = 'shade';
      shade.castShadow = false;
      g.add(shade);
      break;
    }
    case 'PRP_Shelf_A':
      g.add(box(1.2, 1.8, 0.35, M.trim, 0, 0.9, 0));
      for (let i = 0; i < 4; i++) g.add(box(1.1, 0.03, 0.3, M.wallInt, 0, 0.3 + i * 0.42, 0.01));
      for (let i = 0; i < 9; i++) g.add(box(0.06, 0.28, 0.2, [M.fabricDark, M.fabric, M.paper][i % 3], -0.45 + i * 0.11, 0.48 + Math.floor(i / 5) * 0.42, 0.03));
      break;
    case 'PRP_TV_A':
      g.add(box(1.0, 0.5, 0.4, M.trim, 0, 0.25, 0));
      g.add(box(0.8, 0.5, 0.06, M.plastic, 0, 0.78, 0.05));
      g.add(box(0.72, 0.42, 0.01, M.carGlass, 0, 0.78, 0.09));
      break;
    case 'PRP_Counter_A':
      g.add(box(3.0, 0.86, 0.66, M.woodDarkMat || M.trim, 0, 0.43, 0));
      g.add(box(3.05, 0.06, 0.7, M.stone, 0, 0.89, 0));
      for (let i = 0; i < 4; i++) g.add(box(0.03, 0.03, 0.14, M.metal, -1.1 + i * 0.75, 0.6, 0.34));
      break;
    case 'PRP_Fridge_A':
      g.add(box(0.8, 1.8, 0.8, M.metal, 0, 0.9, 0));
      g.add(box(0.03, 0.5, 0.03, M.metalDark, 0.3, 1.2, 0.41));
      g.add(box(0.03, 0.3, 0.03, M.metalDark, 0.3, 0.5, 0.41));
      break;
    case 'PRP_Cabinet_A':
      g.add(box(0.5, 1.6, 1.0, M.trim, 0, 0.8, 0));
      g.add(box(0.03, 0.8, 0.04, M.metal, 0.26, 0.9, 0.2));
      g.add(box(0.03, 0.8, 0.04, M.metal, 0.26, 0.9, -0.2));
      break;
    case 'PRP_Bed_A':
      g.add(box(1.6, 0.3, 2.0, M.trim, 0, 0.15, 0));
      g.add(box(1.5, 0.25, 1.9, M.fabric, 0, 0.42, 0));
      g.add(box(1.5, 0.12, 0.8, M.fabricDark, 0, 0.6, 0.5));
      g.add(box(0.6, 0.12, 0.35, M.paper, 0, 0.6, -0.75));
      g.add(box(1.6, 0.8, 0.08, M.trim, 0, 0.5, -1.0));
      break;
    case 'PRP_Nightstand_A':
      g.add(box(0.5, 0.6, 0.5, M.trim, 0, 0.3, 0));
      g.add(cyl(0.08, 0.1, 0.18, M.lampShade, 0, 0.72, 0, 10)).name = 'shade';
      g.add(cyl(0.01, 0.01, 0.12, M.metalDark, 0, 0.62, 0, 6));
      break;
    case 'PRP_Suitcase_A':
      g.add(box(0.6, 0.35, 0.22, M.fabricDark, 0, 0.18, 0));
      g.add(box(0.15, 0.04, 0.03, M.metal, 0, 0.37, 0));
      break;
    case 'PRP_Toilet_A':
      g.add(box(0.45, 0.4, 0.5, M.porcelain, 0, 0.2, 0.05));
      g.add(box(0.45, 0.4, 0.2, M.porcelain, 0, 0.55, -0.25));
      break;
    case 'PRP_Sink_A':
      g.add(box(0.5, 0.8, 0.5, M.porcelain, 0, 0.4, 0));
      g.add(box(0.55, 0.06, 0.55, M.porcelain, 0, 0.83, 0));
      g.add(cyl(0.015, 0.015, 0.2, M.metal, 0, 0.95, -0.15, 6));
      break;
    case 'PRP_Tub_A':
      g.add(box(1.7, 0.55, 0.8, M.porcelain, 0, 0.27, 0));
      g.add(box(1.5, 0.05, 0.6, M.carGlass, 0, 0.5, 0));
      break;
    case 'PRP_Paper_A':
      g.add(box(0.2, 0.005, 0.28, M.paper, 0, 0, 0));
      break;
    case 'PRP_Can_A':
      g.add(cyl(0.08, 0.08, 0.16, M.metal, 0, 0.08, 0, 12));
      break;
    case 'PRP_Phone_A': {
      g.add(box(0.06, 0.012, 0.12, M.plastic, 0, 0.006, 0));
      const screen = box(0.05, 0.002, 0.1, M.phoneScreen.clone(), 0, 0.013, 0);
      screen.name = 'screen';
      g.add(screen);
      break;
    }
    case 'PRP_Photo_A':
      g.add(box(0.12, 0.15, 0.01, M.trim, 0, 0.08, 0));
      g.add(box(0.1, 0.12, 0.002, M.paper, 0, 0.08, 0.006));
      break;
    default:
      g.add(box(0.5, 0.5, 0.5, M.fabricDark, 0, 0.25, 0));
  }
  return g;
}

/** Simple placeholder weapon meshes (held in the right hand). */
export function buildWeaponMesh(weaponId) {
  const M = getMaterials();
  const g = new THREE.Group();
  switch (weaponId) {
    case 'revolver':
      g.add(box(0.03, 0.05, 0.18, M.metal, 0, 0.02, -0.08));
      g.add(cyl(0.025, 0.025, 0.06, M.metalDark, 0, 0.01, -0.02, 8)).rotation.x = Math.PI / 2;
      g.add(box(0.03, 0.09, 0.04, M.trim, 0, -0.04, 0.03));
      break;
    case 'shotgun':
      g.add(cyl(0.014, 0.014, 0.62, M.metalDark, 0, 0.02, -0.3, 8)).rotation.x = Math.PI / 2;
      g.add(box(0.04, 0.05, 0.22, M.trim, 0, 0.0, -0.18));
      g.add(box(0.045, 0.08, 0.2, M.trim, 0, -0.03, 0.12));
      break;
    case 'smg':
      g.add(box(0.05, 0.07, 0.36, M.metalDark, 0, 0.01, -0.12));
      g.add(box(0.03, 0.14, 0.04, M.metalDark, 0, -0.08, -0.06));
      g.add(box(0.03, 0.08, 0.04, M.trim, 0, -0.04, 0.08));
      g.add(cyl(0.012, 0.012, 0.16, M.metal, 0, 0.02, -0.36, 8)).rotation.x = Math.PI / 2;
      break;
    default: // pistol
      g.add(box(0.03, 0.05, 0.17, M.metalDark, 0, 0.02, -0.07));
      g.add(box(0.03, 0.09, 0.04, M.plastic, 0, -0.04, 0.03));
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}
