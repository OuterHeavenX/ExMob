// Runs Blender headless to build the prototype library, copies GLBs into assets/models/, and
// writes assets/models/manifest.json. Usage: npm run blender:build
// Requires Blender on PATH or BLENDER_PATH set.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const exportsDir = join(root, 'blender', 'exports');
const modelsDir = join(root, 'assets', 'models');

function findBlender() {
  if (process.env.BLENDER_PATH && existsSync(process.env.BLENDER_PATH)) return process.env.BLENDER_PATH;
  const candidates = ['blender'];
  if (process.platform === 'win32') {
    const base = 'C:\\Program Files\\Blender Foundation';
    if (existsSync(base)) for (const d of readdirSync(base).sort().reverse()) candidates.unshift(join(base, d, 'blender.exe'));
  } else if (process.platform === 'darwin') candidates.unshift('/Applications/Blender.app/Contents/MacOS/Blender');
  for (const c of candidates) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const blender = findBlender();
if (!blender) { console.error('Blender not found. Install Blender 4.2+ or set BLENDER_PATH.'); process.exit(1); }
console.log('Using', blender);
mkdirSync(exportsDir, { recursive: true });
const r = spawnSync(blender, ['-b', '-P', join(root, 'blender', 'tools', 'build_all.py'), '--', '--out', exportsDir], { stdio: 'inherit' });
if (r.status !== 0) { console.error('Blender build failed'); process.exit(r.status || 1); }

const assets = [];
let bytes = 0;
for (const cat of ['characters', 'weapons', 'props', 'vehicles', 'environment']) {
  const src = join(exportsDir, cat);
  if (!existsSync(src)) continue;
  const dst = join(modelsDir, cat);
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.glb')) continue;
    copyFileSync(join(src, f), join(dst, f));
    assets.push(f.replace(/\.glb$/, ''));
    bytes += statSync(join(src, f)).size;
  }
}
assets.sort();
writeFileSync(join(modelsDir, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), blender: blender, assets, totalBytes: bytes }, null, 2));
console.log(`Manifest written: ${assets.length} assets, ${(bytes / 1024).toFixed(0)} KB`);
