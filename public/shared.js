/* Sunucu ve istemcinin ortak kullandığı fizik çekirdeği (client-side prediction için birebir aynı kod) */

export const DT = 1 / 30;
export const SUB = 2;
export const BALL_R = 26;
export const ARMOR_R = 34;
export const ACC = 390;
export const FRICTION = 0.98;
export const DASH_SPEED = 936;
export const DASH_CD = 1.5;
export const DASH_TIME = 0.25;
export const MAX_SPEED = 1950;
export const WALL_REST = 0.9;
export const ARMOR_T = 5;
export const GHOST_T = 3;
export const SUPER_T = 12;
export const ARMOR_MASS = 6;
export const BUMP_R = 64;
export const ORB_R = 34;
export const ORB_DIST = 190;
export const MODES = ['FFA', 'TEAM', 'BOMB', 'HILL', 'SOCCER', 'COINS', 'RACE', 'RUSH', 'RUSHT'];
export const isRush = (m) => m === 'RUSH' || m === 'RUSHT';
export const SIZES = ['small', 'standard', 'large'];
export const SIZE_K = { small: 0.95, standard: 1.2, large: 1.5 };
export const COINS_TIME = 60;
export const SOCCER_R = 20;
export const SOCCER_TIME = 120;
export const GOAL_TARGET = 5;
export const BOMB_TIME = 9;
export const HILL_R = 110;
export const HILL_TIME = 60;
export const PU_R = 24;
export const PU_TYPES = ['armor', 'super', 'ghost', 'shock'];
export const MUTATORS = ['none', 'turbo', 'slippery', 'magnet', 'bumpy', 'random'];
export const SKINS = [
  { id: 'none', lvl: 1 }, { id: 'gold', lvl: 3 }, { id: 'fire', lvl: 5 }, { id: 'ice', lvl: 8 }, { id: 'rainbow', lvl: 12 }
];

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

/* SURVIVOR OBSTACLE RUSH: soldan sağa uzun koridor. Orijin = koridor orta çizgisi (y), x = pist boyunca */
export const RUSH = { len: 6000, halfH: 360, startX: 150, finishX: 5800, padAcc: 2200 };

/* 3 parkur: r1 Gauntlet, r2 Laser Runway, r3 Gravity Slide */
export const RUSH_TRACK_KEYS = ['r1', 'r2', 'r3'];
export const RUSH_TRACK_NAMES = { r1: 'SURVIVOR: THE GAUNTLET', r2: 'SURVIVOR: LASER RUNWAY', r3: 'SURVIVOR: GRAVITY SLIDE' };
const NONE = { props: [], pads: [], bumps: [], gates: [], lasers: [], funnels: [], pistons: [] };
export const RUSH_TRACKS = {
  r1: {
    ...NONE,
    props: [
      { x: 1000, y: 0, L: 200, s: 2.1 }, { x: 2300, y: -130, L: 165, s: -2.6 }, { x: 2300, y: 150, L: 165, s: 2.6 },
      { x: 3700, y: 0, L: 215, s: 2.4 }, { x: 4900, y: -110, L: 170, s: -2.8 }, { x: 4900, y: 140, L: 170, s: 2.8 }
    ],
    pads: [{ x: 1500, w: 240, dir: 1 }, { x: 3000, w: 240, dir: 1 }, { x: 5200, w: 240, dir: 1 }],
    bumps: [
      { x: 1900, y: -190, r: 46 }, { x: 1900, y: 0, r: 46 }, { x: 1900, y: 190, r: 46 },
      { x: 3400, y: -210, r: 46 }, { x: 3400, y: 210, r: 46 },
      { x: 4400, y: -230, r: 46 }, { x: 4400, y: 0, r: 46 }, { x: 4400, y: 230, r: 46 }
    ],
    gates: [{ x: 2700, gy: -120, gap: 200 }, { x: 4100, gy: 130, gap: 190 }, { x: 5500, gy: 0, gap: 210 }]
  },
  r2: {
    ...NONE,
    // y0..y1: lazerin kapladığı aralık; per: periyot, on: açık kalma süresi, ph: faz
    lasers: [
      { x: 1000, y0: -360, y1: 360, per: 2.6, on: 1.0, ph: 0 },
      { x: 2500, y0: -360, y1: 0, per: 2.2, on: 1.1, ph: 0 }, { x: 2700, y0: 0, y1: 360, per: 2.2, on: 1.1, ph: 1.1 },
      { x: 4200, y0: -360, y1: 40, per: 2.4, on: 1.2, ph: 0 }, { x: 4400, y0: -40, y1: 360, per: 2.4, on: 1.2, ph: 1.2 }, { x: 4600, y0: -360, y1: 40, per: 2.4, on: 1.2, ph: 0.6 },
      { x: 5500, y0: -360, y1: 360, per: 2.6, on: 1.0, ph: 1.3 }
    ],
    funnels: [{ x: 1800, gap: 92 }, { x: 3400, gap: 88 }, { x: 5000, gap: 84 }],
    pads: [{ x: 1300, w: 220, dir: 1 }, { x: 3000, w: 220, dir: 1 }, { x: 3900, w: 220, dir: 1 }],
    bumps: [{ x: 2100, y: -240, r: 40 }, { x: 2100, y: 240, r: 40 }]
  },
  r3: {
    ...NONE,
    pads: [
      { x: 800, w: 220, dir: 1 }, { x: 1050, w: 220, dir: 1 },
      { x: 2350, w: 220, dir: 1 }, { x: 2650, w: 260, dir: -1 }, { x: 2950, w: 220, dir: 1 },
      { x: 4350, w: 220, dir: 1 }, { x: 4600, w: 220, dir: 1 }, { x: 5300, w: 220, dir: 1 }
    ],
    // side: -1 üst duvardan, 1 alt duvardan uzanır; maxLen: tam uzunluk; w: kalınlık
    pistons: [
      { x: 1600, side: -1, maxLen: 520, w: 70, per: 2.8, ph: 0 }, { x: 1800, side: 1, maxLen: 520, w: 70, per: 2.8, ph: 0.5 },
      { x: 2000, side: -1, maxLen: 520, w: 70, per: 2.8, ph: 0.25 },
      { x: 3300, side: -1, maxLen: 540, w: 80, per: 2.4, ph: 0 }, { x: 3300, side: 1, maxLen: 540, w: 80, per: 2.4, ph: 0.5 },
      { x: 3600, side: -1, maxLen: 540, w: 80, per: 2.4, ph: 0.5 }, { x: 3600, side: 1, maxLen: 540, w: 80, per: 2.4, ph: 0 },
      { x: 5000, side: -1, maxLen: 520, w: 70, per: 2.6, ph: 0.1 }, { x: 5000, side: 1, maxLen: 520, w: 70, per: 2.6, ph: 0.6 }
    ],
    bumps: [{ x: 3950, y: -150, r: 46 }, { x: 3950, y: 150, r: 46 }]
  }
};
export const rushTrack = (map) => RUSH_TRACKS[(map && map.track) || 'r1'] || RUSH_TRACKS.r1;
export const laserOn = (l, t) => ((t + l.ph) % l.per) < l.on;
export const pistonLen = (p, t) => p.maxLen * (0.5 - 0.5 * Math.cos((Math.PI * 2 * (t / p.per + p.ph))));

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
  greenring: mk({
    key: 'greenring', name: 'THE GREEN RING', desc: 'Tek dar kapılı zümrüt halka.', gaps: 1, gapHalf: deg(15), rot: 0.55, sudden: 50, grow: 0.012, col: '#22c55e'
  }),
  arenashrinks: mk({
    key: 'arenashrinks', name: 'THE ARENA SHRINKS!', desc: 'Tek kapılı altın halka saniyede 1 px daralır.', R0: 400, Rmin: 150, shrink: 1, gaps: 1, gapHalf: deg(15), rot: 0.6, sudden: 9999, grow: 0, col: '#facc15'
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
export function mapFor(key, mode, size = 'standard', mut = 'none') {
  const m = Object.assign({}, MAPS[key] || MAPS.classic);
  const k = SIZE_K[size] || 1;
  if (k !== 1) {
    m.R0 *= k; m.Rmin *= k; m.pulseAmp *= k; m.hole *= k;
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
  if (mode !== 'SOCCER' && mode !== 'RACE' && !isRush(mode)) {
    if (mut === 'turbo') m.accMul *= 1.5;
    else if (mut === 'slippery') { m.friction = 0.995; m.accMul *= 0.7; }
    else if (mut === 'magnet') m.gravity = Math.max(m.gravity, 450);
    else if (mut === 'bumpy') m.bumpers = m.bumpers.concat([
      { t: 'fixed', x: 0, y: -140 * k, r: BUMP_R * 0.7 }, { t: 'fixed', x: -125 * k, y: 85 * k, r: BUMP_R * 0.7 }, { t: 'fixed', x: 125 * k, y: 85 * k, r: BUMP_R * 0.7 }
    ]);
  }
  if (isRush(mode)) {
    Object.assign(m, {
      key: 'rush', name: 'SURVIVOR RUSH', desc: 'Engelli parkur yarışı.', col: '#22d3ee', rush: true, closed: true,
      R0: 600, Rmin: 600, shrink: 0, rot: 0, gaps: 2, gapHalf: 0, gapMax: 0, grow: 0, pulseAmp: 0, hole: 0, gravity: 0,
      swirl: 0, bumpers: [], lava: null, friction: 0.985, accMul: 1, wallX0: -520, wallV: 100, wallA: 0.9
    });
    m.track = RUSH_TRACK_KEYS.includes(key) ? key : 'r1';
    m.name = RUSH_TRACK_NAMES[m.track];
    if (m.track === 'r3') { m.friction = 0.99; m.accMul = 0.5; m.maxSpeed = 1100; m.col = '#67e8f9'; }
    if (m.track === 'r2') m.col = '#f43f5e';
  }
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
  if (env.sd) {
    env.sdX = (env.sdX || 0) + SD_V * DT; // ani ölüm: alan hızla daralır
    env.R = Math.max(Math.min(env.R, m.R0 * 0.5), env.R - env.sdX);
  }
  if (m.rush) env.R = m.wallX0 + m.wallV * env.t + m.wallA * env.t * env.t; // ölüm bariyerinin x konumu
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

export const SD_V = 7; // ani ölüm daralma hızı (px/sn, ivmeli birikir)
export const BIG_MAX = 3;
export function ballR(b) { return (b.armorT > 0 ? ARMOR_R : BALL_R) * (1 + 0.1 * (b.big || 0)); }
export function ballMass(b) {
  const g = 1 + 0.3 * (b.big || 0);
  if (b.armorT > 0) return ARMOR_MASS * g;
  return (b.dashT > 0 ? 1.8 : 1) * g;
}
export function dashCd(b) { return b.ag ? DASH_CD * 0.85 : DASH_CD; }

/* Yarış modu: yerçekimi + hafif yatay ivme; dash = hızlı aşağı dalış */
function raceControl(b, ix, iy, dash, ev, m) {
  const ixr = Math.max(-1, Math.min(1, ix));
  b.vx += ixr * ACC * m.accMul * (b.ag ? 1.15 : 1) * DT;
  if (iy > 0) b.vy += Math.min(1, iy) * ACC * 0.5 * DT;
  b.vy += RACE.gravity * DT;
  if (dash && b.cd <= 0) {
    b.vx += ixr * 140;
    b.vy += RACE.dashY;
    b.cd = dashCd(b);
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
  const acc = ACC * m.accMul * (b.ag ? 1.15 : 1);
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
    b.cd = dashCd(b);
    b.dashT = DASH_TIME;
    if (b.superT > 0) b.superT = 0;
    if (ev) ev.push({ k: 'dash', id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), s: mult });
  }

  b.vx *= m.friction;
  b.vy *= m.friction;
  const sp = Math.hypot(b.vx, b.vy);
  const msp = m.maxSpeed || MAX_SPEED;
  if (sp > msp) { b.vx = (b.vx / sp) * msp; b.vy = (b.vy / sp) * msp; }
  if (il > 0.1) b.f = Math.atan2(iy, ix);
  else if (sp > 30) b.f = Math.atan2(b.vy, b.vx);
}

/* Konum + bumper + halka. true döner: top arenadan çıktı (elenmeli) */
function segCollide(b, r, ax, ay, bx, by, rest) {
  const abx = bx - ax;
  const aby = by - ay;
  const l2 = abx * abx + aby * aby;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((b.x - ax) * abx + (b.y - ay) * aby) / l2));
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

function rushMove(b, env, r, rnd, ev) {
  const hh = RUSH.halfH;
  const T = rushTrack(env.map);
  if (b.y < -hh + r) { b.y = -hh + r; if (b.vy < 0) b.vy *= -0.5; }
  if (b.y > hh - r) { b.y = hh - r; if (b.vy > 0) b.vy *= -0.5; }
  // hızlandırma bantları (dir: +1 ileri, -1 geri)
  for (const p of T.pads) if (b.x > p.x - p.w / 2 && b.x < p.x + p.w / 2) b.vx += (p.dir || 1) * RUSH.padAcc * (DT / SUB);
  // dönen pervaneler
  for (const p of T.props) {
    if (b.x < p.x - p.L - 60 || b.x > p.x + p.L + 60) continue;
    const a = p.s * env.t;
    const c = Math.cos(a) * p.L;
    const sn = Math.sin(a) * p.L;
    if (segCollide(b, r + 12, p.x - c, p.y - sn, p.x + c, p.y + sn, 1.5)) {
      const k = Math.hypot(b.x - p.x, b.y - p.y) || 1;
      b.vx += ((b.x - p.x) / k) * 260;
      b.vy += ((b.y - p.y) / k) * 260;
      if (ev) ev.push({ k: 'rushHit', x: +b.x.toFixed(0), y: +b.y.toFixed(0) });
    }
  }
  // lazerler: aktifken çarpanı sertçe geri püskürtür
  for (const l of T.lasers) {
    if (b.x < l.x - r - 14 || b.x > l.x + r + 14 || b.y < l.y0 - r || b.y > l.y1 + r) continue;
    if (!laserOn(l, env.t)) continue;
    const side = b.x >= l.x ? 1 : -1;
    b.x = l.x + side * (r + 16);
    b.vx = side * 700 - 650;
    b.vy += (rnd() - 0.5) * 300;
    if (ev) ev.push({ k: 'rushHit', x: +l.x.toFixed(0), y: +b.y.toFixed(0) });
  }
  // pistonlar
  for (const p of T.pistons) {
    if (b.x < p.x - p.w - r - 20 || b.x > p.x + p.w + r + 20) continue;
    const len = pistonLen(p, env.t);
    const y0 = p.side * hh;
    const y1 = p.side * (hh - len);
    if (segCollide(b, r + p.w / 2, p.x, y0, p.x, y1, 1.1)) {
      b.vy += p.side * -120;
      if (ev && len > 20) ev.push({ k: 'rushHit', x: +p.x.toFixed(0), y: +y1.toFixed(0) });
    }
  }
  // tamponlar
  for (const bm of T.bumps) {
    const dx = b.x - bm.x;
    const dy = b.y - bm.y;
    if (dx > 140 || dx < -140) continue;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d < bm.r + r) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = bm.x + nx * (bm.r + r);
      b.y = bm.y + ny * (bm.r + r);
      const sp = Math.max(750, Math.hypot(b.vx, b.vy) * 1.1);
      const a = Math.atan2(ny, nx) + (rnd() - 0.5) * 0.5;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      if (ev) ev.push({ k: 'rushHit', x: +b.x.toFixed(0), y: +b.y.toFixed(0) });
    }
  }
  // dar geçitler
  for (const g of T.gates) {
    if (b.x < g.x - 60 || b.x > g.x + 60) continue;
    segCollide(b, r + 14, g.x, -hh, g.x, g.gy - g.gap / 2, 0.4);
    segCollide(b, r + 14, g.x, g.gy + g.gap / 2, g.x, hh, 0.4);
  }
  // huni şeklinde dar boğazlar: topların tek tek sığdığı boyun
  for (const f of T.funnels) {
    if (b.x < f.x - 330 || b.x > f.x + 170) continue;
    const h = f.gap / 2;
    for (const sg of [-1, 1]) {
      segCollide(b, r + 4, f.x - 300, sg * hh, f.x, sg * h, 0.3);
      segCollide(b, r + 4, f.x, sg * h, f.x + 140, sg * h, 0.3);
    }
  }
  return false;
}

export function moveSub(b, env, sdt, rnd, ev) {
  b.x += b.vx * sdt;
  b.y += b.vy * sdt;
  const r = ballR(b);
  if (env.map.race) return raceMove(b, env, r, rnd, ev);
  if (env.map.rush) return rushMove(b, env, r, rnd, ev);

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
