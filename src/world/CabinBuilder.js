import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterials } from './Materials.js';
import { buildProp, PROP_HEIGHTS } from './PropFactory.js';
import { ColliderSet } from './Colliders.js';
import { seededRandom } from '../utils/math.js';
import { batchGroup } from './Batch.js';

/**
 * Builds the Cabin from src/data/properties/cabin.js: floor, walls split around openings,
 * portals (door/window meshes handed to PropertyManager), roof (fadeable), porch, driveway,
 * forest (instanced), rocks, props (GLB when available, procedural otherwise), lamps.
 * Registers all static colliders. ADR-012.
 */
export class CabinBuilder {
  constructor(data, { scene, assets, lighting, wallFader, quality }) {
    this.data = data;
    this.scene = scene;
    this.assets = assets;
    this.lighting = lighting;
    this.wallFader = wallFader;
    this.quality = quality;
    this.M = getMaterials();
    this.colliders = new ColliderSet();
    this.portalVisuals = {}; // id -> { group, door, pane, boards, sill, frame }
    this.propVisuals = {};   // id -> { group, shade }
    this.storyVisuals = {};
    this.root = new THREE.Group();
    this.root.name = 'Cabin';
    scene.add(this.root);
  }

  build() {
    this._merge = new Map(); // key -> { mat, group, geos }
    this._ground();
    this._floor();
    this._walls();
    this._flushMerged();
    this._roof();
    this._porch();
    this._driveway();
    this._forest();
    this._props();
    this._storyProps();
    this._playerCar();
    return this;
  }

  // ---------- helpers
  _mesh(geo, mat, x, y, z, { shadow = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = receive;
    this.root.add(m);
    return m;
  }

  groundHeight(x, z) {
    const b = this.data.bounds, p = this.data.exterior.porch;
    if (x >= b.minX - 0.3 && x <= b.maxX + 0.3 && z >= b.minZ - 0.3 && z <= b.maxZ + 0.3) return 0.15;
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ + 0.05) return 0.15;
    return 0;
  }

  // ---------- ground & floor
  _ground() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(160, 160, 1, 1), this.M.ground);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.root.add(g);
  }

  _floor() {
    const b = this.data.bounds;
    const w = b.maxX - b.minX + 0.6, d = b.maxZ - b.minZ + 0.6;
    // foundation slab
    this._mesh(new THREE.BoxGeometry(w, 0.15, d), this.M.stone, 0, 0.075, 0);
    const floor = this._mesh(new THREE.BoxGeometry(w - 0.4, 0.02, d - 0.4), this.M.floor, 0, 0.16, 0, { shadow: false });
    floor.userData.surface = 'wood';
  }

  // ---------- walls
  _walls() {
    const H = this.data.module.wallHeight, T = this.data.module.wallThickness;
    const WW = this.data.module.windowWidth, DW = this.data.module.doorWidth;
    const sill = this.data.module.windowSill, wh = this.data.module.windowHeight, dh = this.data.module.doorHeight;
    const y0 = 0.15;
    for (const wall of this.data.walls) {
      const dx = wall.x2 - wall.x1, dz = wall.z2 - wall.z1;
      const len = Math.hypot(dx, dz);
      const ux = dx / len, uz = dz / len;
      const horizontal = Math.abs(ux) > Math.abs(uz);
      const openings = [...wall.openings].sort((a, b) => a.along - b.along);
      let cursor = 0;
      const pieces = [];
      const isSouth = wall.id === 'south';
      const mat = wall.exterior ? this.M.wallExt : this.M.wallInt;

      const solid = (a0, a1, yb, yt) => {
        const l = a1 - a0;
        if (l <= 0.01) return;
        const cx = wall.x1 + ux * (a0 + l / 2), cz = wall.z1 + uz * (a0 + l / 2);
        const geo = horizontal ? new THREE.BoxGeometry(l, yt - yb, T) : new THREE.BoxGeometry(T, yt - yb, l);
        geo.translate(cx, y0 + (yb + yt) / 2, cz);
        const fade = isSouth && wall.exterior && yb < 1.0 ? 'south' : null;
        this._queueMerge(mat, fade, geo);
      };
      const walkBox = (a0, a1, extra = {}) => {
        const l = a1 - a0;
        if (l <= 0.01) return null;
        const cx = wall.x1 + ux * (a0 + l / 2), cz = wall.z1 + uz * (a0 + l / 2);
        return this.colliders.add(ColliderSet.box(cx, cz, horizontal ? l : T, horizontal ? T : l, { kind: 'wall', surface: 'wood', ...extra }));
      };

      for (const o of openings) {
        const w = o.type === 'window' ? WW : o.type === 'door' ? DW : (o.width || 1.0);
        const a0 = o.along - w / 2, a1 = o.along + w / 2;
        // solid up to the opening
        solid(cursor, a0, 0, H);
        walkBox(cursor, a0);
        if (o.type === 'window') {
          solid(a0, a1, 0, sill);                 // sill wall
          solid(a0, a1, sill + wh, H);            // header
          const sillBox = walkBox(a0, a1, { kind: 'sill', bullets: false, los: false, portal: o.portal });
          const cx = wall.x1 + ux * o.along, cz = wall.z1 + uz * o.along;
          this._windowVisual(o.portal, cx, cz, horizontal, y0 + sill, wh, WW, T, sillBox);
        } else if (o.type === 'door') {
          solid(a0, a1, dh, H);                   // lintel
          const cx = wall.x1 + ux * o.along, cz = wall.z1 + uz * o.along;
          this._doorVisual(o.portal, cx, cz, horizontal, y0, dh, DW, T, ux, uz);
        } else {
          solid(a0, a1, dh, H);                   // open doorway header
        }
        cursor = a1;
      }
      solid(cursor, len, 0, H);
      walkBox(cursor, len);
      // corner posts (visual)
      for (const [px, pz] of [[wall.x1, wall.z1], [wall.x2, wall.z2]]) {
        if (!wall.exterior) continue;
        const geo = new THREE.BoxGeometry(T + 0.1, H + 0.05, T + 0.1);
        geo.translate(px, y0 + H / 2, pz);
        this._queueMerge(this.M.trim, isSouth ? 'south' : null, geo);
      }
    }
  }

  /** Static geometry batching: one mesh per (material, fade group). Cuts draw calls dramatically. */
  _queueMerge(mat, fade, geo) {
    const key = mat.uuid + ':' + (fade || '');
    if (!this._merge.has(key)) this._merge.set(key, { mat, fade, geos: [] });
    this._merge.get(key).geos.push(geo);
  }

  _flushMerged() {
    for (const { mat, fade, geos } of this._merge.values()) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const m = this._mesh(merged, mat, 0, 0, 0);
      m.userData.surface = 'wood';
      if (fade) this.wallFader.register(m, fade);
    }
    this._merge.clear();
  }

  _windowVisual(id, cx, cz, horizontal, yb, wh, WW, T, sillBox) {
    const g = new THREE.Group();
    g.position.set(cx, yb, cz);
    if (!horizontal) g.rotation.y = Math.PI / 2;
    // frame (batched into the static wall mesh)
    const rotY = horizontal ? 0 : Math.PI / 2;
    const frameGeo = (sx, sy, sz, ox, oy) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      geo.rotateY(rotY);
      geo.translate(cx + (horizontal ? ox : 0), yb + oy, cz + (horizontal ? 0 : ox));
      this._queueMerge(this.M.trim, cz > 3.5 ? 'south' : null, geo);
    };
    frameGeo(WW + 0.12, 0.06, T + 0.06, 0, 0);
    frameGeo(WW + 0.12, 0.06, T + 0.06, 0, wh);
    frameGeo(0.06, wh, T + 0.06, -WW / 2, wh / 2);
    frameGeo(0.06, wh, T + 0.06, WW / 2, wh / 2);
    frameGeo(0.04, wh, 0.04, 0, wh / 2);
    // pane
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(WW, wh), this.M.glass);
    pane.position.set(0, wh / 2, 0);
    pane.name = 'pane';
    g.add(pane);
    // boards (hidden until boarded)
    const boards = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.3, 0.16, 0.04), this.M.boards);
      b.position.set((i - 1) * 0.05, 0.2 + i * 0.4, (horizontal ? 1 : 1) * (T / 2 + 0.03));
      b.rotation.z = (i - 1) * 0.08;
      b.castShadow = true;
      boards.add(b);
    }
    boards.visible = false;
    g.add(boards);
    // shattered remnants: jagged shards along the frame
    const shards = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + Math.random() * 0.15, 0.1 + Math.random() * 0.2), this.M.glass);
      const edge = i % 2 ? -1 : 1;
      s.position.set(i < 4 ? (-WW / 2 + 0.1 + i * (WW / 3.2)) : edge * (WW / 2 - 0.08), i < 4 ? (i % 2 ? wh - 0.1 : 0.1) : wh / 2, 0);
      s.rotation.z = (Math.random() - 0.5) * 0.8;
      shards.add(s);
    }
    shards.visible = false;
    g.add(shards);
    this.root.add(g);
    // pane collider (blocks bullets and LOS while intact/boarded)
    const paneBox = this.colliders.add(ColliderSet.box(cx, cz, horizontal ? WW : T, horizontal ? T : WW, { kind: 'pane', walk: false, bullets: true, los: true, surface: 'glass', portal: id }));
    this.portalVisuals[id] = { group: g, pane, boards, shards, paneBox, sillBox, horizontal };
  }

  _doorVisual(id, cx, cz, horizontal, yb, dh, DW, T, ux, uz) {
    const portal = this.data.portals[id];
    const hingeSide = portal.hinge || -1;
    const g = new THREE.Group();
    // hinge pivot at the door edge
    g.position.set(cx + (horizontal ? hingeSide * DW / 2 : 0), yb, cz + (horizontal ? 0 : hingeSide * DW / 2));
    if (!horizontal) g.rotation.y = Math.PI / 2;
    const door = new THREE.Mesh(new THREE.BoxGeometry(DW, dh - 0.02, 0.06), this.M.door);
    door.position.set(-hingeSide * DW / 2, dh / 2, 0);
    door.castShadow = true;
    door.receiveShadow = true;
    door.name = 'door';
    // panels
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(DW * 0.7, dh * 0.36, 0.02), this.M.trim);
      p.position.set(0, -dh / 4 + i * dh / 2, 0.035);
      door.add(p);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.M.metal);
    knob.position.set(-hingeSide * (DW - 0.12), dh / 2 - 0.05, 0.05);
    g.add(door, knob);
    // frame posts (batched into the static wall mesh)
    for (const s of [-1, 1]) {
      const geo = new THREE.BoxGeometry(0.08, dh, T + 0.06);
      if (!horizontal) geo.rotateY(Math.PI / 2);
      geo.translate(cx + (horizontal ? s * (DW / 2 + 0.04) : 0), yb + dh / 2, cz + (horizontal ? 0 : s * (DW / 2 + 0.04)));
      this._queueMerge(this.M.trim, cz > 3.5 ? 'south' : null, geo);
    }
    // broken variant: splintered stub near the hinge
    const stub = new THREE.Mesh(new THREE.BoxGeometry(0.2, dh * 0.55, 0.06), this.M.door);
    stub.position.set(-hingeSide * 0.1, dh * 0.28, 0);
    stub.rotation.z = hingeSide * 0.15;
    stub.visible = false;
    g.add(stub);
    this.root.add(g);
    const box = this.colliders.add(ColliderSet.box(cx, cz, horizontal ? DW : T, horizontal ? T : DW, { kind: 'door', walk: true, bullets: true, los: true, surface: 'wood', portal: id }));
    this.portalVisuals[id] = { group: g, door, stub, knob, box, horizontal, hingeSide };
  }

  // ---------- roof
  _roof() {
    const b = this.data.bounds, H = this.data.module.wallHeight;
    const w = b.maxX - b.minX + 1.2, d = b.maxZ - b.minZ + 1.2;
    const rise = 1.6;
    const y = 0.15 + H;
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0); shape.lineTo(0, rise); shape.lineTo(d / 2, 0); shape.lineTo(-d / 2, 0);
    const gable = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    gable.rotateY(Math.PI / 2);
    gable.translate(-w / 2, y, 0);
    const roof = this._mesh(gable, this.M.roof, 0, 0, 0);
    this.wallFader.register(roof, 'roof');
    // ridge / slabs
    const slabLen = Math.hypot(d / 2, rise) + 0.2;
    const ang = Math.atan2(rise, d / 2);
    for (const s of [-1, 1]) {
      const slab = this._mesh(new THREE.BoxGeometry(w + 0.3, 0.12, slabLen), this.M.roof, 0, y + rise / 2 + 0.06, s * d / 4);
      slab.rotation.x = -s * ang;
      this.wallFader.register(slab, 'roof');
    }
    // chimney
    const chim = this._mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), this.M.stone, 4.2, y + 1.0, -1.5);
    this.wallFader.register(chim, 'roof');
    // ceiling (interior, hides with roof)
    const ceil = this._mesh(new THREE.BoxGeometry(w - 1.2, 0.05, d - 1.2), this.M.trim, 0, y - 0.03, 0, { shadow: false, receive: false });
    this.wallFader.register(ceil, 'roof');
  }

  // ---------- porch, driveway
  _porch() {
    const p = this.data.exterior.porch;
    const w = p.maxX - p.minX, d = p.maxZ - p.minZ;
    const cx = (p.minX + p.maxX) / 2, cz = (p.minZ + p.maxZ) / 2;
    this._mesh(new THREE.BoxGeometry(w, 0.15, d), this.M.floor, cx, 0.075, cz);
    // steps
    this._mesh(new THREE.BoxGeometry(1.6, 0.08, 0.4), this.M.floor, cx + 0.2, 0.04, p.maxZ + 0.2);
    // posts + rail
    for (const x of [p.minX + 0.1, p.maxX - 0.1]) {
      const post = this._mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), this.M.trim, x, 1.35, p.maxZ - 0.1);
      this.colliders.add(ColliderSet.box(x, p.maxZ - 0.1, 0.16, 0.16, { kind: 'post', surface: 'wood' }));
      this.wallFader.register(post, 'south');
    }
    const rail = this._mesh(new THREE.BoxGeometry(w * 0.32, 0.08, 0.08), this.M.trim, p.minX + w * 0.16 + 0.1, 1.0, p.maxZ - 0.1);
    this.wallFader.register(rail, 'south');
    this.colliders.add(ColliderSet.box(p.minX + w * 0.16 + 0.1, p.maxZ - 0.1, w * 0.32, 0.1, { kind: 'rail', surface: 'wood', bullets: false, los: false }));
    // awning
    const awn = this._mesh(new THREE.BoxGeometry(w + 0.4, 0.1, d + 0.2), this.M.roof, cx, 2.6, cz);
    awn.rotation.x = 0.12;
    this.wallFader.register(awn, 'roof');
    const L = p.light;
    this.lighting.addPorchLight(L.x, L.y, L.z, L.color, L.intensity, L.distance);
  }

  _driveway() {
    const d = this.data.exterior.driveway;
    const len = d.toZ - d.fromZ;
    const m = this._mesh(new THREE.PlaneGeometry(d.width, len), this.M.gravel, d.x, 0.01, d.fromZ + len / 2, { shadow: false });
    m.rotation.x = -Math.PI / 2;
    m.userData.surface = 'dirt';
    // tire ruts
    for (const s of [-1, 1]) {
      const rut = this._mesh(new THREE.PlaneGeometry(0.5, len), this.M.stone, d.x + s * 0.9, 0.015, d.fromZ + len / 2, { shadow: false });
      rut.rotation.x = -Math.PI / 2;
    }
  }

  // ---------- forest
  _forest() {
    const ex = this.data.exterior;
    const rnd = seededRandom(1337);
    const density = this.quality.preset.foliageDensity;
    const count = Math.floor(ex.treeRing.count * density);
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 6, 7);
    trunkGeo.translate(0, 3, 0);
    const foliageGeo = new THREE.ConeGeometry(1.7, 5.5, 8);
    foliageGeo.translate(0, 5.4, 0);
    const foliage2 = new THREE.ConeGeometry(1.2, 4, 8);
    foliage2.translate(0, 8.0, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, this.M.bark, count);
    const crowns = new THREE.InstancedMesh(foliageGeo, this.M.foliage, count);
    const tops = new THREE.InstancedMesh(foliage2, this.M.foliage, count);
    const mtx = new THREE.Matrix4();
    const drive = ex.driveway;
    let placed = 0;
    let tries = 0;
    this.trees = [];
    while (placed < count && tries < count * 20) {
      tries++;
      const a = rnd() * Math.PI * 2;
      const r = ex.treeRing.inner + Math.pow(rnd(), 0.7) * (ex.treeRing.outer - ex.treeRing.inner);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      // keep the driveway clear
      if (z > drive.fromZ - 2 && Math.abs(x - drive.x) < drive.width / 2 + 2.5) continue;
      // keep spawn routes reachable
      const s = 0.8 + rnd() * 0.6;
      mtx.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28), new THREE.Vector3(s, s, s));
      trunks.setMatrixAt(placed, mtx);
      crowns.setMatrixAt(placed, mtx);
      tops.setMatrixAt(placed, mtx);
      if (r < 26) this.colliders.add(ColliderSet.box(x, z, 0.55 * s, 0.55 * s, { kind: 'tree', surface: 'wood' }));
      this.trees.push({ x, z, s });
      placed++;
    }
    trunks.count = crowns.count = tops.count = placed;
    trunks.castShadow = true; crowns.castShadow = true; tops.castShadow = true;
    trunks.receiveShadow = true;
    this.root.add(trunks, crowns, tops);
    // rocks
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), this.M.stone, ex.rocks.count);
    for (let i = 0; i < ex.rocks.count; i++) {
      const a = rnd() * Math.PI * 2, r = 8 + rnd() * ex.rocks.radius;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > drive.fromZ - 1 && Math.abs(x - drive.x) < drive.width / 2 + 1) { rocks.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); continue; }
      const s = 0.4 + rnd() * 1.1;
      mtx.compose(new THREE.Vector3(x, -0.1 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(), rnd() * 6, rnd())), new THREE.Vector3(s, s * 0.7, s));
      rocks.setMatrixAt(i, mtx);
      if (s > 0.9 && r < 24) this.colliders.add(ColliderSet.box(x, z, s * 0.8, s * 0.8, { kind: 'rock', surface: 'dirt', height: s * 0.7, bullets: s > 1.2, los: false }));
    }
    rocks.castShadow = true; rocks.receiveShadow = true;
    this.root.add(rocks);
    // grass tufts (cheap cones)
    const tuftCount = Math.floor(400 * density);
    const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.35, 4), this.M.foliage, tuftCount);
    for (let i = 0; i < tuftCount; i++) {
      const a = rnd() * Math.PI * 2, r = 7 + rnd() * 20;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      mtx.compose(new THREE.Vector3(x, 0.12, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.6 + rnd(), 1));
      tufts.setMatrixAt(i, mtx);
    }
    tufts.castShadow = false;
    this.root.add(tufts);
  }

  // ---------- props
  _props() {
    for (const p of this.data.props) {
      let g = this.assets.instance(p.asset);
      g = this._batchProp(g || buildProp(p.asset));
      g.position.set(p.x, this.groundHeight(p.x, p.z), p.z);
      g.rotation.y = p.rot || 0;
      g.name = 'prop:' + p.id;
      this.root.add(g);
      const shade = g.getObjectByName('shade') || null;
      let box = null;
      if (p.size) {
        const rot = Math.abs(Math.sin(p.rot || 0)) > 0.5;
        const sx = rot ? p.size.z : p.size.x, sz = rot ? p.size.x : p.size.z;
        const h = PROP_HEIGHTS[p.asset] ?? 0.8;
        box = this.colliders.add(ColliderSet.box(p.x, p.z, sx, sz, { kind: 'prop', prop: p.id, surface: p.asset.includes('Fridge') || p.asset.includes('Sink') ? 'metal' : (p.asset.includes('Couch') || p.asset.includes('Bed') || p.asset.includes('Arm')) ? 'fabric' : 'wood', height: h, bullets: h >= 1.2, los: h >= 1.2 }));
      }
      if (p.light) this.lighting.addLamp(p.id, p.x, p.light.y, p.z, p.light.color, p.light.intensity, p.light.distance);
      this.propVisuals[p.id] = { group: g, shade, box };
    }
  }

  /**
   * Merge a prop's meshes per material into a few draw calls. Works for procedural groups and
   * GLB instances. Named functional children (shade, screen, pane, door, headlight*) are kept.
   */
  _batchProp(group) {
    return batchGroup(group);
  }

  _storyProps() {
    for (const s of this.data.storyProps) {
      let g = this.assets.instance(s.asset) || buildProp(s.asset);
      g.position.set(s.x, this.groundHeight(s.x, s.z) + s.y, s.z);
      g.rotation.y = s.rot || 0;
      this.root.add(g);
      this.storyVisuals[s.id] = g;
    }
  }

  _playerCar() {
    // The player's parked car is built by the Vehicle entity (shared with enemy sedans); CabinScene adds it.
  }
}
