import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['shade', 'screen', 'pane', 'door']);

/**
 * Flatten a group and merge its meshes per material into as few draw calls as possible.
 * Meshes whose name is in KEEP (or starts with 'headlight') are preserved as-is so gameplay
 * can address them. Returns a new Group positioned at the origin.
 */
export function batchGroup(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (KEEP.has(o.name) || o.name.startsWith('headlight')) { keep.push(o); return; }
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const geo = o.geometry.clone().applyMatrix4(rel);
    for (const attr of ['color', 'uv2', 'tangent']) if (geo.attributes[attr] && !byMat.size) { /* keep */ }
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] });
    byMat.get(key).geos.push(geo);
  });
  const out = new THREE.Group();
  for (const { mat, geos } of byMat.values()) {
    // mergeGeometries needs identical attribute sets; normalize to position/normal/uv
    for (const g of geos) for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    for (const g of geos) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const g of geos) if (!g.attributes.normal) g.computeVertexNormals();
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = true; m.receiveShadow = true;
    out.add(m);
  }
  for (const k of keep) {
    const rel = new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld);
    k.removeFromParent();
    k.matrix.copy(rel);
    k.matrix.decompose(k.position, k.quaternion, k.scale);
    out.add(k);
  }
  return out;
}

/** Merge the direct mesh children of a pivot (character part) per material, in place. */
export function batchPivotChildren(pivot) {
  const meshes = pivot.children.filter((c) => c.isMesh);
  if (meshes.length <= 1) return;
  const byMat = new Map();
  for (const m of meshes) {
    m.updateMatrix();
    const geo = m.geometry.clone().applyMatrix4(m.matrix);
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    const key = m.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: m.material, geos: [] });
    byMat.get(key).geos.push(geo);
    pivot.remove(m);
  }
  for (const { mat, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    pivot.add(mesh);
  }
}
