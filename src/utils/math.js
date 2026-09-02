/** Math helpers. Pure, node-safe. */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** Frame-rate independent exponential damping. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const randRange = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(randRange(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const degToRad = (d) => (d * Math.PI) / 180;
export const TAU = Math.PI * 2;

export function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function angleDamp(a, b, lambda, dt) {
  return angleLerp(a, b, 1 - Math.exp(-lambda * dt));
}

export const dist2D = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

/**
 * Resolve a circle (cx,cz,r) against an AABB {minX,maxX,minZ,maxZ}.
 * Returns {x,z} push-out vector or null.
 */
export function circleVsAABB(cx, cz, r, box) {
  const nx = clamp(cx, box.minX, box.maxX);
  const nz = clamp(cz, box.minZ, box.maxZ);
  let dx = cx - nx;
  let dz = cz - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 < 1e-9) {
    // center inside the box: push out through the nearest face
    const l = cx - box.minX, rgt = box.maxX - cx, t = cz - box.minZ, b = box.maxZ - cz;
    const m = Math.min(l, rgt, t, b);
    if (m === l) return { x: -(l + r), z: 0 };
    if (m === rgt) return { x: rgt + r, z: 0 };
    if (m === t) return { x: 0, z: -(t + r) };
    return { x: 0, z: b + r };
  }
  const d = Math.sqrt(d2);
  const push = r - d;
  return { x: (dx / d) * push, z: (dz / d) * push };
}

/** Segment (a->b) vs segment (c->d) intersection parameter t along a->b, or null. */
export function segSegT(ax, az, bx, bz, cx, cz, dx, dz) {
  const r_x = bx - ax, r_z = bz - az;
  const s_x = dx - cx, s_z = dz - cz;
  const denom = r_x * s_z - r_z * s_x;
  if (Math.abs(denom) < 1e-9) return null;
  const qp_x = cx - ax, qp_z = cz - az;
  const t = (qp_x * s_z - qp_z * s_x) / denom;
  const u = (qp_x * r_z - qp_z * r_x) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return t;
  return null;
}

/** Ray (ox,oz, dir dx,dz) vs AABB, returns t (>=0) or null. */
export function rayVsAABB(ox, oz, dx, dz, box, maxT = Infinity) {
  let tmin = 0, tmax = maxT;
  for (const [o, d, lo, hi] of [[ox, dx, box.minX, box.maxX], [oz, dz, box.minZ, box.maxZ]]) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d, t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

/** Ray vs circle (cx,cz,r). Returns nearest t >= 0 or null. */
export function rayVsCircle(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx, fz = oz - cz;
  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r * r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  if (t1 >= 0) return t1;
  const t2 = (-b + disc) / (2 * a);
  if (t2 >= 0) return t2;
  return null;
}

export function pointInBox(x, z, box, pad = 0) {
  return x >= box.minX - pad && x <= box.maxX + pad && z >= box.minZ - pad && z <= box.maxZ + pad;
}

/** Deterministic pseudo-random for layout generation (mulberry32). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
