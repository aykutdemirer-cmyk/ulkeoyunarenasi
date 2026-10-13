import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import {
  DT, SUB, ARMOR_T, GHOST_T, SUPER_T, PU_R, PU_TYPES, MODES, BOMB_TIME, HILL_R, HILL_TIME,
  SOCCER_R, SOCCER_TIME, GOAL_TARGET, COINS_TIME, gapInfo as gapInfoSoccer, lavaCycle, lavaAt, LAVA_SECTORS,
  MAPS, MAP_KEYS, mapFor, bumpers, newEnv, advanceEnv, gapInfo, ballR, ballMass,
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
const DIFFS = { easy: [0.25, 0.5], normal: [0.5, 0.85], hard: [0.8, 1.0] };
const FREEZE_T = 2.2; // gol sonrası bekleme
const KILL_WINDOW = 6; // sn: son vuruştan sonra bu süre içinde elenirsen vuran kişi sayılır

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

function newRoom(hostPid) {
  return {
    code: makeCode(), mode: 'FFA', map: 'classic', diff: 'normal', phase: 'lobby',
    players: new Map(), host: hostPid, game: null, wins: new Map(), quick: false,
    rounds: 1, series: { round: 0, wins: new Map() }, lastBots: 0, botEntries: null
  };
}

const teamMode = (room) => room.mode === 'TEAM' || room.mode === 'SOCCER';

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
    diff: room.diff,
    rounds: room.rounds,
    phase: room.phase,
    host: room.host,
    max: MAX_PLAYERS,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, country: p.country, team: p.team, off: p.dcAt > 0, wins: room.wins.get(p.id) || 0
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
    round: g.round,
    rounds: room.rounds,
    goals: g.goals || [],
    roster: g.roster,
    elims: g.balls.filter((b) => !b.alive).sort((a, b) => b.rank - a.rank).map((b) => ({ id: b.id, rank: b.rank }))
  };
}

function startGame(room, botCount, continuing = false) {
  const humans = [...room.players.values()].filter((p) => p.dcAt === 0);
  const bots = Math.max(0, Math.min(MAX_PLAYERS - humans.length, Math.floor(botCount) || 0));
  const used = new Set(humans.map((h) => h.country));
  const freeCountries = shuffle(COUNTRIES.filter((c) => !used.has(c.code)));

  let aCount = humans.filter((h) => h.team === 'A').length;
  let bCount = humans.length - aCount;
  const entries = humans.map((h) => ({ id: h.id, name: h.name, country: h.country, team: h.team, bot: false }));
  const reuse = continuing && room.botEntries;
  if (reuse) room.botEntries.forEach((e) => { if (!used.has(e.country)) entries.push({ ...e }); });
  for (let i = 0; !reuse && i < bots; i++) {
    const c = freeCountries[i];
    let team = 'A';
    if (teamMode(room)) {
      team = aCount <= bCount ? 'A' : 'B';
      if (team === 'A') aCount++; else bCount++;
    }
    entries.push({ id: 'bot' + i, name: c.name, country: c.code, team, bot: true });
  }

  if (!reuse) room.botEntries = entries.filter((e) => e.bot).map((e) => ({ ...e }));
  if (!continuing) { room.lastBots = bots; room.series = { round: 0, wins: new Map() }; }
  if (entries.length < 2) return 'En az 2 oyuncu gerekli (bot ekleyebilirsin).';
  if (teamMode(room)) {
    if (new Set(entries.map((e) => e.team)).size < 2) return 'Takım modunda iki takımda da oyuncu olmalı.';
  } else {
    entries.forEach((e) => { e.team = 'F'; });
  }

  if (teamMode(room)) entries.sort((x, y) => (x.team < y.team ? -1 : x.team > y.team ? 1 : 0));
  else shuffle(entries);

  const mapKey = room.map === 'random' ? MAP_KEYS[Math.floor(Math.random() * MAP_KEYS.length)] : room.map;
  const map = mapFor(mapKey, room.mode);
  const n = entries.length;
  const dr = DIFFS[room.diff] || DIFFS.normal;
  const balls = entries.map((e, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      id: e.id, name: e.name, country: e.country, team: e.team, bot: e.bot,
      x: Math.cos(ang) * SPAWN_R, y: Math.sin(ang) * SPAWN_R, vx: 0, vy: 0, f: ang + Math.PI,
      cd: 0, dashT: 0, armorT: 0, ghostT: 0, superT: 0,
      ix: 0, iy: 0, dashQ: false, inQ: [], ack: 0,
      alive: true, rank: 0, target: null, retarget: 0, noise: 0, kills: 0, lastHit: null, by: null,
      skill: dr[0] + Math.random() * (dr[1] - dr[0])
    };
  });

  room.game = {
    mapKey,
    env: newEnv(map, room.mode === 'SOCCER' ? 0 : Math.random() * Math.PI * 2),
    balls,
    byId: new Map(balls.map((b) => [b.id, b])),
    roster: entries.map((e) => ({ id: e.id, name: e.name, country: e.country, countryName: COUNTRY_NAME[e.country], team: e.team, bot: e.bot })),
    bomb: null,
    hill: null,
    coins: [],
    coinId: 1,
    nextCoin: 0.5,
    scores: new Map(),
    pus: [],
    puId: 1,
    nextPU: PU_FIRST,
    countdown: COUNTDOWN,
    phase: 'countdown',
    round: room.series.round + 1,
    seriesDone: true,
    overT: 0,
    ev: [],
    total: n
  };
  if (room.mode === 'SOCCER') initSoccer(room.game);
  room.phase = 'playing';
  io.to(room.code).emit('gameStart', gameInfo(room));
  pushRoom(room);
  return null;
}

function aliveBalls(g) { return g.balls.filter((b) => b.alive); }

function endMatch(room, winners, res) {
  const g = room.game;
  g.phase = 'over';
  g.overT = 0;
  winners.forEach((b) => { b.rank = 1; if (!b.bot) room.wins.set(b.id, (room.wins.get(b.id) || 0) + 1); });
  const team = teamMode(room) && winners.length ? winners[0].team : null;
  const sr = room.series;
  sr.round++;
  const keys = teamMode(room) ? (team ? ['T' + team] : []) : winners.map((b) => b.id);
  keys.forEach((k) => sr.wins.set(k, (sr.wins.get(k) || 0) + 1));
  const need = Math.ceil(room.rounds / 2);
  const best = [...sr.wins.entries()].sort((x, y) => y[1] - x[1])[0];
  const done = room.rounds <= 1 || sr.round >= room.rounds || (best && best[1] >= need);
  g.seriesDone = done;
  const series = { round: sr.round, rounds: room.rounds, wins: [...sr.wins.entries()], done, key: best ? best[0] : null };
  g.ev.push({ k: 'over', ids: winners.map((b) => b.id), team, res, series });
  pushRoom(room);
}

function results(g) {
  return g.balls.map((b) => ({ id: b.id, rank: b.rank, kills: b.kills, score: +(g.scores.get(b.id) || 0).toFixed(1) }))
    .sort((x, y) => x.rank - y.rank || y.kills - x.kills);
}

function checkOver(room) {
  const g = room.game;
  if (!g || g.phase === 'over') return;
  const alive = aliveBalls(g);
  let over = false;
  if (teamMode(room)) over = new Set(alive.map((b) => b.team)).size <= 1;
  else over = alive.length <= 1;
  if (!over) return;
  alive.forEach((b) => { b.rank = 1; });
  endMatch(room, alive, results(g));
}

/* ------------------------------ Mod mantığı: BOMB / HILL ------------------------------ */
function pickBomb(g, minT) {
  const al = aliveBalls(g);
  if (al.length < 2) { g.bomb = null; return; }
  const t = Math.max(minT, 5, BOMB_TIME - (g.total - al.length) * 0.4);
  g.bomb = { id: al[Math.floor(Math.random() * al.length)].id, t, noUntil: g.env.t + 1 };
  g.ev.push({ k: 'pass', id: g.bomb.id });
}

function stepBomb(room, g) {
  if (!g.bomb) { if (aliveBalls(g).length > 1) pickBomb(g, BOMB_TIME + 3); return; }
  const h = g.byId.get(g.bomb.id);
  if (!h || !h.alive) { pickBomb(g, g.bomb.t); return; }
  g.bomb.t -= DT;
  if (g.bomb.t > 0) return;
  g.ev.push({ k: 'boom', id: h.id, x: +h.x.toFixed(1), y: +h.y.toFixed(1) });
  h.lastHit = null;
  eliminate(room, h, false);
  if (g.phase === 'play') pickBomb(g, 0);
}

function spawnCoin(g) {
  const env = g.env;
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (env.R - 80);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (bumpers(env).some((bm) => Math.hypot(bm.x - x, bm.y - y) < bm.r + 40)) continue;
    if (g.coins.some((c) => Math.hypot(c.x - x, c.y - y) < 60)) continue;
    g.coins.push({ id: g.coinId++, x: +x.toFixed(1), y: +y.toFixed(1), v: Math.random() < 0.12 ? 3 : 1, life: 12 });
    return;
  }
}

function stepCoins(room, g) {
  if (g.env.t >= g.nextCoin && g.coins.length < 12) { spawnCoin(g); g.nextCoin = g.env.t + 0.6; }
  const alive = aliveBalls(g);
  for (let i = g.coins.length - 1; i >= 0; i--) {
    const c = g.coins[i];
    c.life -= DT;
    if (c.life <= 0) { g.coins.splice(i, 1); continue; }
    for (const b of alive) {
      if (Math.hypot(b.x - c.x, b.y - c.y) < ballR(b) + 16) {
        g.scores.set(b.id, (g.scores.get(b.id) || 0) + c.v);
        g.ev.push({ k: 'coin', id: b.id, v: c.v, x: c.x, y: c.y });
        g.coins.splice(i, 1);
        break;
      }
    }
  }
  if (g.env.t >= COINS_TIME) finishByScore(room, g);
}

function botCoins(g, b, d, R) {
  let best = null;
  let bs = -1;
  for (const c of g.coins) {
    const dd = Math.hypot(c.x - b.x, c.y - b.y);
    const sc = c.v / (dd + 80);
    if (sc > bs) { bs = sc; best = c; }
  }
  if (!best) {
    const hold = Math.max(90, R * 0.35);
    const l = Math.hypot(b.x, b.y) || 1;
    b.ix = (-b.x / l) * 0.3 + (b.x / l) * (l > hold ? -0.4 : 0.2);
    b.iy = (-b.y / l) * 0.3 + (b.y / l) * (l > hold ? -0.4 : 0.2);
    return;
  }
  const dx = best.x - b.x;
  const dy = best.y - b.y;
  const dd = Math.hypot(dx, dy) || 1;
  b.ix = dx / dd; b.iy = dy / dd;
  if (dd > 320 && b.cd <= 0 && Math.random() < 0.03 * b.skill) b.dashQ = true;
}

function moveHill(g) {
  const env = g.env;
  const first = !g.hill;
  let x = 0;
  let y = 0;
  if (!first) {
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * (env.R * 0.6);
      x = Math.cos(a) * d; y = Math.sin(a) * d;
      if (!bumpers(env).some((bm) => Math.hypot(bm.x - x, bm.y - y) < bm.r + HILL_R + 10)) break;
    }
  }
  g.hill = { x, y, moveAt: env.t + 15 };
  g.ev.push({ k: 'hillMove', x: +x.toFixed(1), y: +y.toFixed(1) });
}

function stepHill(room, g) {
  if (!g.hill || g.env.t >= g.hill.moveAt) moveHill(g);
  const inside = aliveBalls(g).filter((b) => Math.hypot(b.x - g.hill.x, b.y - g.hill.y) < HILL_R);
  if (inside.length === 1) g.scores.set(inside[0].id, (g.scores.get(inside[0].id) || 0) + DT);
  if (g.env.t < HILL_TIME) return;
  finishByScore(room, g);
}

function finishByScore(room, g) {
  const sorted = g.balls.slice().sort((p, q) => (g.scores.get(q.id) || 0) - (g.scores.get(p.id) || 0));
  const top = g.scores.get(sorted[0].id) || 0;
  sorted.forEach((b, i) => { b.rank = (g.scores.get(b.id) || 0) === top ? 1 : i + 1; });
  const winners = top > 0 ? sorted.filter((b) => (g.scores.get(b.id) || 0) === top) : [];
  g.balls.forEach((b) => { if (!winners.includes(b)) b.rank = Math.max(b.rank, 2); });
  endMatch(room, winners, results(g));
}

function eliminate(room, b, quit) {
  const g = room.game;
  const aliveBefore = aliveBalls(g).length;
  b.alive = false;
  b.rank = aliveBefore;
  let by = null;
  if (!quit && b.lastHit && g.env.t - b.lastHit.t <= KILL_WINDOW) {
    const k = g.byId.get(b.lastHit.id);
    if (k && k.id !== b.id && (!teamMode(room) || k.team !== b.team)) { by = k.id; k.kills++; b.by = by; }
  }
  g.ev.push({ k: 'elim', id: b.id, rank: b.rank, by, x: +b.x.toFixed(1), y: +b.y.toFixed(1), q: quit ? 1 : 0 });
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
    if (bumpers(env).some((bm) => Math.hypot(bm.x - x, bm.y - y) < bm.r + 70)) continue;
    if (env.map.hole && d < env.map.hole + 90) continue;
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

/* ------------------------------ Futbol ------------------------------ */
function placeSoccer(balls) {
  const per = { A: [], B: [] };
  balls.forEach((b) => { if (per[b.team]) per[b.team].push(b); });
  for (const t of ['A', 'B']) {
    const arr = per[t];
    const n = arr.length;
    const cols = n > 6 ? 2 : 1;
    const rows = Math.ceil(n / cols);
    arr.forEach((b, k) => {
      const col = k % cols;
      const row = Math.floor(k / cols);
      b.x = (t === 'A' ? -1 : 1) * (150 + col * 80);
      b.y = (row - (rows - 1) / 2) * 75;
      b.vx = 0; b.vy = 0;
      b.f = t === 'A' ? 0 : Math.PI;
      b.inQ.length = 0;
    });
  }
}

function initSoccer(g) {
  placeSoccer(g.balls);
  g.ball = { x: 0, y: 0, vx: 0, vy: 0 };
  g.score = { A: 0, B: 0 };
  g.timeLeft = SOCCER_TIME;
  g.freeze = 0;
  g.ot = false;
  g.goals = [];
  g.lastTouch = null;
  g.touch = {};
}

function resetKickoff(g) {
  placeSoccer(g.balls);
  g.ball.x = 0; g.ball.y = 0; g.ball.vx = 0; g.ball.vy = 0;
  g.lastTouch = null;
  g.touch = {};
}

function finishSoccer(room, g, team) {
  const winners = g.balls.filter((b) => b.team === team);
  g.balls.forEach((b) => { b.rank = b.team === team ? 1 : 2; });
  endMatch(room, winners, results(g));
}

function goalScored(room, g, team) {
  g.score[team]++;
  const tt = g.touch[team];
  const t = tt && g.env.t - tt.t < 6 ? g.byId.get(tt.id) : null;
  let by = null;
  if (t) { by = t.id; t.kills++; }
  g.goals.push({ id: by, team, s: Math.floor(g.env.t) });
  g.ev.push({ k: 'goal', team, by, score: [g.score.A, g.score.B], s: Math.floor(g.env.t) });
  if (g.score[team] >= GOAL_TARGET || g.ot) { finishSoccer(room, g, team); return; }
  g.freeze = FREEZE_T;
}

function stepBall(room, g, sdt, live) {
  const ball = g.ball;
  const env = g.env;
  const mb = 0.6;
  ball.x += ball.vx * sdt;
  ball.y += ball.vy * sdt;
  for (const b of live) {
    if (!b.alive) continue;
    const rp = ballR(b);
    let dx = ball.x - b.x;
    let dy = ball.y - b.y;
    let d = Math.hypot(dx, dy);
    if (d >= rp + SOCCER_R) continue;
    if (d < 0.001) { dx = 1; dy = 0; d = 1; }
    const nx = dx / d;
    const ny = dy / d;
    const mp = ballMass(b);
    const ov = rp + SOCCER_R - d;
    ball.x += nx * ov * (mp / (mp + mb));
    ball.y += ny * ov * (mp / (mp + mb));
    b.x -= nx * ov * (mb / (mp + mb));
    b.y -= ny * ov * (mb / (mp + mb));
    const vn = (ball.vx - b.vx) * nx + (ball.vy - b.vy) * ny;
    g.lastTouch = b.id;
    g.touch[b.team] = { id: b.id, t: g.env.t };
    if (vn < 0) {
      const j = (-(1 + 0.85) * vn) / (1 / mp + 1 / mb);
      ball.vx += (j * nx) / mb; ball.vy += (j * ny) / mb;
      b.vx -= (j * nx) / mp; b.vy -= (j * ny) / mp;
      if (b.dashT > 0) { ball.vx += nx * 230; ball.vy += ny * 230; } // dash = şut
      if (-vn > 50) g.ev.push({ k: 'kick', x: +ball.x.toFixed(1), y: +ball.y.toFixed(1), s: +Math.min(1, -vn / 700).toFixed(2) });
    }
  }
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > 1100) { ball.vx = (ball.vx / sp) * 1100; ball.vy = (ball.vy / sp) * 1100; }
  const d = Math.hypot(ball.x, ball.y);
  if (d + SOCCER_R >= env.R) {
    const ang = Math.atan2(ball.y, ball.x);
    if (gapInfoSoccer(env, ang).dist <= env.gh) {
      if (d > env.R + SOCCER_R) goalScored(room, g, ball.x > 0 ? 'A' : 'B');
    } else {
      const nx = ball.x / d;
      const ny = ball.y / d;
      ball.x = nx * (env.R - SOCCER_R);
      ball.y = ny * (env.R - SOCCER_R);
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn > 0) {
        ball.vx -= 1.7 * vn * nx;
        ball.vy -= 1.7 * vn * ny;
        if (vn > 150) g.ev.push({ k: 'wall', x: +ball.x.toFixed(1), y: +ball.y.toFixed(1), s: +Math.min(1, vn / 700).toFixed(2) });
      }
    }
  }
}

function stepSoccerTick(room, g) {
  if (g.freeze > 0 || g.phase !== 'play') return;
  g.ball.vx *= 0.992;
  g.ball.vy *= 0.992;
  if (g.ot) return;
  g.timeLeft -= DT;
  if (g.timeLeft > 0) return;
  g.timeLeft = 0;
  if (g.score.A !== g.score.B) finishSoccer(room, g, g.score.A > g.score.B ? 'A' : 'B');
  else { g.ot = true; g.ev.push({ k: 'ot' }); }
}

function botSoccer(g, b, R) {
  const ball = g.ball;
  const sign = b.team === 'A' ? 1 : -1; // hücum yönü
  const goalX = sign * R;
  const ownX = -sign * R;
  const mates = aliveBalls(g).filter((o) => o.team === b.team);
  let chaser = b;
  let cd = Infinity;
  for (const m of mates) { const dd = Math.hypot(m.x - ball.x, m.y - ball.y); if (dd < cd) { cd = dd; chaser = m; } }
  const toBall = Math.hypot(ball.x - b.x, ball.y - b.y) || 1;
  const goto = (tx, ty, p = 1) => {
    const dx = tx - b.x;
    const dy = ty - b.y;
    const l = Math.hypot(dx, dy) || 1;
    b.ix = (dx / l) * p; b.iy = (dy / l) * p;
  };
  if (chaser === b) {
    let ux = goalX - ball.x;
    let uy = -ball.y;
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    const px = ball.x - ux * (SOCCER_R + 26 + 12);
    const py = ball.y - uy * (SOCCER_R + 26 + 12);
    const aligned = ((ball.x - b.x) * ux + (ball.y - b.y) * uy) / toBall;
    if (aligned > 0.5 && toBall < 280) {
      goto(ball.x, ball.y);
      if (aligned > 0.8 && toBall < 120 && b.cd <= 0 && Math.random() < 0.25 + 0.4 * b.skill) b.dashQ = true;
    } else {
      // topun içinden geçmemek için arkaya dolanarak git
      const sx = px - b.x;
      const sy = py - b.y;
      const sl = Math.hypot(sx, sy) || 1;
      const proj = ((ball.x - b.x) * sx + (ball.y - b.y) * sy) / sl;
      const perp = ((ball.x - b.x) * -sy + (ball.y - b.y) * sx) / sl;
      if (proj > 0 && proj < sl && Math.abs(perp) < 75) {
        const side = perp > 0 ? -1 : 1;
        goto(b.x + (sx / sl) * 90 + (-sy / sl) * side * 110, b.y + (sy / sl) * 90 + (sx / sl) * side * 110);
      } else goto(px, py);
    }
    return;
  }
  // kaleci: kaleye en yakın (hücumcu olmayan) takım arkadaşı
  const keeper = mates.filter((m) => m !== chaser).sort((p, q) => Math.hypot(p.x - ownX, p.y) - Math.hypot(q.x - ownX, q.y))[0];
  if (keeper === b && mates.length >= 3) {
    const kx = ownX * 0.8 + ball.x * 0.12;
    const ky = Math.max(-100, Math.min(100, ball.y * 0.55));
    const kd = Math.hypot(kx - b.x, ky - b.y);
    goto(kx, ky, Math.min(1, kd / 50));
    if (toBall < 120 && b.cd <= 0 && Math.random() < 0.3) b.dashQ = true; // uzaklaştırma şutu
    return;
  }
  // savunma: top ile kendi kale arasında konumlan
  let tx = ownX * 0.62 + ball.x * 0.38;
  let ty = ball.y * 0.45;
  const tl = Math.hypot(tx, ty);
  if (tl > R - 70) { tx = (tx / tl) * (R - 70); ty = (ty / tl) * (R - 70); }
  const dd = Math.hypot(tx - b.x, ty - b.y);
  goto(tx, ty, Math.min(1, dd / 60));
}

/* ------------------------------ Bot yapay zekası (davranış ağacı) ------------------------------ */
function botThink(room, g, b) {
  const env = g.env;
  const R = env.R;
  const d = Math.hypot(b.x, b.y) || 1;
  const gi = gapInfo(env, Math.atan2(b.y, b.x));
  b.ix = 0; b.iy = 0; b.dashQ = false;

  // 0) Kara delik: yakınsam dışarı kaç
  if (env.map.hole && d < env.map.hole + 110 && !(b.ghostT > 0)) {
    b.ix = b.x / d; b.iy = b.y / d;
    if (b.cd <= 0 && d < env.map.hole + 60) b.dashQ = true;
    return;
  }

  // 0b) Lav: uyarı/aktif dilimdeysem en yakın güvenli noktaya kaç
  if (env.map.lava) {
    const lc = lavaCycle(env);
    if (lc && lc.state > 0 && lavaAt(env, Math.atan2(b.y, b.x)) > 0) {
      const step = (Math.PI * 2) / LAVA_SECTORS;
      let best = null;
      let bd = Infinity;
      for (let k = 0; k < LAVA_SECTORS; k++) {
        if (lc.sectors.includes(k)) continue;
        for (const [a, inward] of [[k * step, 1], [(k + 1) * step, -1]]) {
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const t = Math.min(env.R - 50, Math.max(70, b.x * ux + b.y * uy));
          const px = ux * t + -uy * inward * 45;
          const py = uy * t + ux * inward * 45;
          const dd = Math.hypot(px - b.x, py - b.y);
          if (dd < bd) { bd = dd; best = [px, py]; }
        }
      }
      if (best) {
        const l = Math.hypot(best[0] - b.x, best[1] - b.y) || 1;
        b.ix = (best[0] - b.x) / l; b.iy = (best[1] - b.y) / l;
        if ((lc.state === 2 || lc.left < 1.2) && b.cd <= 0 && l > 90) b.dashQ = true;
        return;
      }
    }
    // güvenli dilimdeyim: uyarı/aktif sürerken dilimin ortasında kal (tehlikeli sınıra yaklaşma)
    if (lc && lc.state > 0) {
      const step = (Math.PI * 2) / LAVA_SECTORS;
      const my = Math.atan2(b.y, b.x);
      const k = Math.floor((((my % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / step);
      const c = (k + 0.5) * step;
      const rr = Math.min(env.R - 70, Math.max(d, 150));
      const tx = Math.cos(c) * rr;
      const ty = Math.sin(c) * rr;
      const dd = Math.hypot(tx - b.x, ty - b.y);
      if (dd > 25) { b.ix = ((tx - b.x) / dd) * Math.min(1, dd / 70); b.iy = ((ty - b.y) / dd) * Math.min(1, dd / 70); }
      return;
    }
  }

  // Mod davranışları
  if (room.mode === 'BOMB' && g.bomb) return botBomb(g, b, d, R);
  if (room.mode === 'HILL' && g.hill) return botHill(g, b, d, R);
  if (room.mode === 'COINS') return botCoins(g, b, d, R);
  if (room.mode === 'SOCCER' && g.ball) return botSoccer(g, b, R);

  // 1) PANİK: kapıya yakınım -> merkeze kaç / dash at
  if (env.gh > 0 && d > R - 140 && gi.dist <= env.gh + 0.55 && !(b.ghostT > 0) && Math.random() < 0.55 + 0.45 * b.skill) {
    b.ix = -b.x / d;
    b.iy = -b.y / d;
    if (b.cd <= 0 && (b.vx * b.x + b.vy * b.y) / d > 60) b.dashQ = true;
    return;
  }

  const isEnemy = (o) => o.alive && o.id !== b.id && (!teamMode(room) || o.team !== b.team);
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

function botBomb(g, b, d, R) {
  const holder = g.byId.get(g.bomb.id);
  const others = aliveBalls(g).filter((o) => o.id !== b.id);
  if (!holder || !others.length) return;
  if (holder === b) {
    let t = others[0];
    let td = Infinity;
    for (const o of others) { const dd = Math.hypot(o.x - b.x, o.y - b.y); if (dd < td) { td = dd; t = o; } }
    const l = td || 1;
    b.ix = (t.x - b.x) / l; b.iy = (t.y - b.y) / l;
    if (td < 170 && b.cd <= 0 && Math.random() < 0.3 + 0.4 * b.skill) b.dashQ = true;
    return;
  }
  const dx = b.x - holder.x;
  const dy = b.y - holder.y;
  const hd = Math.hypot(dx, dy) || 1;
  b.ix = dx / hd; b.iy = dy / hd;
  if (d > R - 110) { b.ix += (-b.x / d) * 1.4 + (-b.y / d) * 0.6; b.iy += (-b.y / d) * 1.4 + (b.x / d) * 0.6; }
  if (hd < 150 && b.cd <= 0 && Math.random() < 0.2 + 0.5 * b.skill) b.dashQ = true;
}

function botHill(g, b, d, R) {
  const h = g.hill;
  const hd = Math.hypot(h.x - b.x, h.y - b.y);
  const rival = aliveBalls(g).filter((o) => o.id !== b.id && Math.hypot(o.x - h.x, o.y - h.y) < HILL_R)
    .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
  if (hd > HILL_R * 0.6 && !(rival && hd < HILL_R)) {
    b.ix = (h.x - b.x) / (hd || 1); b.iy = (h.y - b.y) / (hd || 1);
    return;
  }
  if (rival) {
    const rd = Math.hypot(rival.x - b.x, rival.y - b.y) || 1;
    b.ix = (rival.x - b.x) / rd; b.iy = (rival.y - b.y) / rd;
    if (rd < 170 && b.cd <= 0 && Math.random() < 0.3 + 0.4 * b.skill) b.dashQ = true;
    return;
  }
  b.ix = (h.x - b.x) / (hd || 1) * 0.3; b.iy = (h.y - b.y) / (hd || 1) * 0.3;
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
  if (room.mode === 'BOMB' && g.bomb && g.env.t >= g.bomb.noUntil && (a.id === g.bomb.id || b.id === g.bomb.id)) {
    g.bomb.id = a.id === g.bomb.id ? b.id : a.id;
    g.bomb.noUntil = g.env.t + 0.8;
    g.ev.push({ k: 'pass', id: g.bomb.id });
  }
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  let e = 1;
  if (teamMode(room)) e = a.team === b.team ? 0.45 : 1.5;
  if (a.armorT > 0 || b.armorT > 0) e = Math.max(e, a.team === b.team && teamMode(room) ? 0.9 : 1.7);
  a.lastHit = { id: b.id, t: g.env.t };
  b.lastHit = { id: a.id, t: g.env.t };
  if (room.mode === 'COINS' && -vn > 450) {
    const v = Math.hypot(a.vx, a.vy) < Math.hypot(b.vx, b.vy) ? a : b;
    const sc = g.scores.get(v.id) || 0;
    if (v.armorT <= 0 && sc >= 1) {
      g.scores.set(v.id, sc - 1);
      g.coins.push({ id: g.coinId++, x: +v.x.toFixed(1), y: +v.y.toFixed(1), v: 1, life: 12 });
      g.ev.push({ k: 'drop', id: v.id, x: +v.x.toFixed(1), y: +v.y.toFixed(1) });
    }
  }
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

  if (g.freeze > 0) {
    g.freeze -= DT;
    if (g.freeze <= 0) resetKickoff(g);
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
    applyControl(b, b.ix, b.iy, b.dashQ, g.ev, env);
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
    if (g.ball && g.phase === 'play' && !(g.freeze > 0)) stepBall(room, g, sdt, live);
  }
  if (g.phase === 'play') updatePowerups(g, alive);
  if (g.phase === 'play' && g.ball) stepSoccerTick(room, g);
  if (g.phase === 'play' && room.mode === 'BOMB') stepBomb(room, g);
  if (g.phase === 'play' && room.mode === 'HILL') stepHill(room, g);
  if (g.phase === 'play' && room.mode === 'COINS') stepCoins(room, g);
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
    sb: g.ball ? [Math.round(g.ball.x * 10) / 10, Math.round(g.ball.y * 10) / 10, Math.round(g.ball.vx), Math.round(g.ball.vy)] : null,
    scr: g.ball ? [g.score.A, g.score.B] : null,
    tl: g.ball ? Math.ceil(g.timeLeft) : 0,
    ot: g.ball ? (g.ot ? 1 : 0) : 0,
    fz: g.freeze > 0 ? 1 : 0,
    bm: g.bomb ? [g.bomb.id, r1(g.bomb.t)] : null,
    hill: g.hill ? [g.hill.x, g.hill.y] : null,
    ht: room.mode === 'HILL' ? r1(Math.max(0, HILL_TIME - g.env.t)) : room.mode === 'COINS' ? r1(Math.max(0, COINS_TIME - g.env.t)) : 0,
    cn: room.mode === 'COINS' ? g.coins.map((c) => [c.id, c.x, c.y, c.v, r1(c.life)]) : null,
    sc: (room.mode === 'HILL' || room.mode === 'COINS') ? g.balls.map((b) => [b.id, r1(g.scores.get(b.id) || 0)]).sort((p, q) => q[1] - p[1]) : null,
    pu: g.pus.map((p) => [p.id, p.type, p.x, p.y, r1(p.life)]),
    ev: g.ev
  };
  g.ev = [];
  io.to(room.code).emit('snap', snap);
}

function endGame(room) {
  const again = room.game && !room.game.seriesDone && room.rounds > 1;
  room.game = null;
  room.phase = 'lobby';
  for (const p of [...room.players.values()]) {
    if (p.gone) removePlayer(room, p.id);
  }
  if (!rooms.has(room.code)) return;
  if (again && !startGame(room, room.lastBots, true)) return; // seri: sıradaki raunt
  room.series = { round: 0, wins: new Map() };
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
    const room = newRoom(pid);
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
    if (MODES.includes(mode)) { room.mode = mode; pushRoom(room); }
  }));

  socket.on('setMap', safe((key) => {
    const room = curRoom();
    if (!room || room.host !== pid || room.phase !== 'lobby') return;
    if (MAP_CHOICES.has(key)) { room.map = key; pushRoom(room); }
  }));

  socket.on('setDiff', safe((key) => {
    const room = curRoom();
    if (!room || room.host !== pid || room.phase !== 'lobby') return;
    if (DIFFS[key]) { room.diff = key; pushRoom(room); }
  }));

  // Hızlı oyun: en kalabalık açık lobiye gir; yoksa oda kur ve kısa süre sonra botlarla başlat
  socket.on('quickPlay', safe((data, cb) => {
    if (typeof cb !== 'function') return;
    data = data || {};
    if (curRoom()) leave();
    const open = [...rooms.values()].filter((r) => r.phase === 'lobby' && r.players.size < MAX_PLAYERS)
      .sort((a, b) => b.players.size - a.players.size)[0];
    if (open) {
      enter(open, data);
      cb({ ok: true, id: pid, code: open.code });
      pushRoom(open);
      return;
    }
    const room = newRoom(pid);
    room.quick = true;
    rooms.set(room.code, room);
    enter(room, data);
    cb({ ok: true, id: pid, code: room.code, quick: true });
    pushRoom(room);
    setTimeout(() => {
      if (rooms.get(room.code) !== room || room.phase !== 'lobby' || !room.quick) return;
      const humans = [...room.players.values()].filter((p) => p.dcAt === 0).length;
      startGame(room, Math.max(1, 8 - humans));
    }, 8000);
  }));

  socket.on('setRounds', safe((n) => {
    const room = curRoom();
    if (!room || room.host !== pid || room.phase !== 'lobby') return;
    n = Number(n);
    if (n === 1 || n === 3 || n === 5) { room.rounds = n; pushRoom(room); }
  }));

  socket.on('startGame', safe((data, cb) => {
    const reply = typeof cb === 'function' ? cb : () => {};
    const room = curRoom();
    if (!room || room.host !== pid) return reply({ ok: false, error: 'Sadece oda sahibi başlatabilir.' });
    if (room.phase !== 'lobby') return reply({ ok: false, error: 'Oyun zaten başladı.' });
    room.quick = false;
    const err = startGame(room, Number(data && data.bots) || 0);
    reply(err ? { ok: false, error: err } : { ok: true });
  }));

  // İstemci tahmini için numaralı girdi: {s: seq, x, y, d: dash}
  socket.on('inp', safe((data) => {
    const now = Date.now();
    if (now - (socket.data.inpWin || 0) > 1000) { socket.data.inpWin = now; socket.data.inpN = 0; }
    if (++socket.data.inpN > 120) return; // saniyede en fazla 120 girdi
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

  // Hızlı tepkiler (0: GG, 1: LOL, 2: OOPS!, 3: !!!) - saniyede en fazla 1
  socket.on('emote', safe((i) => {
    const room = curRoom();
    const g = room && room.game;
    const now = Date.now();
    if (!g || !g.byId.has(pid) || now - (socket.data.lastEmote || 0) < 900) return;
    i = Math.floor(Number(i));
    if (!(i >= 0 && i <= 3)) return;
    socket.data.lastEmote = now;
    g.ev.push({ k: 'emote', id: pid, i });
  }));

  socket.on('leaveRoom', safe(() => leave()));

  socket.on('disconnect', safe(() => {
    const p = me();
    if (p && p.sid === socket.id) p.dcAt = Date.now();
    const room = curRoom();
    if (room) pushRoom(room);
  }));
});

process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));

server.listen(PORT, () => {
  console.log(`LAST ONE WINS! http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) console.log(`  Ağdaki cihazlar için: http://${ni.address}:${PORT}`);
    }
  }
});
