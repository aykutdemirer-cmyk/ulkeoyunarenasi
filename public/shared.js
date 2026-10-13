/* Sunucu ve istemcinin ortak kullandığı fizik çekirdeği (client-side prediction için birebir aynı kod) */

export const DT = 1 / 30;
export const SUB = 2;
export const BALL_R = 26;
export const ARMOR_R = 34;
export const ACC = 300;
export const FRICTION = 0.98;
export const DASH_SPEED = 720;
export const DASH_CD = 2.0;
export const DASH_TIME = 0.25;
export const MAX_SPEED = 1500;
export const WALL_REST = 0.9;
export const ARMOR_T = 5;
export const GHOST_T = 3;
export const SUPER_T = 12;
export const ARMOR_MASS = 6;
export const BUMP_R = 64;
export const ORB_R = 34;
export const ORB_DIST = 190;
export const PU_R = 24;
export const PU_TYPES = ['armor', 'super', 'ghost'];

const deg = (d) => (d * Math.PI) / 180;

export const MAPS = {
  classic: {
    key: 'classic', name: 'THE CLASSIC RING', desc: 'Dönen çift yarıklı neon çember.',
    R0: 360, Rmin: 360, shrink: 0, gaps: 2, gapHalf: deg(17.5), rot: 0.7,
    sudden: 35, grow: 0.012, gapMax: 1.0, bump: false
  },
  collider: {
    key: 'collider', name: 'HYPER COLLIDER', desc: 'Ortada seni fırlatan bumper ve dönen tamponlar.',
    R0: 360, Rmin: 360, shrink: 0, gaps: 2, gapHalf: deg(17.5), rot: 0.55,
    sudden: 40, grow: 0.012, gapMax: 1.0, bump: true
  },
  shrinking: {
    key: 'shrinking', name: 'SHRINKING DEATH', desc: 'Halka zamanla daralır.',
    R0: 360, Rmin: 170, shrink: 2.7, gaps: 2, gapHalf: deg(17.5), rot: 0.8,
    sudden: 55, grow: 0.02, gapMax: 1.0, bump: false
  },
  gauntlet: {
    key: 'gauntlet', name: 'THE GAUNTLET', desc: '4 kapı, çılgın dönüş, ani ölümde kapılar patlar.',
    R0: 360, Rmin: 360, shrink: 0, gaps: 4, gapHalf: deg(12), rot: 1.5,
    sudden: 22, grow: 0.05, gapMax: 0.7, bump: false
  }
};
export const MAP_KEYS = Object.keys(MAPS);

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function newEnv(map, rot0) {
  return { map, t: 0, rot: rot0, R: map.R0, gh: map.gapHalf };
}

export function advanceEnv(env) {
  const m = env.map;
  env.t += DT;
  env.rot += m.rot * DT;
  env.R = Math.max(m.Rmin, m.R0 - m.shrink * env.t);
  env.gh = Math.min(m.gapMax, m.gapHalf + Math.max(0, env.t - m.sudden) * m.grow);
}

export function gapInfo(env, ang) {
  const n = env.map.gaps;
  const step = (Math.PI * 2) / n;
  let best = Infinity;
  let center = 0;
  for (let k = 0; k < n; k++) {
    const c = env.rot + k * step;
    const d = Math.abs(wrapAngle(ang - c));
    if (d < best) { best = d; center = c; }
  }
  return { dist: best, center };
}

export function inGap(env, ang) {
  return gapInfo(env, ang).dist <= env.gh;
}

export function bumpers(env) {
  if (!env.map.bump) return [];
  const list = [{ x: 0, y: 0, r: BUMP_R }];
  for (let k = 0; k < 2; k++) {
    const a = -env.rot * 1.3 + k * Math.PI;
    list.push({ x: Math.cos(a) * ORB_DIST, y: Math.sin(a) * ORB_DIST, r: ORB_R });
  }
  return list;
}

export function ballR(b) { return b.armorT > 0 ? ARMOR_R : BALL_R; }
export function ballMass(b) {
  if (b.armorT > 0) return ARMOR_MASS;
  return b.dashT > 0 ? 1.8 : 1;
}

/* Girdi + sürtünme (tick başına bir kez) */
export function applyControl(b, ix, iy, dash, ev) {
  b.cd = Math.max(0, b.cd - DT);
  b.dashT = Math.max(0, b.dashT - DT);
  b.armorT = Math.max(0, b.armorT - DT);
  b.ghostT = Math.max(0, b.ghostT - DT);
  b.superT = Math.max(0, b.superT - DT);

  const il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; }
  b.vx += ix * ACC * DT;
  b.vy += iy * ACC * DT;

  if (dash && b.cd <= 0) {
    let dx = ix;
    let dy = iy;
    if (Math.hypot(dx, dy) < 0.1) { dx = Math.cos(b.f); dy = Math.sin(b.f); }
    const dl = Math.hypot(dx, dy) || 1;
    const mult = b.superT > 0 ? 2 : 1;
    b.vx += (dx / dl) * DASH_SPEED * mult;
    b.vy += (dy / dl) * DASH_SPEED * mult;
    b.cd = DASH_CD;
    b.dashT = DASH_TIME;
    if (b.superT > 0) b.superT = 0;
    if (ev) ev.push({ k: 'dash', id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), s: mult });
  }

  b.vx *= FRICTION;
  b.vy *= FRICTION;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) { b.vx = (b.vx / sp) * MAX_SPEED; b.vy = (b.vy / sp) * MAX_SPEED; }
  if (il > 0.1) b.f = Math.atan2(iy, ix);
  else if (sp > 30) b.f = Math.atan2(b.vy, b.vx);
}

/* Konum + bumper + halka. true döner: top arenadan çıktı (elenmeli) */
export function moveSub(b, env, sdt, rnd, ev) {
  b.x += b.vx * sdt;
  b.y += b.vy * sdt;
  const r = ballR(b);

  if (env.map.bump) {
    const list = bumpers(env);
    for (let i = 0; i < list.length; i++) {
      const bm = list[i];
      const dx = b.x - bm.x;
      const dy = b.y - bm.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d < bm.r + r) {
        const nx = dx / d;
        const ny = dy / d;
        b.x = bm.x + nx * (bm.r + r);
        b.y = bm.y + ny * (bm.r + r);
        const a = Math.atan2(ny, nx) + (rnd() - 0.5) * 1.3;
        const sp = Math.max(700, Math.hypot(b.vx, b.vy) * 1.05);
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        if (ev) ev.push({ k: 'bump', i, x: +bm.x.toFixed(1), y: +bm.y.toFixed(1) });
      }
    }
  }

  const d = Math.hypot(b.x, b.y);
  if (d + r >= env.R || d > env.R) {
    const ang = Math.atan2(b.y, b.x);
    const open = !(b.ghostT > 0) && inGap(env, ang);
    if (d > env.R && open) return true;
    if (!open) {
      const nx = b.x / d;
      const ny = b.y / d;
      b.x = nx * (env.R - r);
      b.y = ny * (env.R - r);
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= (1 + WALL_REST) * vn * nx;
        b.vy -= (1 + WALL_REST) * vn * ny;
        if (ev && vn > 120) ev.push({ k: 'wall', x: +b.x.toFixed(1), y: +b.y.toFixed(1), s: +Math.min(1, vn / 700).toFixed(2) });
      }
    }
  }
  return false;
}
