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
export const MODES = ['FFA', 'TEAM', 'BOMB', 'HILL', 'SOCCER', 'COINS', 'RACE'];
export const SIZES = ['small', 'standard', 'large'];
export const SIZE_K = { small: 0.8, standard: 1, large: 1.25 };
export const COINS_TIME = 60;
export const SOCCER_R = 20;
export const SOCCER_TIME = 120;
export const GOAL_TARGET = 5;
export const BOMB_TIME = 9;
export const HILL_R = 110;
export const HILL_TIME = 60;
export const PU_R = 24;
export const PU_TYPES = ['armor', 'super', 'ghost'];

/* ELIMINATION RACE (Plinko): dikey çivili tahta. Orijin = tuval merkezi; y aşağı doğru artar. */
export const RACE = (() => {
  const halfW = 420;
  const pegs = [];
  [-210, -130, -50, 30, 110, 190, 270, 350].forEach((y, i) => {
    const off = i % 2 ? 50 : 0;
    for (let x = -350 + off; x <= 350; x += 100) pegs.push({ x, y });
  });
  return { halfW, topY: -470, funnelY: -290, exitHalf: 130, redY: 470, pegR: 9, pegs, gravity: 1100, dashY: 520, bottomY: 560 };
})();

const deg = (d) => (d * Math.PI) / 180;

const base = { R0: 360, Rmin: 360, shrink: 0, gaps: 2, gapHalf: deg(17.5), rot: 0.7, sudden: 35, grow: 0.012, gapMax: 1.0,
  lava: null, pulseAmp: 0, pulsePeriod: 8, bumpers: [], friction: FRICTION, accMul: 1, gravity: 0, swirl: 0, hole: 0, col: '#FF2D85' };
const mk = (o) => Object.assign({}, base, o);

export const MAPS = {
  classic: mk({ key: 'classic', name: 'THE CLASSIC RING', desc: 'Dönen çift yarıklı neon çember.' }),
  collider: mk({
    key: 'collider', name: 'HYPER COLLIDER', desc: 'Ortada seni fırlatan bumper ve dönen tamponlar.', rot: 0.55, sudden: 40, col: '#a78bfa',
    bumpers: [
      { t: 'fixed', x: 0, y: 0, r: BUMP_R },
      { t: 'orbit', dist: ORB_DIST, r: ORB_R, speed: -1.3, phase: 0 },
      { t: 'orbit', dist: ORB_DIST, r: ORB_R, speed: -1.3, phase: Math.PI }
    ]
  }),
  shrinking: mk({
    key: 'shrinking', name: 'SHRINKING DEATH', desc: 'Halka zamanla daralır.', Rmin: 170, shrink: 2.7, rot: 0.8, sudden: 55, grow: 0.02, col: '#ff4d4d'
  }),
  gauntlet: mk({
    key: 'gauntlet', name: 'THE GAUNTLET', desc: '4 kapı, çılgın dönüş, ani ölümde kapılar patlar.',
    gaps: 4, gapHalf: deg(12), rot: 1.5, sudden: 22, grow: 0.05, gapMax: 0.7, col: '#f43f5e'
  }),
  ice: mk({
    key: 'ice', name: 'ICE RINK', desc: 'Buz gibi kaygan zemin: durmak zor, yönü bulmak zor.',
    friction: 0.993, accMul: 0.5, gapHalf: deg(20), rot: 0.6, col: '#67e8f9'
  }),
  whirlpool: mk({
    key: 'whirlpool', name: 'WHIRLPOOL', desc: 'Girdap seni sürekli döndürür; 3 kapı.',
    swirl: 170, gaps: 3, gapHalf: deg(15), rot: 0.45, sudden: 40, col: '#34d399'
  }),
  pinball: mk({
    key: 'pinball', name: 'PINBALL PIT', desc: '4 sabit tampon seni oradan oraya fırlatır.', rot: 0.6, sudden: 40, col: '#fb923c',
    bumpers: [
      { t: 'fixed', x: 140, y: 140, r: 40 }, { t: 'fixed', x: -140, y: 140, r: 40 },
      { t: 'fixed', x: 140, y: -140, r: 40 }, { t: 'fixed', x: -140, y: -140, r: 40 }
    ]
  }),
  pulse: mk({
    key: 'pulse', name: 'PULSE ARENA', desc: 'Halka nefes alır: sürekli genişler ve daralır.',
    pulseAmp: 95, pulsePeriod: 8, rot: 0.65, sudden: 45, col: '#f472b6'
  }),
  lava: mk({
    key: 'lava', name: 'LAVA FLOOR', desc: 'Zeminin dilimleri kızarır, sonra yakar! Kırmızıdan kaç.',
    gapHalf: deg(11), rot: 0.5, sudden: 60, col: '#ef4444', lava: { period: 5, warn: 2.4, active: 1.6, grace: 3 }
  }),
  blackhole: mk({
    key: 'blackhole', name: 'BLACK HOLE', desc: 'Merkez seni çeker; içine düşersen elenirsin.',
    gravity: 140, hole: 46, gapHalf: deg(20), rot: 0.7, sudden: 40, col: '#c084fc'
  })
};
export const MAP_KEYS = Object.keys(MAPS);

/* Oyun moduna ve arena boyutuna göre harita kopyası: BOMB/HILL/COINS'te halka kapalıdır */
export function mapFor(key, mode, size = 'standard') {
  const m = Object.assign({}, MAPS[key] || MAPS.classic);
  const k = SIZE_K[size] || 1;
  if (k !== 1) {
    m.R0 *= k; m.Rmin *= k; m.pulseAmp *= k;
    m.bumpers = m.bumpers.map((bm) => (bm.t === 'orbit' ? { ...bm, dist: bm.dist * k } : { ...bm, x: bm.x * k, y: bm.y * k }));
  }
  if (mode === 'BOMB' || mode === 'HILL' || mode === 'COINS') { m.gapHalf = 0; m.gapMax = 0; m.grow = 0; }
  if (mode === 'SOCCER') {
    Object.assign(m, {
      key: 'soccer', name: 'FOOTBALL ARENA', desc: 'Kaleler yarığın olduğu iki uç.', col: '#22c55e', closed: true, gaps: 2, gapHalf: 0.42, gapMax: 0.42,
      rot: 0, grow: 0, shrink: 0, Rmin: m.R0, pulseAmp: 0, hole: 0, gravity: 0, swirl: 0, bumpers: [], friction: 0.985, accMul: 1, accMulBase: 1
    });
  }
  if (mode === 'HILL' || mode === 'COINS' || mode === 'SOCCER') m.lava = null;
  if (mode === 'HILL' || mode === 'COINS') { m.hole = 0; m.gravity = 0; m.shrink = 0; m.Rmin = m.R0; }
  if (mode === 'RACE') {
    Object.assign(m, {
      key: 'race', name: 'ELIMINATION RACE', desc: 'Çivili yarış.', col: '#ff2d85', race: true, closed: true,
      R0: 600, Rmin: 600, shrink: 0, rot: 0, gaps: 2, gapHalf: 0, gapMax: 0, grow: 0, pulseAmp: 0, hole: 0, gravity: 0,
      swirl: 0, bumpers: [], lava: null, friction: 0.985, accMul: 0.9, maxSpeed: 1000
    });
  }
  return m;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function newEnv(map, rot0) {
  return { map, t: 0, rot: rot0, R: map.R0, gh: map.gapHalf, gate: 0 };
}

export function advanceEnv(env) {
  const m = env.map;
  env.t += DT;
  env.rot += m.rot * DT;
  env.R = Math.max(m.Rmin, m.R0 - m.shrink * env.t);
  if (m.pulseAmp) env.R -= m.pulseAmp * (0.5 - 0.5 * Math.cos((Math.PI * 2 * env.t) / m.pulsePeriod));
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

/* Lav dilimleri: env.t'den deterministik üretilir (sunucu, istemci ve tahmin aynı sonucu bulur) */
export const LAVA_SECTORS = 8;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function lavaCycle(env) {
  const L = env.map.lava;
  if (!L) return null;
  const tt = env.t - L.grace;
  if (tt < 0) return { state: 0, sectors: [], left: -tt };
  const cyc = Math.floor(tt / L.period);
  const ph = tt - cyc * L.period;
  const state = ph < L.warn ? 1 : ph < L.warn + L.active ? 2 : 0;
  const r = rng(cyc * 7919 + 13);
  const all = Array.from({ length: LAVA_SECTORS }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const count = Math.min(6, 3 + Math.floor(cyc / 4));
  return { state, sectors: all.slice(0, count), left: state === 1 ? L.warn - ph : state === 2 ? L.warn + L.active - ph : L.period - ph };
}
export function lavaAt(env, ang) {
  const lc = lavaCycle(env);
  if (!lc || lc.state === 0) return 0;
  const step = (Math.PI * 2) / LAVA_SECTORS;
  const sec = Math.floor((((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / step);
  return lc.sectors.includes(sec) ? lc.state : 0;
}

export function inGap(env, ang) {
  return gapInfo(env, ang).dist <= env.gh;
}

export function bumpers(env) {
  return env.map.bumpers.map((bm) => {
    if (bm.t === 'orbit') {
      const a = bm.phase + env.rot * bm.speed;
      return { x: Math.cos(a) * bm.dist, y: Math.sin(a) * bm.dist, r: bm.r };
    }
    return { x: bm.x, y: bm.y, r: bm.r };
  });
}

export function ballR(b) { return b.armorT > 0 ? ARMOR_R : BALL_R; }
export function ballMass(b) {
  if (b.armorT > 0) return ARMOR_MASS;
  return b.dashT > 0 ? 1.8 : 1;
}

/* Yarış modu: yerçekimi + hafif yatay ivme; dash = hızlı aşağı dalış */
function raceControl(b, ix, iy, dash, ev, m) {
  const ixr = Math.max(-1, Math.min(1, ix));
  b.vx += ixr * ACC * m.accMul * DT;
  if (iy > 0) b.vy += Math.min(1, iy) * ACC * 0.5 * DT;
  b.vy += RACE.gravity * DT;
  if (dash && b.cd <= 0) {
    b.vx += ixr * 140;
    b.vy += RACE.dashY;
    b.cd = DASH_CD;
    b.dashT = DASH_TIME;
    if (ev) ev.push({ k: 'dash', id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), s: 1 });
  }
  b.vx *= m.friction;
  b.vy *= m.friction;
  const sp = Math.hypot(b.vx, b.vy);
  const mx = m.maxSpeed || MAX_SPEED;
  if (sp > mx) { b.vx = (b.vx / sp) * mx; b.vy = (b.vy / sp) * mx; }
  b.f = sp > 40 ? Math.atan2(b.vy, b.vx) : Math.PI / 2;
}

/* Girdi + sürtünme (tick başına bir kez) */
export function applyControl(b, ix, iy, dash, ev, env) {
  b.cd = Math.max(0, b.cd - DT);
  b.dashT = Math.max(0, b.dashT - DT);
  b.armorT = Math.max(0, b.armorT - DT);
  b.ghostT = Math.max(0, b.ghostT - DT);
  b.superT = Math.max(0, b.superT - DT);

  const m = env.map;
  if (m.race) return raceControl(b, ix, iy, dash, ev, m);
  const il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; }
  const acc = ACC * m.accMul;
  b.vx += ix * acc * DT;
  b.vy += iy * acc * DT;
  if (m.gravity || m.swirl) {
    const d = Math.hypot(b.x, b.y) || 1;
    if (m.gravity) { b.vx -= (b.x / d) * m.gravity * DT; b.vy -= (b.y / d) * m.gravity * DT; }
    if (m.swirl) { b.vx += (-b.y / d) * m.swirl * DT; b.vy += (b.x / d) * m.swirl * DT; }
  }

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

  b.vx *= m.friction;
  b.vy *= m.friction;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) { b.vx = (b.vx / sp) * MAX_SPEED; b.vy = (b.vy / sp) * MAX_SPEED; }
  if (il > 0.1) b.f = Math.atan2(iy, ix);
  else if (sp > 30) b.f = Math.atan2(b.vy, b.vx);
}

/* Konum + bumper + halka. true döner: top arenadan çıktı (elenmeli) */
function segCollide(b, r, ax, ay, bx, by, rest) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((b.x - ax) * abx + (b.y - ay) * aby) / (abx * abx + aby * aby)));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  let dx = b.x - cx;
  let dy = b.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= r) return false;
  if (d < 1e-6) { dx = -aby; dy = abx; d = Math.hypot(dx, dy) || 1; }
  const nx = dx / d;
  const ny = dy / d;
  b.x = cx + nx * r;
  b.y = cy + ny * r;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + rest) * vn * nx; b.vy -= (1 + rest) * vn * ny; }
  return true;
}

function raceMove(b, env, r, rnd, ev) {
  const hw = RACE.halfW;
  if (b.x < -hw + r) { b.x = -hw + r; if (b.vx < 0) b.vx *= -0.45; }
  if (b.x > hw - r) { b.x = hw - r; if (b.vx > 0) b.vx *= -0.45; }
  segCollide(b, r, -hw, RACE.topY, -RACE.exitHalf, RACE.funnelY, 0.35);
  segCollide(b, r, hw, RACE.topY, RACE.exitHalf, RACE.funnelY, 0.35);
  if (env.gate) segCollide(b, r, -RACE.exitHalf - 12, RACE.funnelY, RACE.exitHalf + 12, RACE.funnelY, 0.25);
  const lim = r + RACE.pegR;
  for (let i = 0; i < RACE.pegs.length; i++) {
    const p = RACE.pegs[i];
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d >= lim) continue;
    const nx = dx / d;
    const ny = dy / d;
    b.x = p.x + nx * lim;
    b.y = p.y + ny * lim;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const j = (rnd() - 0.5) * 0.3; // tepeye tam oturmayı engelleyen küçük sapma
      const c = Math.cos(j);
      const sn = Math.sin(j);
      const rx = nx * c - ny * sn;
      const ry = nx * sn + ny * c;
      b.vx -= 1.6 * vn * rx;
      b.vy -= 1.6 * vn * ry;
      if (ev && -vn > 220) ev.push({ k: 'peg', x: +p.x.toFixed(0), y: +p.y.toFixed(0), s: +Math.min(1, -vn / 800).toFixed(2) });
    }
  }
  return false;
}

export function moveSub(b, env, sdt, rnd, ev) {
  b.x += b.vx * sdt;
  b.y += b.vy * sdt;
  const r = ballR(b);
  if (env.map.race) return raceMove(b, env, r, rnd, ev);

  if (env.map.bumpers.length) {
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
  if (env.map.hole && d < env.map.hole && !(b.ghostT > 0)) return true; // kara delik
  if (env.map.lava && !(b.ghostT > 0) && lavaAt(env, Math.atan2(b.y, b.x)) === 2) return true; // lav
  if (d + r >= env.R || d > env.R) {
    const ang = Math.atan2(b.y, b.x);
    const open = !env.map.closed && !(b.ghostT > 0) && inGap(env, ang);
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
