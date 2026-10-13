import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import {
  DT, SUB, ARMOR_T, GHOST_T, SUPER_T, PU_R, PU_TYPES, BUMP_R, ORB_DIST,
  MAPS, MAP_KEYS, newEnv, advanceEnv, gapInfo, ballR, ballMass,
  applyControl, moveSub
} from './public/shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------ Sabitler ------------------------------ */
const TICK = 30;
const MAX_PLAYERS = 16;
const COUNTDOWN = 3;
const OVER_TIME = 7;
const SPAWN_R = 280;
const GRACE_MS = 5000; // bağlantı kopunca topu elenmeden önce bekleme
const PU_FIRST = 8;
const PU_LIFE = 14;
const PU_MAX = 3;

const COUNTRIES = [
  ['TR', 'Turkey'], ['ZA', 'South Africa'], ['NO', 'Norway'], ['CN', 'China'],
  ['PK', 'Pakistan'], ['US', 'USA'], ['GB', 'UK'], ['DE', 'Germany'],
  ['FR', 'France'], ['JP', 'Japan'], ['BR', 'Brazil'], ['AR', 'Argentina'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['KR', 'S. Korea'], ['NL', 'Netherlands']
].map(([code, name]) => ({ code, name }));
const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
const MAP_CHOICES = new Set([...MAP_KEYS, 'random']);

/* ------------------------------ Yardımcılar ------------------------------ */
const rooms = new Map();
const pidRoom = new Map(); // pid -> oda kodu
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^ARENA-[A-Z0-9]{4}$/;
const PID_RE = /^[A-Za-z0-9_-]{8,40}$/;

function makeCode() {
  for (;;) {
    let s = '';
    for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const code = 'ARENA-' + s;
    if (!rooms.has(code)) return code;
  }
}

function normCode(c) {
  let s = String(c || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s.startsWith('ARENA-')) s = 'ARENA-' + s.replace(/^ARENA/, '').replace(/^-/, '');
  return s;
}

function cleanName(n) {
  const s = String(n || '').replace(/[<>&"'`]/g, '').trim().slice(0, 14);
  return s || 'Player';
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safe(fn) {
  return (...args) => {
    try { fn(...args); } catch (e) { console.error('handler error:', e); }
  };
}

function freeCountry(room, wanted, selfId) {
  const taken = new Set();
  for (const p of room.players.values()) if (p.id !== selfId) taken.add(p.country);
  if (COUNTRY_CODES.has(wanted) && !taken.has(wanted)) return wanted;
  const free = COUNTRIES.find((c) => !taken.has(c.code));
  return free ? free.code : COUNTRIES[0].code;
}

function balancedTeam(room) {
  let a = 0;
  let b = 0;
  for (const p of room.players.values()) (p.team === 'A' ? a++ : b++);
  return a <= b ? 'A' : 'B';
}

function roomState(room) {
  return {
    code: room.code,
    mode: room.mode,
    map: room.map,
    phase: room.phase,
    host: room.host,
    max: MAX_PLAYERS,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, country: p.country, team: p.team, off: p.dcAt > 0
    }))
  };
}

function pushRoom(room) {
  io.to(room.code).emit('roomState', roomState(room));
  scheduleRooms();
}

/* Lobi (oda listesi) */
let roomsTimer = null;
function scheduleRooms() {
  if (roomsTimer) return;
  roomsTimer = setTimeout(() => {
    roomsTimer = null;
    io.to('browse').emit('rooms', roomList());
  }, 150);
}
function roomList() {
  return [...rooms.values()].map((r) => {
    const host = r.players.get(r.host);
    return {
      code: r.code, host: host ? host.name : '-', count: r.players.size, max: MAX_PLAYERS,
      phase: r.phase, mode: r.mode, map: r.map,
      status: r.players.size >= MAX_PLAYERS ? 'full' : r.phase === 'lobby' ? 'lobby' : 'playing'
    };
  }).sort((a, b) => (a.status === b.status ? 0 : a.status === 'lobby' ? -1 : 1));
}

function sendTo(player, ev, data) {
  if (player && player.sid) io.to(player.sid).emit(ev, data);
}

/* ------------------------------ Oyun başlatma ------------------------------ */
function gameInfo(room) {
  const g = room.game;
  return {
    mode: room.mode,
    map: g.mapKey,
    mapName: MAPS[g.mapKey].name,
    total: g.total,
    roster: g.roster,
    elims: g.balls.filter((b) => !b.alive).sort((a, b) => b.rank - a.rank).map((b) => ({ id: b.id, rank: b.rank }))
  };
}

function startGame(room, botCount) {
  const humans = [...room.players.values()].filter((p) => p.dcAt === 0);
  const bots = Math.max(0, Math.min(MAX_PLAYERS - humans.length, Math.floor(botCount) || 0));
  const used = new Set(humans.map((h) => h.country));
  const freeCountries = shuffle(COUNTRIES.filter((c) => !used.has(c.code)));

  let aCount = humans.filter((h) => h.team === 'A').length;
  let bCount = humans.length - aCount;
  const entries = humans.map((h) => ({ id: h.id, name: h.name, country: h.country, team: h.team, bot: false }));
  for (let i = 0; i < bots; i++) {
    const c = freeCountries[i];
    let team = 'A';
    if (room.mode === 'TEAM') {
      team = aCount <= bCount ? 'A' : 'B';
      if (team === 'A') aCount++; else bCount++;
    }
    entries.push({ id: 'bot' + i, name: c.name, country: c.code, team, bot: true });
  }

  if (entries.length < 2) return 'En az 2 oyuncu gerekli (bot ekleyebilirsin).';
  if (room.mode === 'TEAM') {
    if (new Set(entries.map((e) => e.team)).size < 2) return 'Takım modunda iki takımda da oyuncu olmalı.';
  } else {
    entries.forEach((e) => { e.team = 'F'; });
  }

  if (room.mode === 'TEAM') entries.sort((x, y) => (x.team < y.team ? -1 : x.team > y.team ? 1 : 0));
  else shuffle(entries);

  const mapKey = room.map === 'random' ? MAP_KEYS[Math.floor(Math.random() * MAP_KEYS.length)] : room.map;
  const map = MAPS[mapKey];
  const n = entries.length;
  const balls = entries.map((e, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id: e.id, name: e.name, country: e.country, team: e.team, bot: e.bot,
      x: Math.cos(ang) * SPAWN_R, y: Math.sin(ang) * SPAWN_R, vx: 0, vy: 0, f: ang + Math.PI,
      cd: 0, dashT: 0, armorT: 0, ghostT: 0, superT: 0,
      ix: 0, iy: 0, dashQ: false, inQ: [], ack: 0,
      alive: true, rank: 0, target: null, retarget: 0, noise: 0, skill: 0.6 + Math.random() * 0.4
    };
  });

  room.game = {
    mapKey,
    env: newEnv(map, Math.random() * Math.PI * 2),
    balls,
    byId: new Map(balls.map((b) => [b.id, b])),
    roster: entries.map((e) => ({ id: e.id, name: e.name, country: e.country, countryName: COUNTRY_NAME[e.country], team: e.team, bot: e.bot })),
    pus: [],
    puId: 1,
    nextPU: PU_FIRST,
    countdown: COUNTDOWN,
    phase: 'countdown',
    overT: 0,
    ev: [],
    total: n
  };
  room.phase = 'playing';
  io.to(room.code).emit('gameStart', gameInfo(room));
  pushRoom(room);
  return null;
}

function aliveBalls(g) { return g.balls.filter((b) => b.alive); }

function checkOver(room) {
  const g = room.game;
  if (!g || g.phase === 'over') return;
  const alive = aliveBalls(g);
  let over = false;
  let team = null;
  if (room.mode === 'TEAM') {
    const teams = new Set(alive.map((b) => b.team));
    if (teams.size <= 1) { over = true; team = alive.length ? alive[0].team : null; }
  } else if (alive.length <= 1) {
    over = true;
  }
  if (!over) return;
  g.phase = 'over';
  g.overT = 0;
  alive.forEach((b) => { b.rank = 1; });
  g.ev.push({ k: 'over', ids: alive.map((b) => b.id), team });
}

function eliminate(room, b, quit) {
  const g = room.game;
  const aliveBefore = aliveBalls(g).length;
  b.alive = false;
  b.rank = aliveBefore;
  g.ev.push({ k: 'elim', id: b.id, rank: b.rank, x: +b.x.toFixed(1), y: +b.y.toFixed(1), q: quit ? 1 : 0 });
  checkOver(room);
}

/* ------------------------------ Power-up ------------------------------ */
function spawnPowerup(g) {
  const env = g.env;
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (env.R - 90);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (env.map.bump) {
      if (d < BUMP_R + 50) continue;
      if (Math.abs(d - ORB_DIST) < 75) continue;
    }
    if (g.pus.some((p) => Math.hypot(p.x - x, p.y - y) < 120)) continue;
    const type = Math.floor(Math.random() * PU_TYPES.length);
    g.pus.push({ id: g.puId++, type, x: +x.toFixed(1), y: +y.toFixed(1), life: PU_LIFE });
    g.ev.push({ k: 'puSpawn', x, y, type });
    return;
  }
}

function updatePowerups(g, alive) {
  if (g.env.t >= g.nextPU && g.pus.length < PU_MAX) {
    spawnPowerup(g);
    g.nextPU = g.env.t + 15 + Math.random() * 5;
  }
  for (let i = g.pus.length - 1; i >= 0; i--) {
    const p = g.pus[i];
    p.life -= DT;
    if (p.life <= 0 || Math.hypot(p.x, p.y) > g.env.R - 20) { g.pus.splice(i, 1); continue; }
    for (const b of alive) {
      if (!b.alive) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < ballR(b) + PU_R) {
        if (p.type === 0) b.armorT = ARMOR_T;
        else if (p.type === 1) { b.cd = 0; b.superT = SUPER_T; }
        else b.ghostT = GHOST_T;
        g.ev.push({ k: 'pickup', id: b.id, type: p.type, x: p.x, y: p.y });
        g.pus.splice(i, 1);
        break;
      }
    }
  }
}

/* ------------------------------ Bot yapay zekası (davranış ağacı) ------------------------------ */
function botThink(room, g, b) {
  const env = g.env;
  const R = env.R;
  const d = Math.hypot(b.x, b.y) || 1;
  const gi = gapInfo(env, Math.atan2(b.y, b.x));
  b.ix = 0; b.iy = 0; b.dashQ = false;

  // 1) PANİK: kapıya yakınım -> merkeze kaç / dash at
  if (d > R - 140 && gi.dist <= env.gh + 0.55 && !(b.ghostT > 0) && Math.random() < 0.55 + 0.45 * b.skill) {
    b.ix = -b.x / d;
    b.iy = -b.y / d;
    if (b.cd <= 0 && (b.vx * b.x + b.vy * b.y) / d > 60) b.dashQ = true;
    return;
  }

  const isEnemy = (o) => o.alive && o.id !== b.id && (room.mode !== 'TEAM' || o.team !== b.team);
  const goto = (tx, ty, power = 1) => {
    const dx = tx - b.x;
    const dy = ty - b.y;
    const l = Math.hypot(dx, dy) || 1;
    b.ix = (dx / l) * power;
    b.iy = (dy / l) * power;
  };

  // 2) POWER-UP: en yakın bot ona gider
  let wantPU = null;
  for (const p of g.pus) {
    let nearest = null;
    let nd = Infinity;
    for (const o of g.balls) {
      if (!o.alive || !o.bot) continue;
      const dd = Math.hypot(o.x - p.x, o.y - p.y);
      if (dd < nd) { nd = dd; nearest = o; }
    }
    if (nearest === b && nd < 650) { wantPU = p; break; }
  }
  if (wantPU) { goto(wantPU.x, wantPU.y); return; }

  // 3) SALDIRI: kapıya yakın / zayıf rakibi seç, kapı yönüne sür
  b.retarget -= DT;
  if (b.retarget <= 0 || !b.target || !b.target.alive) {
    let best = null;
    let bs = -Infinity;
    for (const o of g.balls) {
      if (!isEnemy(o)) continue;
      const od = Math.hypot(o.x, o.y);
      const og = gapInfo(env, Math.atan2(o.y, o.x));
      const weak = Math.pow(od / R, 2) * 1.4 + (1 - Math.min(1, og.dist / 1.2)) - Math.hypot(o.x - b.x, o.y - b.y) / 900 - (o.armorT > 0 && !(b.armorT > 0) ? 1.5 : 0);
      if (weak > bs) { bs = weak; best = o; }
    }
    b.target = best;
    b.retarget = 0.35 + Math.random() * 0.4;
    b.noise = (Math.random() - 0.5) * (1.1 - b.skill);
  }
  const t = b.target;
  if (t) {
    const tg = gapInfo(env, Math.atan2(t.y, t.x));
    const gx = Math.cos(tg.center) * R;
    const gy = Math.sin(tg.center) * R;
    let px = gx - t.x;
    let py = gy - t.y;
    const pl = Math.hypot(px, py) || 1;
    px /= pl; py /= pl; // itiş yönü (kapıya doğru)
    const standOff = ballR(t) + ballR(b) + 10;
    const ax = t.x - px * standOff;
    const ay = t.y - py * standOff;
    const dAttack = Math.hypot(ax - b.x, ay - b.y);
    const dT = Math.hypot(t.x - b.x, t.y - b.y);
    if (dAttack > 100 && dT > 130) {
      goto(ax, ay);
    } else {
      goto(t.x, t.y);
      const ux = (t.x - b.x) / (dT || 1);
      const uy = (t.y - b.y) / (dT || 1);
      if (dT < 170 && b.cd <= 0 && ux * px + uy * py > 0.35 && Math.random() < 0.35 + 0.4 * b.skill) b.dashQ = true;
    }
    const a = Math.atan2(b.iy, b.ix) + b.noise * 0.6;
    const l = Math.hypot(b.ix, b.iy);
    b.ix = Math.cos(a) * l;
    b.iy = Math.sin(a) * l;
    // halkaya yaklaşıyorsam merkeze doğru bük
    if (d > R - 90) { b.ix += (-b.x / d) * 0.8; b.iy += (-b.y / d) * 0.8; }
    return;
  }

  // 4) Bekle: kendi açısında güvenli yarıçapta dur
  const hold = Math.max(110, R * 0.45);
  goto((b.x / d) * hold, (b.y / d) * hold, 0.5);
}

/* ------------------------------ Fizik ------------------------------ */
function collide(room, g, a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  const min = ballR(a) + ballR(b);
  if (d >= min) return;
  if (d < 0.001) { dx = 1; dy = 0; d = 1; }
  const nx = dx / d;
  const ny = dy / d;
  const ma = ballMass(a);
  const mb = ballMass(b);
  const overlap = min - d;
  a.x -= nx * overlap * (mb / (ma + mb));
  a.y -= ny * overlap * (mb / (ma + mb));
  b.x += nx * overlap * (ma / (ma + mb));
  b.y += ny * overlap * (ma / (ma + mb));
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  let e = 1;
  if (room.mode === 'TEAM') e = a.team === b.team ? 0.45 : 1.5;
  if (a.armorT > 0 || b.armorT > 0) e = Math.max(e, a.team === b.team && room.mode === 'TEAM' ? 0.9 : 1.7);
  const j = (-(1 + e) * vn) / (1 / ma + 1 / mb);
  a.vx -= (j * nx) / ma; a.vy -= (j * ny) / ma;
  b.vx += (j * nx) / mb; b.vy += (j * ny) / mb;
  if (-vn > 60) {
    g.ev.push({
      k: 'hit', x: +((a.x + b.x) / 2).toFixed(1), y: +((a.y + b.y) / 2).toFixed(1),
      s: +Math.min(1, -vn / 700).toFixed(2), h: (a.armorT > 0 || b.armorT > 0) ? 1 : 0
    });
  }
}

function stepGame(room) {
  const g = room.game;
  const env = g.env;
  const map = env.map;

  if (g.phase === 'over') {
    env.rot += map.rot * DT;
    g.overT += DT;
    if (g.overT >= OVER_TIME) endGame(room);
    return;
  }
  if (g.phase === 'countdown') {
    env.rot += map.rot * DT;
    g.balls.forEach((b) => { b.inQ.length = 0; });
    g.countdown -= DT;
    if (g.countdown <= 0) { g.phase = 'play'; g.ev.push({ k: 'go' }); }
    return;
  }

  advanceEnv(env);
  const alive = aliveBalls(g);

  for (const b of alive) {
    if (b.bot) {
      botThink(room, g, b);
    } else {
      const p = room.players.get(b.id);
      if (!p || p.dcAt > 0) { b.ix = 0; b.iy = 0; b.dashQ = false; b.inQ.length = 0; }
      else {
        const i = b.inQ.shift();
        if (i) { b.ix = i.x; b.iy = i.y; b.dashQ = i.d; b.ack = i.s; } else b.dashQ = false;
      }
    }
    applyControl(b, b.ix, b.iy, b.dashQ, g.ev);
    b.dashQ = false;
  }

  const sdt = DT / SUB;
  for (let s = 0; s < SUB; s++) {
    for (const b of alive) {
      if (!b.alive) continue;
      if (moveSub(b, env, sdt, Math.random, g.ev)) eliminate(room, b, false);
    }
    const live = alive.filter((b) => b.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) collide(room, g, live[i], live[j]);
    }
  }
  if (g.phase === 'play') updatePowerups(g, alive);
}

function sendSnapshot(room) {
  const g = room.game;
  const alive = aliveBalls(g);
  let spec = 0;
  for (const p of room.players.values()) {
    if (p.dcAt > 0) continue;
    const b = g.byId.get(p.id);
    if (!b || !b.alive) spec++;
  }
  const ak = {};
  for (const b of alive) if (!b.bot) ak[b.id] = b.ack;
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const snap = {
    ph: g.phase,
    cd: Math.max(0, Math.ceil(g.countdown)),
    t: r2(g.env.t),
    rot: +g.env.rot.toFixed(4),
    R: r1(g.env.R),
    gh: +g.env.gh.toFixed(4),
    left: alive.length,
    sp: spec,
    ak,
    b: alive.map((b) => [
      b.id, r1(b.x), r1(b.y), Math.round(b.vx), Math.round(b.vy), r2(b.f),
      r2(b.cd), r2(b.armorT), r2(b.ghostT), r2(b.superT), r2(b.dashT)
    ]),
    pu: g.pus.map((p) => [p.id, p.type, p.x, p.y, r1(p.life)]),
    ev: g.ev
  };
  g.ev = [];
  io.to(room.code).emit('snap', snap);
}

function endGame(room) {
  room.game = null;
  room.phase = 'lobby';
  for (const p of [...room.players.values()]) {
    if (p.gone) removePlayer(room, p.id);
  }
  if (!rooms.has(room.code)) return;
  io.to(room.code).emit('toLobby');
  pushRoom(room);
}

let secTick = 0;
setInterval(() => {
  for (const room of [...rooms.values()]) {
    try {
      if (room.game) {
        stepGame(room);
        if (room.game) sendSnapshot(room);
      }
    } catch (e) { console.error('tick error:', e); }
  }
  if (++secTick >= TICK) { secTick = 0; sweep(); }
}, 1000 / TICK);

/* ------------------------------ Oda yönetimi ------------------------------ */
function sweep() {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    for (const p of [...room.players.values()]) {
      if (p.dcAt > 0 && now - p.dcAt > GRACE_MS) {
        if (room.game) {
          const b = room.game.byId.get(p.id);
          if (b && b.alive) eliminate(room, b, true);
          p.gone = true;
        } else {
          removePlayer(room, p.id);
        }
      }
    }
    if (!rooms.has(room.code)) continue;
    const anyOn = [...room.players.values()].some((p) => p.dcAt === 0 || now - p.dcAt <= GRACE_MS);
    if (!anyOn) destroyRoom(room);
  }
}

function destroyRoom(room) {
  for (const p of room.players.values()) pidRoom.delete(p.id);
  rooms.delete(room.code);
  scheduleRooms();
}

function removePlayer(room, pid) {
  const p = room.players.get(pid);
  if (!p) return;
  room.players.delete(pid);
  pidRoom.delete(pid);
  if (room.game) {
    const b = room.game.byId.get(pid);
    if (b && b.alive) eliminate(room, b, true);
  }
  if (room.players.size === 0) { rooms.delete(room.code); scheduleRooms(); return; }
  if (room.host === pid) {
    const next = [...room.players.values()].find((x) => x.dcAt === 0) || room.players.values().next().value;
    room.host = next.id;
  }
  pushRoom(room);
}

io.on('connection', (socket) => {
  let pid = socket.handshake.auth && socket.handshake.auth.pid;
  if (typeof pid !== 'string' || !PID_RE.test(pid)) pid = 'p' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  socket.data.pid = pid;

  const curRoom = () => rooms.get(pidRoom.get(pid));
  const me = () => { const r = curRoom(); return r ? r.players.get(pid) : null; };

  // Tekrar bağlanma
  const existing = curRoom();
  if (existing && existing.players.get(pid)) {
    const p = existing.players.get(pid);
    p.sid = socket.id;
    p.dcAt = 0;
    p.gone = false;
    socket.join(existing.code);
    socket.emit('resume', { id: pid, code: existing.code });
    if (existing.game) socket.emit('gameStart', gameInfo(existing));
    pushRoom(existing);
  } else {
    socket.join('browse');
    socket.emit('rooms', roomList());
  }

  const enter = (room, data) => {
    const player = {
      id: pid, sid: socket.id, name: cleanName(data.name),
      country: freeCountry(room, data.country, pid), team: balancedTeam(room), dcAt: 0, gone: false
    };
    room.players.set(pid, player);
    pidRoom.set(pid, room.code);
    socket.leave('browse');
    socket.join(room.code);
  };

  const leave = () => {
    const room = curRoom();
    if (!room) return;
    socket.leave(room.code);
    socket.join('browse');
    removePlayer(room, pid);
    socket.emit('rooms', roomList());
  };

  socket.on('listRooms', safe(() => socket.emit('rooms', roomList())));

  socket.on('createRoom', safe((data, cb) => {
    if (typeof cb !== 'function') return;
    if (curRoom()) leave();
    const room = { code: makeCode(), mode: 'FFA', map: 'classic', phase: 'lobby', players: new Map(), host: pid, game: null };
    rooms.set(room.code, room);
    enter(room, data || {});
    cb({ ok: true, id: pid, code: room.code });
    pushRoom(room);
  }));

  socket.on('joinRoom', safe((data, cb) => {
    if (typeof cb !== 'function') return;
    data = data || {};
    const code = normCode(data.code);
    if (!CODE_RE.test(code)) return cb({ ok: false, error: 'Geçersiz oda kodu. Örnek: ARENA-AB12' });
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: 'Oda bulunamadı.' });
    if (curRoom() === room) return cb({ ok: true, id: pid, code });
    if (room.players.size >= MAX_PLAYERS) return cb({ ok: false, error: 'Oda dolu.' });
    if (curRoom()) leave();
    enter(room, data);
    cb({ ok: true, id: pid, code, spectating: room.phase !== 'lobby' });
    if (room.game) socket.emit('gameStart', gameInfo(room));
    pushRoom(room);
  }));

  socket.on('setProfile', safe((data) => {
    const room = curRoom();
    const p = me();
    if (!p || room.phase !== 'lobby' || !data) return;
    if (data.name !== undefined) p.name = cleanName(data.name);
    if (data.country !== undefined) p.country = freeCountry(room, data.country, pid);
    if (data.team === 'A' || data.team === 'B') p.team = data.team;
    pushRoom(room);
  }));

  socket.on('setMode', safe((mode) => {
    const room = curRoom();
    if (!room || room.host !== pid || room.phase !== 'lobby') return;
    if (mode === 'FFA' || mode === 'TEAM') { room.mode = mode; pushRoom(room); }
  }));

  socket.on('setMap', safe((key) => {
    const room = curRoom();
    if (!room || room.host !== pid || room.phase !== 'lobby') return;
    if (MAP_CHOICES.has(key)) { room.map = key; pushRoom(room); }
  }));

  socket.on('startGame', safe((data, cb) => {
    const reply = typeof cb === 'function' ? cb : () => {};
    const room = curRoom();
    if (!room || room.host !== pid) return reply({ ok: false, error: 'Sadece oda sahibi başlatabilir.' });
    if (room.phase !== 'lobby') return reply({ ok: false, error: 'Oyun zaten başladı.' });
    const err = startGame(room, Number(data && data.bots) || 0);
    reply(err ? { ok: false, error: err } : { ok: true });
  }));

  // İstemci tahmini için numaralı girdi: {s: seq, x, y, d: dash}
  socket.on('inp', safe((data) => {
    const room = curRoom();
    const g = room && room.game;
    const b = g && g.byId.get(pid);
    if (!b || !b.alive || !data || g.phase !== 'play') return;
    const s = Math.floor(Number(data.s));
    let x = Number(data.x);
    let y = Number(data.y);
    if (!Number.isFinite(s) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    if (s <= b.ack) return;
    b.inQ.push({ s, x, y, d: !!data.d });
    if (b.inQ.length > 6) b.inQ.shift();
  }));

  socket.on('leaveRoom', safe(() => leave()));

  socket.on('disconnect', safe(() => {
    const p = me();
    if (p && p.sid === socket.id) p.dcAt = Date.now();
    const room = curRoom();
    if (room) pushRoom(room);
  }));
});

server.listen(PORT, () => {
  console.log(`LAST ONE WINS! http://localhost:${PORT}`);
});
