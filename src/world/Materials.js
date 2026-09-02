import * as THREE from 'three';

/**
 * Shared PBR materials for the gray-box / early-production Cabin. Procedural canvas textures
 * give wood grain and roughness variation without any texture files. The Blender production
 * pass replaces these with authored texture sets (docs/BLENDER_PIPELINE.md).
 */
function canvasTexture(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function woodTexture(base = '#6b4a2e', dark = '#4a3120', size = 256, planks = 4) {
  return canvasTexture(size, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const ph = s / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph;
      // grain lines
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const y = y0 + Math.random() * ph;
        g.moveTo(0, y);
        for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + p) * 2 + (Math.random() - 0.5) * 2);
        g.stroke();
      }
      // plank seam
      g.fillStyle = dark;
      g.fillRect(0, y0, s, 2);
      // lighter highlight
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.fillRect(0, y0 + 3, s, 2);
    }
  }, 1);
}

function noiseTexture(rgb = [60, 62, 58], variance = 18, size = 128) {
  return canvasTexture(size, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * variance;
      img.data[i] = rgb[0] + n; img.data[i + 1] = rgb[1] + n; img.data[i + 2] = rgb[2] + n; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, 8);
}

let cache = null;

export function getMaterials() {
  if (cache) return cache;
  const wood = woodTexture('#7a5636', '#4d351f', 256, 5);
  const woodDark = woodTexture('#4f371f', '#2e1f11', 256, 6);
  const floorTex = woodTexture('#8a6540', '#5a4025', 256, 8);
  floorTex.repeat.set(3, 3);
  const groundTex = noiseTexture([34, 40, 30], 24, 128);
  groundTex.repeat.set(40, 40);
  const gravelTex = noiseTexture([70, 66, 60], 30, 128);
  gravelTex.repeat.set(6, 40);

  cache = {
    wallExt: new THREE.MeshStandardMaterial({ map: wood, color: 0xb08a66, roughness: 0.85, metalness: 0.0 }),
    wallInt: new THREE.MeshStandardMaterial({ map: wood, color: 0xd9b48c, roughness: 0.8 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, color: 0xb8926a, roughness: 0.7 }),
    roof: new THREE.MeshStandardMaterial({ map: woodDark, color: 0x6a5a4a, roughness: 0.95 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }),
    door: new THREE.MeshStandardMaterial({ map: woodDark, color: 0x8a6a48, roughness: 0.75 }),
    boards: new THREE.MeshStandardMaterial({ map: woodDark, color: 0xa88860, roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc4ff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, envMapIntensity: 1.2 }),
    ground: new THREE.MeshStandardMaterial({ map: groundTex, color: 0x38402e, roughness: 1.0 }),
    gravel: new THREE.MeshStandardMaterial({ map: gravelTex, color: 0x6e675c, roughness: 1.0 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x5c5a58, roughness: 0.95 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x3a2b1e, roughness: 1.0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x17301c, roughness: 1.0 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.95 }),
    fabricDark: new THREE.MeshStandardMaterial({ color: 0x3b3a44, roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.45, metalness: 0.8 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.7 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }),
    lampShade: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xff9a40, emissiveIntensity: 1.6, roughness: 0.8, side: THREE.DoubleSide }),
    lampOff: new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9, side: THREE.DoubleSide }),
    carPaint: new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.35, metalness: 0.6 }),
    carPaintPlayer: new THREE.MeshStandardMaterial({ color: 0x5a2a22, roughness: 0.4, metalness: 0.5 }),
    carGlass: new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.1, metalness: 0.9 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.95 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xfff2d0, emissiveIntensity: 3.0 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 1.5 }),
    cash: new THREE.MeshStandardMaterial({ color: 0x8fb37a, roughness: 0.8 }),
    cashBand: new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.8 }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xe6e6e0, roughness: 0.3 }),
    phoneScreen: new THREE.MeshStandardMaterial({ color: 0x102030, emissive: 0x4090ff, emissiveIntensity: 0 }),
  };
  return cache;
}
