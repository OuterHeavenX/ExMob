// Prints the node tree, skins and animations of a GLB. Usage: node tools/inspect-glb.mjs file.glb
import { readFileSync } from 'node:fs';

const buf = readFileSync(process.argv[2]);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const nodes = json.nodes || [];
function walk(i, depth) {
  const n = nodes[i];
  const t = n.translation ? n.translation.map((v) => v.toFixed(2)).join(',') : '';
  console.log('  '.repeat(depth) + (n.name || '?') + (n.mesh !== undefined ? ' [mesh' + (n.skin !== undefined ? ' skin' : '') + ']' : '') + (t ? ` (${t})` : ''));
  for (const c of n.children || []) walk(c, depth + 1);
}
for (const s of json.scenes || []) for (const r of s.nodes) walk(r, 0);
console.log('meshes:', (json.meshes || []).map((m) => `${m.name}:${m.primitives.length}prim`).join(' '));
console.log('skins:', (json.skins || []).length, 'joints:', (json.skins || []).map((s) => s.joints.length).join(','));
console.log('animations:', (json.animations || []).map((a) => `${a.name}(${a.channels.length}ch)`).join(' '));
console.log('bytes:', buf.length);
