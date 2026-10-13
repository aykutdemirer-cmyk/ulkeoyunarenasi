import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------ Sabitler ------------------------------ */
const TICK = 30;
const DT = 1 / TICK;
const SUBSTEPS = 2;
const RING_R = 360;
const GAP_HALF = (35 / 2) * Math.PI / 180; // her yarık 35 derece
const GAP_MAX = 1.0; // ani ölüm: yarıklar en fazla bu kadar genişler (rad, yarım açı)
const SUDDEN_AT = 35; // saniye
const GAP_GROW = 0.012; // rad/sn
const ROT_SPEED = 0.7; // rad/sn
const BALL_R = 26;
const MAX_PLAYERS = 16;
const FRICTION = 0.98;
const ACC = 300; // px/sn^2
const DASH_SPEED = 3 * 240; // anlık hız eklemesi (normal ivmenin 3 katı etki)
const DASH_CD = 2.0;
const DASH_TIME = 0.25;
const MAX_SPEED = 1500;
const WALL_REST = 0.9;
const COUNTDOWN = 3;
const OVER_TIME = 7;
const SPAWN_R = 220;

const COUNTRIES = [
  ['TR', 'Turkey'], ['ZA', 'South Africa'], ['NO', 'Norway'], ['CN', 'China'],
  ['PK', 'Pakistan'], ['US', 'USA'], ['GB', 'UK'], ['DE', 'Germany'],
  ['FR', 'France'], ['JP', 'Japan'], ['BR', 'Brazil'], ['AR', 'Argentina'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['KR', 'S. Korea'], ['NL', 'Netherlands']
].map(([code, name]) => ({ code, name }));
const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

/* ------------------------------ Yardımcılar ------------------------------ */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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
    phase: room.phase,
    host: room.host,
    max: MAX_PLAYERS,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, country: p.country, team: p.team
    }))
  };
}

function pushRoom(room) {
  io.to(room.code).emit('roomState', roomState(room));
}

/* ------------------------------ Oyun mantığı ------------------------------ */
function startGame(room, botCount) {
  const humans = [...room.players.values()];
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
    const teams = new Set(entries.map((e) => e.team));
    if (teams.size < 2) return 'Takım modunda iki takımda da oyuncu olmalı.';
  } else {
    entries.forEach((e) => { e.team = 'F'; });
  }

  if (room.mode === 'TEAM') entries.sort((x, y) => (x.team < y.team ? -1 : x.team > y.team ? 1 : 0));
  else shuffle(entries);

  const n = entries.length;
  const balls = entries.map((e, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id: e.id, name: e.name, country: e.country, team: e.team, bot: e.bot,
      x: Math.cos(ang) * SPAWN_R, y: Math.sin(ang) * SPAWN_R, vx: 0, vy: 0,
      ix: 0, iy: 0, f: ang + Math.PI, alive: true, rank: 0,
      dashQ: false, dashUntil: 0, cdUntil: 0, retarget: 0, target: null
    };
  });

  room.game = {
    balls,
    byId: new Map(balls.map((b) => [b.id, b])),
    rot: Math.random() * Math.PI * 2,
    gh: GAP_HALF,
    t: 0,
    countdown: COUNTDOWN,
    phase: 'countdown',
    overT: 0,
    ev: [],
    total: n
  };
  room.phase = 'playing';

  io.to(room.code).emit('gameStart', {
    mode: room.mode,
    total: n,
    ringR: RING_R,
    ballR: BALL_R,
    roster: entries.map((e) => ({ id: e.id, name: e.name, country: e.country, countryName: COUNTRY_NAME[e.country], team: e.team }))
  });
  pushRoom(room);
  return null;
}

function aliveBalls(g) {
  return g.balls.filter((b) => b.alive);
}

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

function inGap(g, ang) {
  const d1 = Math.abs(wrapAngle(ang - g.rot));
  const d2 = Math.abs(wrapAngle(ang - g.rot - Math.PI));
  return d1 <= g.gh || d2 <= g.gh;
}

function ballMass(b, g) {
  return g.t < b.dashUntil ? 1.8 : 1;
}

function botThink(room, g, b) {
  b.retarget -= DT;
  const enemy = (o) => o.alive && o.id !== b.id && (room.mode !== 'TEAM' || o.team !== b.team);
  if (b.retarget <= 0 || !b.target || !b.target.alive) {
    let best = null;
    let bd = Infinity;
    for (const o of g.balls) {
      if (!enemy(o)) continue;
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d < bd) { bd = d; best = o; }
    }
    b.target = best;
    b.retarget = 0.5 + Math.random() * 0.9;
    b.noise = (Math.random() - 0.5) * 0.9;
    b.skill = 0.55 + Math.random() * 0.45;
  }
  if (!b.target) { b.ix = 0; b.iy = 0; return; }
  const dx = b.target.x - b.x;
  const dy = b.target.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  const a = Math.atan2(dy, dx) + b.noise;
  b.ix = Math.cos(a) * b.skill;
  b.iy = Math.sin(a) * b.skill;
  if (d < 190 && g.t >= b.cdUntil && Math.random() < 0.06) b.dashQ = true;
}

function collide(room, g, a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  const min = BALL_R * 2;
  if (d >= min) return;
  if (d < 0.001) { dx = 1; dy = 0; d = 1; }
  const nx = dx / d;
  const ny = dy / d;
  const ma = ballMass(a, g);
  const mb = ballMass(b, g);
  const overlap = min - d;
  a.x -= nx * overlap * (mb / (ma + mb));
  a.y -= ny * overlap * (mb / (ma + mb));
  b.x += nx * overlap * (ma / (ma + mb));
  b.y += ny * overlap * (ma / (ma + mb));
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  let e = 1;
  if (room.mode === 'TEAM') e = a.team === b.team ? 0.45 : 1.5; // dost: esneme, düşman: sert itiş
  const j = (-(1 + e) * vn) / (1 / ma + 1 / mb);
  a.vx -= (j * nx) / ma; a.vy -= (j * ny) / ma;
  b.vx += (j * nx) / mb; b.vy += (j * ny) / mb;
  if (-vn > 60) {
    g.ev.push({ k: 'hit', x: +((a.x + b.x) / 2).toFixed(1), y: +((a.y + b.y) / 2).toFixed(1), s: +Math.min(1, -vn / 700).toFixed(2) });
  }
}

function stepGame(room) {
  const g = room.game;
  g.rot += ROT_SPEED * DT;

  if (g.phase === 'over') {
    g.overT += DT;
    if (g.overT >= OVER_TIME) endGame(room);
    return;
  }
  if (g.phase === 'countdown') {
    g.countdown -= DT;
    if (g.countdown <= 0) { g.phase = 'play'; g.ev.push({ k: 'go' }); }
    return;
  }

  g.t += DT;
  g.gh = Math.min(GAP_MAX, GAP_HALF + Math.max(0, g.t - SUDDEN_AT) * GAP_GROW);

  const alive = aliveBalls(g);
  for (const b of alive) {
    if (b.bot) botThink(room, g, b);
    let ix = b.ix;
    let iy = b.iy;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    b.vx += ix * ACC * DT;
    b.vy += iy * ACC * DT;

    if (b.dashQ && g.t >= b.cdUntil) {
      let dx = ix;
      let dy = iy;
      if (Math.hypot(dx, dy) < 0.1) { dx = Math.cos(b.f); dy = Math.sin(b.f); }
      const dl = Math.hypot(dx, dy) || 1;
      b.vx += (dx / dl) * DASH_SPEED;
      b.vy += (dy / dl) * DASH_SPEED;
      b.cdUntil = g.t + DASH_CD;
      b.dashUntil = g.t + DASH_TIME;
      g.ev.push({ k: 'dash', id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1) });
    }
    b.dashQ = false;

    b.vx *= FRICTION;
    b.vy *= FRICTION;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) { b.vx = (b.vx / sp) * MAX_SPEED; b.vy = (b.vy / sp) * MAX_SPEED; }
    if (il > 0.1) b.f = Math.atan2(iy, ix);
    else if (sp > 30) b.f = Math.atan2(b.vy, b.vx);
  }

  const sdt = DT / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const b of alive) {
      if (!b.alive) continue;
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      const d = Math.hypot(b.x, b.y);
      if (d + BALL_R >= RING_R || d > RING_R) {
        const ang = Math.atan2(b.y, b.x);
        if (d > RING_R && inGap(g, ang)) {
          eliminate(room, b, false); // dışarı çıkan top geri giremez
          continue;
        }
        if (!inGap(g, ang)) {
          const nx = b.x / d;
          const ny = b.y / d;
          b.x = nx * (RING_R - BALL_R);
          b.y = ny * (RING_R - BALL_R);
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) {
            b.vx -= (1 + WALL_REST) * vn * nx;
            b.vy -= (1 + WALL_REST) * vn * ny;
            if (vn > 120) g.ev.push({ k: 'wall', x: +b.x.toFixed(1), y: +b.y.toFixed(1), s: +Math.min(1, vn / 700).toFixed(2) });
          }
        }
      }
    }
    const live = alive.filter((b) => b.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) collide(room, g, live[i], live[j]);
    }
  }
}

function sendSnapshot(room) {
  const g = room.game;
  const alive = aliveBalls(g);
  const snap = {
    ph: g.phase,
    cd: Math.max(0, Math.ceil(g.countdown)),
    rot: +g.rot.toFixed(4),
    gh: +g.gh.toFixed(4),
    left: alive.length,
    b: alive.map((b) => [
      b.id, +b.x.toFixed(1), +b.y.toFixed(1), Math.round(b.vx), Math.round(b.vy),
      +b.f.toFixed(2), +Math.max(0, Math.min(1, (b.cdUntil - g.t) / DASH_CD)).toFixed(2)
    ]),
    ev: g.ev
  };
  g.ev = [];
  io.to(room.code).emit('snap', snap);
}

function endGame(room) {
  room.game = null;
  room.phase = 'lobby';
  io.to(room.code).emit('toLobby');
  pushRoom(room);
}

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.game) {
      stepGame(room);
      if (room.game) sendSnapshot(room);
    }
  }
}, 1000 / TICK);

/* ------------------------------ Oda yönetimi ------------------------------ */
function leaveRoom(socket) {
  const code = socket.data.room;
  if (!code) return;
  socket.data.room = null;
  socket.leave(code);
  const room = rooms.get(code);
  if (!room) return;
  room.players.delete(socket.id);
  if (room.game) {
    const b = room.game.byId.get(socket.id);
    if (b && b.alive) eliminate(room, b, true);
  }
  if (room.players.size === 0) { rooms.delete(code); return; }
  if (room.host === socket.id) room.host = room.players.keys().next().value;
  pushRoom(room);
}

function addPlayer(room, socket, data) {
  const player = {
    id: socket.id,
    name: cleanName(data.name),
    country: freeCountry(room, data.country, socket.id),
    team: balancedTeam(room)
  };
  room.players.set(socket.id, player);
  socket.join(room.code);
  socket.data.room = room.code;
}

io.on('connection', (socket) => {
  const myRoom = () => rooms.get(socket.data.room);

  socket.on('createRoom', (data, cb) => {
    if (typeof cb !== 'function') return;
    leaveRoom(socket);
    const room = { code: makeCode(), mode: 'FFA', phase: 'lobby', players: new Map(), host: socket.id, game: null };
    rooms.set(room.code, room);
    addPlayer(room, socket, data || {});
    cb({ ok: true, id: socket.id, code: room.code });
    pushRoom(room);
  });

  socket.on('joinRoom', (data, cb) => {
    if (typeof cb !== 'function') return;
    data = data || {};
    const room = rooms.get(normCode(data.code));
    if (!room) return cb({ ok: false, error: 'Oda bulunamadı.' });
    if (room.phase !== 'lobby') return cb({ ok: false, error: 'Oyun şu an devam ediyor.' });
    if (room.players.size >= MAX_PLAYERS) return cb({ ok: false, error: 'Oda dolu.' });
    if (socket.data.room === room.code) return cb({ ok: true, id: socket.id, code: room.code });
    leaveRoom(socket);
    addPlayer(room, socket, data);
    cb({ ok: true, id: socket.id, code: room.code });
    pushRoom(room);
  });

  socket.on('setProfile', (data) => {
    const room = myRoom();
    const p = room && room.players.get(socket.id);
    if (!p || room.phase !== 'lobby' || !data) return;
    if (data.name !== undefined) p.name = cleanName(data.name);
    if (data.country !== undefined) p.country = freeCountry(room, data.country, socket.id);
    if (data.team === 'A' || data.team === 'B') p.team = data.team;
    pushRoom(room);
  });

  socket.on('setMode', (mode) => {
    const room = myRoom();
    if (!room || room.host !== socket.id || room.phase !== 'lobby') return;
    if (mode === 'FFA' || mode === 'TEAM') { room.mode = mode; pushRoom(room); }
  });

  socket.on('startGame', (data, cb) => {
    const reply = typeof cb === 'function' ? cb : () => {};
    const room = myRoom();
    if (!room || room.host !== socket.id) return reply({ ok: false, error: 'Sadece oda sahibi başlatabilir.' });
    if (room.phase !== 'lobby') return reply({ ok: false, error: 'Oyun zaten başladı.' });
    const err = startGame(room, Number(data && data.bots) || 0);
    reply(err ? { ok: false, error: err } : { ok: true });
  });

  socket.on('input', (data) => {
    const room = myRoom();
    const b = room && room.game && room.game.byId.get(socket.id);
    if (!b || !data) return;
    let x = Number(data.x);
    let y = Number(data.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    b.ix = x;
    b.iy = y;
  });

  socket.on('dash', () => {
    const room = myRoom();
    const b = room && room.game && room.game.byId.get(socket.id);
    if (b && b.alive) b.dashQ = true;
  });

  socket.on('leaveRoom', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, () => {
  console.log(`LAST ONE WINS! http://localhost:${PORT}`);
});
