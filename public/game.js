/* LAST ONE WINS! - istemci (ES module) */
import {
  DT, SUB, BALL_R, RUSH, isRush, RUSH_TRACK_KEYS, RUSH_TRACK_NAMES, RUSH_TRACKS, rushTrack, laserOn, pistonLen, ARMOR_R, DASH_CD, PU_R, MAPS, MAP_KEYS,
  advanceEnv, applyControl, moveSub, RACE, gapInfo, bumpers, mapFor, HILL_R, lavaCycle, lavaAt, LAVA_SECTORS
} from './shared.js';
import { t as T, tl as TL, countryName, setLang, applyStatic, onLang, getLang, refreshTitle } from './i18n.js';

const MODE_INFO = new Proxy({}, { get: (_, m) => [T('mode.' + String(m)), T('modedesc.' + String(m))] });

/* ------------------------------ Sabitler ------------------------------ */
const CW = 1080;
const CH = 1920;
const CX = CW / 2;
const CY = 960;
const INTERP_MS = 100;
const TEAM_COL = { A: '#22d3ee', B: '#f97316', F: '#ffffff' };
const PU_COL = ['#94a3b8', '#facc15', '#22d3ee'];
const puLabel = (i) => T(['armor', 'superdash', 'ghost'][i]);
const EMOTES = ['GG', 'LOL', 'OOPS!', '!!!'];
const MAP_STARS = { classic: 1, collider: 3, shrinking: 3, gauntlet: 4, ice: 2, whirlpool: 2, pinball: 3, pulse: 3, lava: 4, blackhole: 4, random: 0 };
const MAP_DETAIL = new Proxy({}, { get: (_, k) => ({ stars: MAP_STARS[k] || 0, tips: TL('maptips.' + String(k)) }) });
const MODE_DETAIL = new Proxy({}, { get: (_, m) => ({ win: T('modewin.' + String(m)), rules: TL('moderules.' + String(m)), tip: T('modetip.' + String(m)) }) });
const isTeam = (m) => m === 'TEAM' || m === 'SOCCER' || m === 'RUSHT';

const COUNTRIES = [
  ['TR', 'Turkey'], ['ZA', 'South Africa'], ['NO', 'Norway'], ['CN', 'China'],
  ['PK', 'Pakistan'], ['US', 'USA'], ['GB', 'UK'], ['DE', 'Germany'],
  ['FR', 'France'], ['JP', 'Japan'], ['BR', 'Brazil'], ['AR', 'Argentina'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['KR', 'S. Korea'], ['NL', 'Netherlands']
].map(([code, name]) => ({ code, name }));
const CNAME = {};
function refreshNames() { COUNTRIES.forEach((c) => { CNAME[c.code] = countryName(c.code); }); }
refreshNames();

/* ------------------------------ DOM ------------------------------ */
const $ = (id) => document.getElementById(id);
const lobbyEl = $('lobby');
const gameEl = $('game');
const stage = $('stage');
const cv = $('cv');
const ctx = cv.getContext('2d');

/* ------------------------------ Bayraklar (vektör) ------------------------------ */
const FW = 192;
const FH = 128;

function star(c, cx, cy, r, rot = -Math.PI / 2, inner = 0.382) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
}
function rect(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function disc(c, col, x, y, r) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
function hbands(c, cols, ws) {
  const sum = ws.reduce((a, b) => a + b, 0);
  let y = 0;
  cols.forEach((col, i) => { const h = (FH * ws[i]) / sum; rect(c, col, 0, y, FW, h + 1); y += h; });
}
function vbands(c, cols, ws) {
  const sum = ws.reduce((a, b) => a + b, 0);
  let x = 0;
  cols.forEach((col, i) => { const w = (FW * ws[i]) / sum; rect(c, col, x, 0, w + 1, FH); x += w; });
}

const FLAGS = {
  TR(c) {
    rect(c, '#e30a17', 0, 0, FW, FH);
    disc(c, '#fff', 74, 64, 34);
    disc(c, '#e30a17', 84, 64, 27);
    c.fillStyle = '#fff';
    star(c, 112, 64, 17, 0);
  },
  ZA(c) {
    rect(c, '#de3831', 0, 0, FW, FH / 2);
    rect(c, '#002395', 0, FH / 2, FW, FH / 2);
    c.lineCap = 'butt';
    const y = (col, w) => {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(-10, -6); c.lineTo(70, 64); c.lineTo(-10, 134); c.moveTo(70, 64); c.lineTo(FW + 10, 64); c.stroke();
    };
    y('#fff', 46); y('#007a4d', 26);
    c.fillStyle = '#ffb612';
    c.beginPath(); c.moveTo(0, 18); c.lineTo(58, 64); c.lineTo(0, 110); c.closePath(); c.fill();
    c.fillStyle = '#000';
    c.beginPath(); c.moveTo(0, 28); c.lineTo(44, 64); c.lineTo(0, 100); c.closePath(); c.fill();
  },
  NO(c) {
    rect(c, '#ba0c2f', 0, 0, FW, FH);
    rect(c, '#fff', 54, 0, 34, FH);
    rect(c, '#fff', 0, 47, FW, 34);
    rect(c, '#00205b', 62, 0, 18, FH);
    rect(c, '#00205b', 0, 55, FW, 18);
  },
  CN(c) {
    rect(c, '#de2910', 0, 0, FW, FH);
    c.fillStyle = '#ffde00';
    star(c, 40, 38, 24);
    [[80, 14], [92, 30], [92, 52], [80, 68]].forEach(([x, y]) => star(c, x, y, 8));
  },
  PK(c) {
    rect(c, '#01411c', 0, 0, FW, FH);
    rect(c, '#fff', 0, 0, 48, FH);
    disc(c, '#fff', 122, 64, 36);
    disc(c, '#01411c', 134, 56, 31);
    c.fillStyle = '#fff';
    star(c, 148, 42, 13, -Math.PI / 2 + 0.4);
  },
  US(c) {
    for (let i = 0; i < 13; i++) rect(c, i % 2 ? '#fff' : '#b22234', 0, (FH / 13) * i, FW, FH / 13 + 1);
    rect(c, '#3c3b6e', 0, 0, 80, (FH / 13) * 7);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 6; q++) disc(c, '#fff', 8 + q * 13, 9 + r * 14, 2.4);
  },
  GB(c) {
    rect(c, '#012169', 0, 0, FW, FH);
    c.strokeStyle = '#fff'; c.lineWidth = 26;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(FW, FH); c.moveTo(FW, 0); c.lineTo(0, FH); c.stroke();
    c.strokeStyle = '#c8102e'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(FW, FH); c.moveTo(FW, 0); c.lineTo(0, FH); c.stroke();
    rect(c, '#fff', 0, 44, FW, 40);
    rect(c, '#fff', 76, 0, 40, FH);
    rect(c, '#c8102e', 0, 52, FW, 24);
    rect(c, '#c8102e', 84, 0, 24, FH);
  },
  DE(c) { hbands(c, ['#000', '#dd0000', '#ffce00'], [1, 1, 1]); },
  FR(c) { vbands(c, ['#0055a4', '#fff', '#ef4135'], [1, 1, 1]); },
  JP(c) { rect(c, '#fff', 0, 0, FW, FH); disc(c, '#bc002d', 96, 64, 38); },
  BR(c) {
    rect(c, '#009c3b', 0, 0, FW, FH);
    c.fillStyle = '#ffdf00';
    c.beginPath(); c.moveTo(96, 10); c.lineTo(182, 64); c.lineTo(96, 118); c.lineTo(10, 64); c.closePath(); c.fill();
    disc(c, '#002776', 96, 64, 33);
    c.strokeStyle = '#fff'; c.lineWidth = 6;
    c.beginPath(); c.arc(96, 98, 52, Math.PI * 1.22, Math.PI * 1.78); c.stroke();
  },
  AR(c) {
    hbands(c, ['#74acdf', '#fff', '#74acdf'], [1, 1, 1]);
    disc(c, '#f6b40e', 96, 64, 13);
  },
  IT(c) { vbands(c, ['#009246', '#fff', '#ce2b37'], [1, 1, 1]); },
  ES(c) { hbands(c, ['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]); },
  KR(c) {
    rect(c, '#fff', 0, 0, FW, FH);
    c.fillStyle = '#cd2e3a';
    c.beginPath(); c.arc(96, 64, 28, Math.PI, 0); c.fill();
    c.fillStyle = '#0047a0';
    c.beginPath(); c.arc(96, 64, 28, 0, Math.PI); c.fill();
    c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(82, 64, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0047a0'; c.beginPath(); c.arc(110, 64, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#000';
    [[22, 22], [150, 22], [22, 92], [150, 92]].forEach(([x, y]) => {
      c.save(); c.translate(x + 10, y + 7); c.rotate(y < 64 ? (x < 96 ? 0.55 : -0.55) : (x < 96 ? -0.55 : 0.55));
      for (let i = 0; i < 3; i++) c.fillRect(-10, -9 + i * 7, 20, 4);
      c.restore();
    });
  },
  NL(c) { hbands(c, ['#ae1c28', '#fff', '#21468b'], [1, 1, 1]); }
};

const flagCache = {};
function flagCanvas(code) {
  if (flagCache[code]) return flagCache[code];
  const c = document.createElement('canvas');
  c.width = FW; c.height = FH;
  (FLAGS[code] || FLAGS.TR)(c.getContext('2d'));
  flagCache[code] = c;
  return c;
}
function drawFlagCircle(g, code, x, y, r) {
  g.save();
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
  g.drawImage(flagCanvas(code), 24, 0, 144, 128, x - r, y - r, r * 2, r * 2);
  g.restore();
}
function flagIcon(code, size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  drawFlagCircle(c.getContext('2d'), code, size / 2, size / 2, size / 2);
  return c;
}

/* ------------------------------ Ses (Web Audio) ------------------------------ */
let actx = null;
let noiseBuf = null;
let lastHit = 0;
let lastWall = 0;
let lastBump = 0;
let master = null;
let muted = false;
try { muted = localStorage.getItem('low_muted') === '1'; } catch (e) { /* yok */ }

function initAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* ses yoksa sessiz devam */ }
}
function envGain(vol, dur, t0 = actx.currentTime, attack = 0.005) {
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(master);
  return g;
}
function tone(type, f0, f1, dur, vol, delay = 0, attack = 0.005) {
  const t = actx.currentTime + delay;
  const o = actx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  o.connect(envGain(vol, dur, t, attack));
  o.start(t); o.stop(t + dur + 0.03);
}
function noise(ftype, f0, f1, dur, vol, q = 1, delay = 0) {
  const t = actx.currentTime + delay;
  const s = actx.createBufferSource();
  s.buffer = noiseBuf;
  const f = actx.createBiquadFilter();
  f.type = ftype; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
  s.connect(f); f.connect(envGain(vol, dur, t));
  s.start(t); s.stop(t + dur + 0.03);
}
const sfx = {
  hit(s, heavy) {
    if (!actx) return;
    const n = performance.now();
    if (n - lastHit < 50) return;
    lastHit = n;
    tone('sine', 170 + 60 * s, 45, 0.2, 0.25 + 0.5 * s);
    noise('lowpass', 900, 150, 0.08, 0.15 + 0.2 * s);
    if (heavy) { tone('sawtooth', 90, 30, 0.35, 0.3); noise('lowpass', 1500, 80, 0.3, 0.35); }
  },
  wall(s) {
    if (!actx) return;
    const n = performance.now();
    if (n - lastWall < 80) return;
    lastWall = n;
    tone('triangle', 520, 300, 0.09, 0.06 + 0.1 * s);
  },
  bump() {
    if (!actx) return;
    const n = performance.now();
    if (n - lastBump < 70) return;
    lastBump = n;
    tone('sine', 420, 90, 0.25, 0.4);
    tone('square', 880, 300, 0.1, 0.07);
  },
  dash(s) {
    if (!actx) return;
    noise('bandpass', 350, s > 1 ? 5200 : 3200, 0.28, s > 1 ? 0.5 : 0.35, 1.5);
  },
  elim() {
    if (!actx) return;
    noise('lowpass', 2200, 80, 0.7, 0.6);
    tone('sawtooth', 220, 35, 0.6, 0.3);
  },
  beep(hi) {
    if (!actx) return;
    tone('square', hi ? 880 : 440, hi ? 880 : 440, hi ? 0.35 : 0.15, 0.15);
  },
  gong() {
    if (!actx) return;
    tone('sine', 98, 92, 2.6, 0.45, 0, 0.02);
    tone('sine', 147, 140, 2.0, 0.22, 0, 0.02);
    tone('sine', 233, 225, 1.5, 0.12, 0, 0.02);
    tone('triangle', 311, 300, 1.2, 0.08, 0, 0.02);
    noise('bandpass', 700, 300, 0.5, 0.18, 1.2);
  },
  alarm() {
    if (!actx) return;
    tone('square', 980, 760, 0.12, 0.07);
  },
  pickup() {
    if (!actx) return;
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.2, i * 0.055));
  },
  coin(v) {
    if (!actx) return;
    tone('triangle', v > 1 ? 1500 : 1100, v > 1 ? 2200 : 1700, 0.12, 0.14);
    if (v > 1) tone('triangle', 2000, 2600, 0.12, 0.1, 0.07);
  },
  spawn() {
    if (!actx) return;
    tone('sine', 300, 900, 0.3, 0.12);
  },
  confetti() {
    if (!actx) return;
    noise('highpass', 2500, 6000, 0.4, 0.3, 0.8);
    for (let i = 0; i < 6; i++) noise('bandpass', 3000 + Math.random() * 3000, 5000, 0.12, 0.12, 2, 0.05 + i * 0.07);
  },
  win() {
    if (!actx) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.3, 0.25, i * 0.13));
  }
};

/* ------------------------------ Durum ------------------------------ */
function genPid() { return 'p' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
function getPid() {
  try {
    let p = sessionStorage.getItem('low_pid');
    if (!p) { p = genPid(); sessionStorage.setItem('low_pid', p); }
    return p;
  } catch (e) { return genPid(); }
}
const PID = getPid();

/* Yerel istatistikler */
function loadStats() {
  try { return Object.assign({ games: 0, wins: 0, kills: 0 }, JSON.parse(localStorage.getItem('low_stats') || '{}')); } catch (e) { return { games: 0, wins: 0, kills: 0 }; }
}
function saveStats(st) { try { localStorage.setItem('low_stats', JSON.stringify(st)); } catch (e) { /* yok */ } }
/* Kalıcı profil / XP (localStorage) */
const xpNeed = (L) => 150 + 100 * (L - 1);
const xpCum = (L) => 150 * (L - 1) + 50 * (L - 1) * (L - 2);
function levelOf(xp) { let L = 1; while (xpCum(L + 1) <= xp) L++; return L; }
function loadProfile() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('low_profile') || '{}'); } catch (e) { p = {}; }
  const o = { xp: Math.max(0, Number(p.xp) || 0), level: 1, wins: Number(p.wins) || 0, score: Number(p.score) || 0 };
  o.level = levelOf(o.xp);
  return o;
}
function saveProfile(pr) { try { localStorage.setItem('low_profile', JSON.stringify(pr)); } catch (e) { /* yok */ } }
let profile = loadProfile();
const myLvl = () => profile.level;
function renderProfile() {
  const L = profile.level;
  const base = xpCum(L);
  const need = xpNeed(L);
  const frac = Math.max(0, Math.min(1, (profile.xp - base) / need));
  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  set('pLvl', (el) => { el.textContent = 'Lv.' + L; });
  set('pXpTxt', (el) => { el.textContent = T('xp_total', { x: profile.xp, y: xpCum(L + 1) }); });
  set('pXpBar', (el) => { el.style.width = (frac * 100).toFixed(1) + '%'; });
  set('pWins', (el) => { el.textContent = String(profile.wins); });
  set('pScore', (el) => { el.textContent = String(profile.score); });
}
const acct = { on: false, user: null };
function addXp(n, x, y) {
  if (!n) return;
  if (acct.on) {
    // hesaplı oyuncu: XP'yi sunucu işler, burada yalnızca gösterim
    S.matchXp += n;
    if (typeof x === 'number') S.floaters.push({ x, y: y - 50, text: '+' + n + ' XP', col: '#a78bfa', life: 0.9 });
    return;
  }
  const before = profile.level;
  profile.xp += n;
  profile.score += n;
  profile.level = levelOf(profile.xp);
  S.matchXp += n;
  saveProfile(profile);
  renderProfile();
  if (typeof x === 'number') S.floaters.push({ x, y: y - 50, text: '+' + n + ' XP', col: '#a78bfa', life: 0.9 });
  if (profile.level > before) {
    S.floaters.push({ x: 0, y: -40, text: T('level_up', { l: profile.level }), col: '#facc15', life: 2 });
    if (S.room) socket.emit('setProfile', { lvl: profile.level });
  }
}
function lvlOf(p) { return p.id === PID ? myLvl() : (p.lvl || 1); }

function renderStats() {
  const st = loadStats();
  const el = document.getElementById('statsLine');
  if (el) el.textContent = st.games ? T('stats_line', st) : T('stats_first');
}
function renderMute() {
  const m1 = document.getElementById('muteBtn');
  const m2 = document.getElementById('muteBtn2');
  if (m1) m1.classList.toggle('off', muted);
  if (m2) m2.textContent = muted ? T('sound_off') : T('sound_on');
}
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('low_muted', muted ? '1' : '0'); } catch (e) { /* yok */ }
  if (master) master.gain.value = muted ? 0 : 0.9;
  renderMute();
}

/* ------------------------------ Bölge seçimi (çok bölgeli kurulum) ------------------------------ */
const URLP = new URLSearchParams(location.search);
async function probe(url) {
  let best = Infinity;
  for (let i = 0; i < 2; i++) {
    const t0 = performance.now();
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 1500);
      await fetch(url + '/healthz?_=' + Math.random(), { cache: 'no-store', mode: 'cors', signal: ctl.signal });
      clearTimeout(to);
      best = Math.min(best, performance.now() - t0);
    } catch (e) { break; }
  }
  return best === Infinity ? null : Math.round(best);
}
async function pickServer() {
  let info = { current: null, regions: [] };
  try { info = await (await fetch('/regions.json')).json(); } catch (e) { /* tek sunucu modu */ }
  const regions = Array.isArray(info.regions) ? info.regions : [];
  if (!regions.length) return { url: '', regions: [], current: null, pings: {} };
  const pings = {};
  let saved = URLP.get('region');
  if (!saved) { try { saved = localStorage.getItem('low_region'); } catch (e) { /* yok */ } }
  let pick = regions.find((r) => r.id === saved);
  if (!pick) { // ilk giriş: hepsine ping at, en yakınını seç
    await Promise.all(regions.map(async (r) => { pings[r.id] = await probe(r.url); }));
    pick = regions.filter((r) => pings[r.id] != null).sort((a, b) => pings[a.id] - pings[b.id])[0]
      || regions.find((r) => r.id === info.current) || regions[0];
  }
  return { url: pick.url, regions, current: pick.id, pings };
}
const SERVER = await pickServer();
const getToken = () => { try { return localStorage.getItem('low_token') || ''; } catch (e) { return ''; } };
const setToken = (t) => { try { if (t) localStorage.setItem('low_token', t); else localStorage.removeItem('low_token'); } catch (e) { /* yok */ } };
const sameOrigin = !SERVER.url || new URL(SERVER.url, location.href).origin === location.origin;
const socket = sameOrigin ? window.io({ auth: { pid: PID, token: getToken() } }) : window.io(SERVER.url, { auth: { pid: PID, token: getToken() } });
const API = sameOrigin ? '' : SERVER.url.replace(/\/$/, '');

function renderRegions() {
  const box = document.getElementById('regionBox');
  if (!box) return;
  box.classList.toggle('hidden', !SERVER.regions.length);
  const list = document.getElementById('regionList');
  list.innerHTML = '';
  SERVER.regions.forEach((r) => {
    const b = document.createElement('button');
    b.className = 'btn seg-btn' + (r.id === SERVER.current ? ' on' : '');
    const ms = SERVER.pings[r.id];
    b.innerHTML = '';
    b.appendChild(document.createTextNode(r.name));
    const sm = document.createElement('small');
    sm.textContent = ms ? ms + ' ms' : '...';
    b.appendChild(sm);
    b.addEventListener('click', () => {
      try { localStorage.setItem('low_region', r.id); } catch (e) { /* yok */ }
      location.href = location.pathname + '?region=' + encodeURIComponent(r.id);
    });
    list.appendChild(b);
  });
}
if (SERVER.regions.length) {
  try { localStorage.setItem('low_region', SERVER.current); } catch (e) { /* yok */ }
  renderRegions();
  SERVER.regions.forEach((r) => { if (SERVER.pings[r.id] == null) probe(r.url).then((ms) => { SERVER.pings[r.id] = ms; renderRegions(); }); });
}
const pendingRoom = URLP.get('room');

const S = {
  id: PID,
  room: null,
  inGame: false,
  mode: 'FFA',
  map: MAPS.classic,
  roster: new Map(),
  snaps: [],
  latest: null,
  particles: [],
  rings: [],
  floaters: [],
  confetti: [],
  bumpPulse: [0, 0, 0, 0, 0, 0, 0, 0],
  hillPos: null,
  lastPhase: '',
  matchXp: 0, lastHitXp: 0, camX: 540,
  lastCd: 0,
  shake: 0,
  alive: false,
  over: false,
  needResume: false,
  scale: 1,
  myCountry: 'TR',
  lastAlarm: 0,
  lastBombSec: 0,
  round: 1,
  rounds: 1,
  danger: 0,
  puSeen: new Set(),
  bubbles: new Map()
};
try { S.myCountry = localStorage.getItem('low_country') || 'TR'; } catch (e) { /* yok */ }
if (!CNAME[S.myCountry]) S.myCountry = 'TR';

/* Tahmin (client-side prediction) durumu */
const P = { b: null, env: null, inputs: [], seq: 0, acc: 0, err: { x: 0, y: 0 }, dashPending: false };

/* ------------------------------ Lobi UI ------------------------------ */
const nameInput = $('nameInput');
try { nameInput.value = localStorage.getItem('low_name') || ''; } catch (e) { /* yok */ }

function myName() {
  const v = nameInput.value.trim();
  try { localStorage.setItem('low_name', v); localStorage.setItem('low_country', S.myCountry); } catch (e) { /* yok */ }
  return v || 'Player';
}

const grid = $('countryGrid');
const countryEls = {};
COUNTRIES.forEach((c) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'country';
  b.appendChild(flagIcon(c.code, 88));
  const s = document.createElement('span');
  s.textContent = CNAME[c.code];
  s.dataset.cc = c.code;
  b.appendChild(s);
  b.addEventListener('click', () => {
    initAudio();
    if (b.classList.contains('taken')) return;
    S.myCountry = c.code;
    refreshCountrySel();
    if (acct.on) apiCall('POST', '/api/profile', { country: c.code }).catch(() => {});
    if (S.room) socket.emit('setProfile', { country: c.code, name: myName() });
  });
  grid.appendChild(b);
  countryEls[c.code] = b;
});

function refreshCountrySel() {
  const taken = new Set();
  if (S.room) S.room.players.forEach((p) => { if (p.id !== S.id) taken.add(p.country); });
  COUNTRIES.forEach((c) => {
    countryEls[c.code].classList.toggle('sel', c.code === S.myCountry);
    countryEls[c.code].classList.toggle('taken', taken.has(c.code));
  });
}
refreshCountrySel();

// Harita seçici
const mapGrid = $('mapGrid');
const mapBtns = {};
[...MAP_KEYS, 'random'].forEach((k) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn map-btn';
  b.textContent = k === 'random' ? T('random') : MAPS[k].name;
  if (k === 'random') b.dataset.i18n = 'random';
  b.addEventListener('click', () => socket.emit('setMap', k));
  mapGrid.appendChild(b);
  mapBtns[k] = b;
});

const rushGrid = document.createElement('div');
rushGrid.className = 'map-grid hidden';
rushGrid.id = 'rushGrid';
const rushBtns = {};
RUSH_TRACK_KEYS.forEach((k) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn map-btn';
  b.textContent = RUSH_TRACK_NAMES[k];
  b.addEventListener('click', () => socket.emit('setMap', k));
  rushGrid.appendChild(b);
  rushBtns[k] = b;
});
mapGrid.parentNode.insertBefore(rushGrid, mapGrid.nextSibling);

nameInput.addEventListener('change', () => {
  const n = myName();
  if (S.room) socket.emit('setProfile', { name: n });
});

$('createBtn').addEventListener('click', () => {
  initAudio();
  $('entryMsg').textContent = '';
  socket.emit('createRoom', { name: myName(), country: S.myCountry, lvl: myLvl() }, onEnter);
});
$('quickBtn').addEventListener('click', () => {
  initAudio();
  $('entryMsg').textContent = '';
  socket.emit('quickPlay', { name: myName(), country: S.myCountry, lvl: myLvl() }, (res) => {
    onEnter(res);
    if (res && res.ok && res.quick) $('roomMsg').textContent = T('quick_search');
  });
});
document.querySelectorAll('#diffSeg button').forEach((b) => b.addEventListener('click', () => socket.emit('setDiff', b.dataset.diff)));
document.querySelectorAll('#roundSeg button').forEach((b) => b.addEventListener('click', () => socket.emit('setRounds', Number(b.dataset.r))));
$('muteBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
$('muteBtn').addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
$('muteBtn2').addEventListener('click', toggleMute);
document.querySelectorAll('#emotes button').forEach((b) => b.addEventListener('click', () => socket.emit('emote', Number(b.dataset.i))));
renderMute();
renderStats();
$('joinBtn').addEventListener('click', () => joinCode($('codeInput').value));
$('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinCode($('codeInput').value); });
function joinRoomById(roomId) {
  initAudio();
  $('entryMsg').textContent = '';
  socket.emit('join_room', { roomId, name: myName(), country: S.myCountry, lvl: myLvl() }, onEnter);
}
function joinCode(raw) {
  initAudio();
  const code = String(raw || '').trim();
  if (!code) { $('entryMsg').textContent = T('enter_code'); return; }
  $('entryMsg').textContent = '';
  socket.emit('joinRoom', { code, name: myName(), country: S.myCountry, lvl: myLvl() }, onEnter);
}
function onEnter(res) {
  if (!res || !res.ok) { $('entryMsg').textContent = errText(res && res.error, 'err_connect'); return; }
  S.id = PID;
}

function leaveNow() {
  socket.emit('leaveRoom');
  S.room = null;
  S.needResume = false;
  showScreen(false);
  renderLobby();
}
$('leaveBtn').addEventListener('click', leaveNow);
$('exitBtn').addEventListener('click', leaveNow);
$('roomCode').addEventListener('click', () => {
  const code = $('roomCode').textContent;
  const link = location.origin + location.pathname + '?' + (SERVER.current ? 'region=' + encodeURIComponent(SERVER.current) + '&' : '') + 'room=' + encodeURIComponent(code);
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
  $('roomMsg').textContent = T('copied', { code });
});
$('modeSel').addEventListener('change', () => socket.emit('setMode', $('modeSel').value));
document.querySelectorAll('#sizeSeg button').forEach((b) => b.addEventListener('click', () => socket.emit('setSize', b.dataset.size)));
$('readyBtn').addEventListener('click', () => { const m = S.room && S.room.players.find((q) => q.id === S.id); socket.emit('setReady', !(m && m.ready)); });
$('teamA').addEventListener('click', () => socket.emit('setProfile', { team: 'A' }));
$('teamB').addEventListener('click', () => socket.emit('setProfile', { team: 'B' }));
$('botCount').addEventListener('input', () => { $('botVal').textContent = $('botCount').value; });
$('startBtn').addEventListener('click', () => {
  initAudio();
  $('roomMsg').textContent = '';
  socket.emit('startGame', { bots: Number($('botCount').value) }, (res) => {
    if (!res || !res.ok) $('roomMsg').textContent = errText(res && res.error, 'err_start');
  });
});

function errText(code, fallbackKey) { return code ? T('err_' + code) : T(fallbackKey); }

function mapTitle(k) { return k === 'random' ? T('random') : (MAPS[k] ? MAPS[k].name : (RUSH_TRACK_NAMES[k] || k)); }

function renderRooms(list) {
  const ul = $('roomList');
  ul.innerHTML = '';
  if (!list || !list.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = T('no_rooms');
    ul.appendChild(li);
    return;
  }
  list.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'room-card ' + r.status;
    const code = document.createElement('b'); code.className = 'rc-code'; code.textContent = '#' + r.code;
    const map = document.createElement('span'); map.className = 'rc-map'; map.textContent = (MODE_INFO[r.mode] || [r.mode])[0] + ' · ' + mapTitle(r.map);
    const occ = document.createElement('span'); occ.className = 'rc-occ';
    occ.textContent = (r.status === 'full' ? '\u{1F534} ' : '\u{1F7E2} ') + r.count + '/' + r.max + ' · ' + r.host;
    const st = document.createElement('span'); st.className = 'st ' + r.status;
    st.textContent = r.status === 'lobby' ? T('st_lobby') : r.status === 'full' ? T('st_full') : T('st_playing');
    const btn = document.createElement('button');
    btn.className = 'btn small primary';
    btn.textContent = r.status === 'playing' ? T('watch') : T('join_btn');
    btn.disabled = r.status === 'full';
    btn.addEventListener('click', () => joinRoomById(r.code));
    li.append(code, map, occ, st, btn);
    ul.appendChild(li);
  });
}

function updateAutoMsg() {
  const el = $('autoMsg');
  if (!S.room || S.inGame || !S.autoAt) { el.classList.add('hidden'); return; }
  el.textContent = T('auto_start', { s: Math.max(0, Math.ceil((S.autoAt - performance.now()) / 1000)) });
  el.classList.remove('hidden');
}
setInterval(updateAutoMsg, 250);

function renderLobby() {
  const r = S.room;
  updateSides();
  $('entryCard').classList.toggle('hidden', !!r);
  $('roomCard').classList.toggle('hidden', !r);
  $('lobby').classList.toggle('in-room', !!r);
  if (!r) loadLeaderboard();
  refreshCountrySel();
  if (!r) return;
  const me = r.players.find((p) => p.id === S.id);
  if (me && me.country !== S.myCountry) { S.myCountry = me.country; refreshCountrySel(); }
  const isHost = r.host === S.id;
  const team = isTeam(r.mode);

  $('roomCode').textContent = r.code;
  $('modeSel').value = r.mode;
  $('modeSel').disabled = !isHost;
  $('modeDesc').textContent = (MODE_INFO[r.mode] || ['', ''])[1];
  Object.entries(mapBtns).forEach(([k, b]) => { b.classList.toggle('on', r.map === k); b.disabled = !isHost; });
  const rush = isRush(r.mode);
  const fixedMap = r.mode === 'SOCCER' || r.mode === 'RACE' || rush;
  mapGrid.classList.toggle('hidden', rush);
  rushGrid.classList.toggle('hidden', !rush);
  Object.entries(rushBtns).forEach(([k, b]) => { b.classList.toggle('on', r.map === k); b.disabled = !isHost; });
  $('mapGrid').style.opacity = r.mode === 'SOCCER' || r.mode === 'RACE' ? '0.35' : '1';
  document.querySelectorAll('#sizeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.size === r.size); b.disabled = !isHost; });
  $('sizeSeg').style.opacity = fixedMap ? '0.35' : '1';
  $('mapDesc').textContent = rush ? T('mapdesc.' + (RUSH_TRACK_KEYS.includes(r.map) ? r.map : 'r1')) : fixedMap ? T('map_fixed_soccer') : r.map === 'random' ? T('map_random_desc') : (MAPS[r.map] ? T('mapdesc.' + r.map) : '');
  document.querySelectorAll('#diffSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.diff === r.diff); b.disabled = !isHost; });
  document.querySelectorAll('#roundSeg button').forEach((b) => { b.classList.toggle('on', Number(b.dataset.r) === r.rounds); b.disabled = !isHost; });
  $('teamPick').classList.toggle('hidden', !team);
  $('teamA').classList.toggle('on', !!me && me.team === 'A');
  $('teamB').classList.toggle('on', !!me && me.team === 'B');
  $('hostControls').classList.toggle('hidden', !isHost);
  $('waitMsg').classList.toggle('hidden', isHost);
  $('guestControls').classList.toggle('hidden', isHost);
  const myReady = !!(me && me.ready);
  $('readyBtn').textContent = myReady ? T('not_ready') : T('ready');
  $('readyBtn').classList.toggle('on', myReady);
  $('playerCount').textContent = `(${r.players.length}/${r.max})`;
  $('botCount').max = String(Math.max(0, r.max - r.players.length));
  if (Number($('botCount').value) > Number($('botCount').max)) $('botCount').value = $('botCount').max;
  $('botVal').textContent = $('botCount').value;

  const ul = $('playerList');
  ul.innerHTML = '';
  r.players.forEach((p) => {
    const li = document.createElement('li');
    if (p.id === S.id) li.classList.add('me');
    if (p.off) li.style.opacity = '0.45';
    li.appendChild(flagIcon(p.country, 60));
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = p.name + ' · ' + CNAME[p.country] + (p.off ? T('offline') : '');
    li.appendChild(nm);
    if (p.wins) { const t = document.createElement('span'); t.className = 'tag w'; t.textContent = '\u{1F3C6} ' + p.wins; li.appendChild(t); }
    if (p.id === r.host) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = '\u{1F451} HOST'; li.appendChild(t); }
    else if (p.ready) { const t = document.createElement('span'); t.className = 'tag rdy'; t.textContent = T('ready_tag'); li.appendChild(t); }
    if (p.lvl > 1 || p.id === S.id) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'Lv.' + (p.id === S.id ? myLvl() : p.lvl); li.appendChild(t); }
    if (isHost && p.id !== S.id) { const kb = document.createElement('button'); kb.className = 'kick'; kb.textContent = T('kick'); kb.addEventListener('click', () => socket.emit('kick', p.id)); li.appendChild(kb); }
    if (team) { const t = document.createElement('span'); t.className = 'tag ' + p.team.toLowerCase(); t.textContent = T('team_x', { t: p.team }); li.appendChild(t); }
    ul.appendChild(li);
  });
}

function showScreen(game) {
  S.inGame = game;
  updateSides();
  lobbyEl.classList.toggle('hidden', game);
  gameEl.classList.toggle('hidden', !game);
  document.documentElement.classList.toggle('ingame', game);
  if (game) resize();
  else window.scrollTo(0, 0);
}

/* ------------------------------ Yan bilgi panelleri (üzerine gelince / seçili) ------------------------------ */
const side = { hoverMap: null, hoverMode: null, shownMap: null, shownMode: null };
const sideMapEl = $('sideMap');
const sideModeEl = $('sideMode');
const SIDE_COLS = ['#ff2d85', '#22d3ee', '#facc15', '#4ade80', '#a78bfa', '#fb923c', '#f87171', '#60a5fa'];

function fillSide(el, title, desc, list) {
  el.querySelector('.side-title').textContent = title;
  el.querySelector('.side-desc').textContent = desc;
  const ul = el.querySelector('.side-list');
  ul.innerHTML = '';
  list.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
}

function updateSides() {
  const show = !!S.room && !S.inGame;
  sideMapEl.classList.toggle('show', show);
  sideModeEl.classList.toggle('show', show);
  if (!show) { side.shownMap = null; side.shownMode = null; return; }
  const mk = side.hoverMap || S.room.map;
  const md = side.hoverMode || S.room.mode;
  if (side.shownMap !== mk) {
    side.shownMap = mk;
    const d = MAP_DETAIL[mk] || { stars: 0, tips: [] };
    const m = MAPS[mk] || { name: RUSH_TRACK_NAMES[mk] || mk };
    fillSide(sideMapEl, mk === 'random' ? T('random_title') : m.name, mk === 'random' ? T('random_sub') : T('mapdesc.' + mk), d.tips);
    sideMapEl.querySelector('.side-stars').textContent = d.stars ? T('difficulty') + '★'.repeat(d.stars) + '☆'.repeat(4 - d.stars) : '';
  }
  if (side.shownMode !== md) {
    side.shownMode = md;
    const d = MODE_DETAIL[md];
    fillSide(sideModeEl, MODE_INFO[md][0], MODE_INFO[md][1], d.rules);
    sideModeEl.querySelector('.side-win').textContent = '\u{1F3C6} ' + d.win + ' · ' + T('tip_lbl') + d.tip;
  }
}

Object.entries(mapBtns).forEach(([k, b]) => {
  const on = () => { side.hoverMap = k; updateSides(); };
  const off = () => { side.hoverMap = null; updateSides(); };
  b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
  b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
});

function pvRing(g, R, rot, gh, n, col, k) {
  const step = (Math.PI * 2) / n;
  g.lineCap = 'round';
  g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.lineWidth = 12;
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * step + gh;
    const a1 = rot + (i + 1) * step - gh;
    if (a1 <= a0) { if (gh <= 0) { g.beginPath(); g.arc(0, 0, R * k, 0, Math.PI * 2); g.stroke(); break; } continue; }
    g.beginPath(); g.arc(0, 0, R * k, a0, a1); g.stroke();
  }
  g.shadowBlur = 0;
}

function pvDots(g, time, n, rad, k, cols) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + time * (0.35 + (i % 3) * 0.12) * (i % 2 ? 1 : -1);
    const r = rad * (0.35 + 0.55 * ((i * 37) % 10) / 10) * k;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    g.fillStyle = cols[i % cols.length];
    g.shadowColor = cols[i % cols.length]; g.shadowBlur = 10;
    g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x - 4, y - 3, 4.5, 0, Math.PI * 2); g.arc(x + 5, y - 3, 4.5, 0, Math.PI * 2); g.fill();
  }
}

function pvClear(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#05050f'; g.fillRect(0, 0, 560, 560);
  g.strokeStyle = 'rgba(120,120,255,0.07)'; g.lineWidth = 2;
  for (let i = 0; i <= 560; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 560); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(560, i); g.stroke(); }
  g.translate(280, 280);
}

function drawMapPreview(g, key, time) {
  pvClear(g);
  const k = 0.7;
  if (key === 'random') {
    g.font = '900 220px "Segoe UI", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,45,133,0.9)'; g.shadowColor = '#ff2d85'; g.shadowBlur = 30; g.fillText('?', 0, 12); g.shadowBlur = 0;
    pvRing(g, 360, time * 0.7, 0.3, 2, '#22d3ee', k);
    return;
  }
  if (RUSH_TRACK_NAMES[key]) {
    const tk = RUSH_TRACKS[key];
    g.save();
    g.scale(0.07, 0.07);
    g.translate(-3000, 0);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 60;
    g.beginPath(); g.moveTo(0, -RUSH.halfH); g.lineTo(6000, -RUSH.halfH); g.moveTo(0, RUSH.halfH); g.lineTo(6000, RUSH.halfH); g.stroke();
    g.fillStyle = 'rgba(74,222,128,0.5)'; tk.pads.forEach((p) => { g.fillStyle = (p.dir || 1) > 0 ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.6)'; g.fillRect(p.x - p.w / 2, -RUSH.halfH, p.w, RUSH.halfH * 2); });
    g.fillStyle = '#a78bfa'; tk.bumps.forEach((b2) => { g.beginPath(); g.arc(b2.x, b2.y, b2.r, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = '#fb923c'; g.lineWidth = 40; tk.props.forEach((p) => { const a = time * p.s; g.beginPath(); g.moveTo(p.x - Math.cos(a) * p.L, p.y - Math.sin(a) * p.L); g.lineTo(p.x + Math.cos(a) * p.L, p.y + Math.sin(a) * p.L); g.stroke(); });
    g.strokeStyle = '#fb7185'; g.lineWidth = 36; tk.lasers.forEach((l) => { g.beginPath(); g.moveTo(l.x, l.y0); g.lineTo(l.x, l.y1); g.stroke(); });
    g.strokeStyle = '#94a3b8'; g.lineWidth = 60; tk.pistons.forEach((p) => { g.beginPath(); g.moveTo(p.x, p.side * RUSH.halfH); g.lineTo(p.x, p.side * (RUSH.halfH - 260)); g.stroke(); });
    g.strokeStyle = '#a78bfa'; g.lineWidth = 40; tk.funnels.forEach((f) => { [-1, 1].forEach((sg) => { g.beginPath(); g.moveTo(f.x - 300, sg * RUSH.halfH); g.lineTo(f.x, sg * f.gap / 2); g.lineTo(f.x + 140, sg * f.gap / 2); g.stroke(); }); });
    tk.gates.forEach((q) => { g.beginPath(); g.moveTo(q.x, -RUSH.halfH); g.lineTo(q.x, q.gy - q.gap / 2); g.moveTo(q.x, q.gy + q.gap / 2); g.lineTo(q.x, RUSH.halfH); g.stroke(); });
    g.restore();
    return;
  }
  const m = MAPS[key];
  const t = time % 14;
  let R = Math.max(m.Rmin, m.R0 - m.shrink * (t % 12));
  if (m.pulseAmp) R -= m.pulseAmp * (0.5 - 0.5 * Math.cos((Math.PI * 2 * time) / m.pulsePeriod));
  const rot = time * m.rot;
  if (key === 'ice') {
    g.fillStyle = 'rgba(103,232,249,0.10)'; g.beginPath(); g.arc(0, 0, R * k, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(186,230,253,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i * 0.8 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a + 0.15) * R * k * 0.55, Math.sin(a + 0.15) * R * k * 0.55); g.lineTo(Math.cos(a - 0.1) * R * k * 0.95, Math.sin(a - 0.1) * R * k * 0.95); g.stroke(); }
  } else if (key === 'whirlpool') {
    g.strokeStyle = 'rgba(52,211,153,0.28)'; g.lineWidth = 12; g.lineCap = 'round';
    for (let a = 0; a < 3; a++) { g.beginPath(); for (let r = 20; r < R * k - 8; r += 10) { const an = a * 2.094 + time * 0.9 + r * 0.02; const x = Math.cos(an) * r; const y = Math.sin(an) * r; if (r === 20) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  } else if (key === 'blackhole') {
    const h = m.hole * k;
    const gr = g.createRadialGradient(0, 0, h * 0.6, 0, 0, h * 3.2);
    gr.addColorStop(0, 'rgba(192,132,252,0.6)'); gr.addColorStop(1, 'rgba(192,132,252,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, h * 3.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(233,213,255,0.8)'; g.lineWidth = 4; g.setLineDash([14, 12]);
    g.save(); g.rotate(time * 2.2); g.beginPath(); g.arc(0, 0, h + 10, 0, Math.PI * 2); g.stroke(); g.restore(); g.setLineDash([]);
    g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, h, 0, Math.PI * 2); g.fill();
  } else if (key === 'lava') {
    const lc = lavaCycle({ map: m, t: m.lava.grace + (time % (m.lava.period * 2)) });
    const step = (Math.PI * 2) / LAVA_SECTORS;
    lc.sectors.forEach((s) => {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * k, s * step, (s + 1) * step); g.closePath();
      if (lc.state === 1) { g.fillStyle = `rgba(251,146,60,${0.14 + 0.12 * Math.sin(time * 14)})`; g.fill(); g.strokeStyle = 'rgba(251,146,60,0.8)'; g.lineWidth = 3; g.setLineDash([12, 10]); g.stroke(); g.setLineDash([]); }
      else if (lc.state === 2) { g.fillStyle = 'rgba(239,68,68,0.55)'; g.fill(); }
    });
  }
  const env = { map: m, rot, t: 0 };
  pvRing(g, R, rot, m.gapHalf, m.gaps, m.col, k);
  bumpers(env).forEach((bm) => {
    const gr = g.createRadialGradient(bm.x * k, bm.y * k, 2, bm.x * k, bm.y * k, bm.r * k);
    gr.addColorStop(0, '#f5f3ff'); gr.addColorStop(0.5, key === 'pinball' ? '#fb923c' : '#8b5cf6'); gr.addColorStop(1, key === 'pinball' ? '#9a3412' : '#4c1d95');
    g.fillStyle = gr; g.beginPath(); g.arc(bm.x * k, bm.y * k, bm.r * k, 0, Math.PI * 2); g.fill();
  });
  pvDots(g, time, 6, R, k, SIDE_COLS);
}

function drawModePreview(g, mode, time) {
  pvClear(g);
  const k = 0.7;
  const closed = mode === 'BOMB' || mode === 'HILL' || mode === 'COINS';
  const m = mapFor('classic', mode);
  const R = 360;
  if (mode === 'RACE') {
    const sk = 0.34;
    g.save(); g.scale(sk, sk);
    g.strokeStyle = '#a78bfa'; g.lineWidth = 12; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-RACE.halfW, 560); g.lineTo(-RACE.halfW, RACE.topY); g.lineTo(-RACE.exitHalf, RACE.funnelY);
    g.moveTo(RACE.halfW, 560); g.lineTo(RACE.halfW, RACE.topY); g.lineTo(RACE.exitHalf, RACE.funnelY); g.stroke();
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 14;
    RACE.pegs.forEach((pg) => { g.beginPath(); g.arc(pg.x, pg.y, RACE.pegR + 2, 0, Math.PI * 2); g.fill(); });
    g.shadowBlur = 0;
    g.strokeStyle = '#ef4444'; g.lineWidth = 9; g.setLineDash([36, 22]);
    g.beginPath(); g.moveTo(-RACE.halfW, RACE.redY); g.lineTo(RACE.halfW, RACE.redY); g.stroke(); g.setLineDash([]);
    const ph = (time * 0.35) % 1;
    for (let i = 0; i < 6; i++) {
      const q = (ph + i / 6) % 1;
      g.fillStyle = SIDE_COLS[i % SIDE_COLS.length];
      g.beginPath(); g.arc(Math.sin(q * 11 + i * 2) * 250, RACE.funnelY + q * (RACE.redY - RACE.funnelY), 20, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    return;
  }
  if (mode === 'SOCCER') {
    g.fillStyle = 'rgba(34,197,94,0.12)'; g.beginPath(); g.arc(0, 0, R * k, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -R * k); g.lineTo(0, R * k); g.stroke();
    g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.stroke();
    pvRing(g, R, 0, 0.42, 2, '#22c55e', k);
    [[-1, TEAM_COL.A], [1, TEAM_COL.B]].forEach(([sg, col]) => {
      g.strokeStyle = col; g.lineWidth = 12; g.shadowColor = col; g.shadowBlur = 18; g.lineCap = 'round';
      const a0 = sg < 0 ? Math.PI - 0.42 : -0.42;
      g.beginPath(); g.arc(0, 0, R * k + 6, a0, a0 + 0.84); g.stroke(); g.shadowBlur = 0;
    });
    [[-120, -50, TEAM_COL.A], [-150, 40, TEAM_COL.A], [120, -40, TEAM_COL.B], [150, 50, TEAM_COL.B]].forEach(([x, y, c], i) => {
      g.fillStyle = c; g.beginPath(); g.arc(x + Math.sin(time * 1.5 + i) * 10, y + Math.cos(time * 1.2 + i) * 10, 16, 0, Math.PI * 2); g.fill();
    });
    const bx = Math.sin(time * 1.2) * 140;
    const by = Math.sin(time * 2.1) * 40;
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 14; g.beginPath(); g.arc(bx, by, 13, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#111'; g.beginPath(); g.arc(bx, by, 5, 0, Math.PI * 2); g.fill();
    return;
  }
  pvRing(g, R, time * 0.7, closed ? 0 : m.gapHalf, closed ? 1 : 2, closed ? '#ff2d85' : '#ff2d85', k);
  if (mode === 'FFA') {
    pvDots(g, time, 8, R, k, ['#fff', '#fde68a', '#bbf7d0', '#bae6fd']);
  } else if (mode === 'TEAM') {
    for (let i = 0; i < 8; i++) {
      const left = i < 4;
      const x = (left ? -1 : 1) * (80 + (i % 2) * 70) + Math.sin(time * 1.4 + i) * 12;
      const y = ((i % 4) - 1.5) * 70 + Math.cos(time * 1.1 + i) * 10;
      g.fillStyle = left ? TEAM_COL.A : TEAM_COL.B; g.shadowColor = g.fillStyle; g.shadowBlur = 12;
      g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    }
  } else if (mode === 'BOMB') {
    pvDots(g, time, 7, R, k, ['#fff', '#fde68a', '#bbf7d0']);
    const a = time * 0.9;
    const x = Math.cos(a) * 110;
    const y = Math.sin(a) * 80;
    const pulse = 0.5 + 0.5 * Math.sin(time * 9);
    g.strokeStyle = `rgba(239,68,68,${0.5 + 0.5 * pulse})`; g.lineWidth = 6; g.shadowColor = '#ef4444'; g.shadowBlur = 20;
    g.beginPath(); g.arc(x, y, 26 + pulse * 5, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y - 44, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 22px "Segoe UI", Arial'; g.textAlign = 'center'; g.fillText(String(9 - Math.floor(time % 9)), x, y - 36);
  } else if (mode === 'HILL') {
    const hx = Math.cos(time * 0.5) * 110;
    const hy = Math.sin(time * 0.7) * 90;
    g.strokeStyle = '#4ade80'; g.lineWidth = 5; g.shadowColor = '#4ade80'; g.shadowBlur = 16; g.setLineDash([18, 12]);
    g.save(); g.translate(hx, hy); g.rotate(time); g.beginPath(); g.arc(0, 0, 77, 0, Math.PI * 2); g.stroke(); g.restore();
    g.setLineDash([]); g.shadowBlur = 0;
    g.fillStyle = 'rgba(74,222,128,0.14)'; g.beginPath(); g.arc(hx, hy, 77, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4ade80'; g.beginPath(); g.arc(hx + Math.sin(time * 2) * 20, hy + Math.cos(time * 2) * 20, 16, 0, Math.PI * 2); g.fill();
    pvDots(g, time, 4, R, k, ['#fff', '#fde68a']);
  } else if (mode === 'COINS') {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const x = Math.cos(a) * (60 + (i % 3) * 55);
      const y = Math.sin(a) * (50 + (i % 4) * 30) + Math.sin(time * 4 + i) * 4;
      const sq = Math.abs(Math.cos(time * 3 + i));
      g.fillStyle = i % 4 === 0 ? '#fbbf24' : '#facc15'; g.shadowColor = '#facc15'; g.shadowBlur = 12;
      g.beginPath(); g.ellipse(x, y, (i % 4 === 0 ? 14 : 10) * (0.35 + 0.65 * sq), i % 4 === 0 ? 14 : 10, 0, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    }
    pvDots(g, time, 5, R, k, ['#fff', '#bae6fd', '#fecaca']);
  }
}

const sideMapCtx = $('sideMapCv').getContext('2d');
const sideModeCtx = $('sideModeCv').getContext('2d');
function sideLoop(now) {
  requestAnimationFrame(sideLoop);
  if (S.inGame || !S.room) return;
  const t = now / 1000;
  if (side.shownMap && sideMapEl.classList.contains('show')) drawMapPreview(sideMapCtx, side.shownMap, t);
  if (side.shownMode && sideModeEl.classList.contains('show')) drawModePreview(sideModeCtx, side.shownMode, t);
}
requestAnimationFrame(sideLoop);

/* ------------------------------ Socket olayları ------------------------------ */
socket.on('connect', () => {
  $('netLine').classList.add('hidden');
  if (pendingRoom && !S.room && !S.joinTried) {
    S.joinTried = true;
    $('codeInput').value = pendingRoom;
    history.replaceState(null, '', location.pathname + (SERVER.current ? '?region=' + encodeURIComponent(SERVER.current) : ''));
    joinCode(pendingRoom);
  }
});
socket.on('disconnect', () => {
  S.needResume = !!S.room;
  if (S.inGame) $('netLine').classList.remove('hidden');
  else if (S.room) $('roomMsg').textContent = T('reconnecting');
  keys.clear();
  P.inputs.length = 0;
});
socket.on('resume', () => {
  S.needResume = false;
  $('netLine').classList.add('hidden');
  $('roomMsg').textContent = '';
});
socket.on('rooms', (list) => {
  if (S.needResume) {
    // sunucu bizi bir odada görmedi: oda kapanmış
    S.needResume = false;
    S.room = null;
    showScreen(false);
    $('entryMsg').textContent = T('dropped');
    renderLobby();
  }
  S.roomsList = list;
  renderRooms(list);
});
socket.on('roomState', (r) => {
  S.room = r;
  S.autoAt = r.autoLeft > 0 && !r.manual ? performance.now() + r.autoLeft * 1000 : 0;
  S.id = PID;
  if (!S.inGame) renderLobby(); else updateHostBadge();
});
socket.on('gameStart', (g) => {
  S.mode = g.mode;
  S.map = mapFor(g.map, g.mode, g.size);
  S.round = g.round || 1;
  S.rounds = g.rounds || 1;
  S.hillPos = null;
  S.roster = new Map(g.roster.map((p) => [p.id, p]));
  S.snaps = [];
  S.latest = null;
  S.particles = [];
  S.rings = [];
  S.floaters = [];
  S.confetti = [];
  S.puSeen = new Set();
  S.lastPhase = '';
  S.lastCd = 0;
  S.over = false;
  S.bubbles = new Map();
  S.alive = S.roster.has(PID);
  P.b = null; P.env = null; P.inputs = []; P.seq = 0; P.acc = 0; P.err = { x: 0, y: 0 }; P.dashPending = false;
  $('elimList').innerHTML = '';
  $('elimListD').innerHTML = '';
  $('overModal').classList.add('hidden');
  S.matchXp = 0;
  S.acctPrev = undefined;
  $('elimTitle').textContent = g.mode === 'SOCCER' ? T('goals') : T('eliminated');
  (g.elims || []).forEach((e) => addElim(e.id, e.rank, false));
  updateHostBadge();
  renderProfile();
  (g.goals || []).forEach((go) => addGoal(go, false));
  $('leftNum').textContent = String(g.total - (g.elims || []).length);
  $('banner').classList.add('hidden');
  $('banner').classList.remove('over');
  $('results').classList.add('hidden');
  $('feed').innerHTML = '';
  S.raceInfo = null;
  S.camX = 420;
  stage.classList.toggle('rush', isRush(g.mode));
  boardSig = '';
  $('dRoom').textContent = S.room ? S.room.code : '-';
  $('dMode').textContent = T('mode') + ': ' + (MODE_INFO[g.mode] || [g.mode])[0];
  $('dMap').textContent = T('map') + ': ' + S.map.name;
  $('stage').classList.toggle('race', g.mode === 'RACE');
  keys.clear();
  lastSent = '';
  showScreen(true);
  initAudio();
  $('dashBtn').classList.toggle('hidden', !isTouch());
});
socket.on('kicked', (e) => {
  S.room = null;
  S.needResume = false;
  $('overModal').classList.add('hidden');
  showScreen(false);
  renderLobby();
  const r = e && e.reason;
  $('entryMsg').textContent = r === 'banned' ? T('banned_msg') : r === 'room_closed' ? T('closed_msg') : T('kicked_msg');
});
socket.on('acct', (u) => {
  if (!acct.on) return;
  S.acctPrev = profile.xp;
  profile.xp = u.xp; profile.wins = u.wins; profile.score = u.score; profile.level = levelOf(u.xp);
  S.matchXp = u.gained;
  acct.user = { ...acct.user, ...u };
  renderQuests();
  renderProfile();
  updateAccBtn();
});
socket.on('announce', (a) => showAnnounce(a.text));
socket.on('toLobby', () => {
  $('overModal').classList.add('hidden');
  S.over = false;
  $('results').classList.add('hidden');
  $('banner').classList.remove('over');
  renderStats();
  showScreen(false);
  renderLobby();
});
socket.on('snap', (s) => {
  if (!S.inGame) return;
  s.at = performance.now();
  s.m = new Map(s.b.map((a) => [a[0], a]));
  S.snaps.push(s);
  if (S.snaps.length > 12) S.snaps.shift();
  S.latest = s;
  S.alive = s.m.has(PID);
  reconcile(s);
  onSnap(s);
});

/* Sunucu mutabakatı: son onaylanan girdiden sonrasını yeniden oynat */
function stepPredict(b, env, ix, iy, dash) {
  advanceEnv(env);
  applyControl(b, ix, iy, dash, null, env);
  const sdt = DT / SUB;
  for (let i = 0; i < SUB; i++) moveSub(b, env, sdt, () => 0.5, null);
}

function reconcile(s) {
  const a = s.m.get(PID);
  if (!a || s.ph !== 'play' || a[11]) { P.b = null; P.inputs.length = 0; return; }
  const ack = (s.ak && s.ak[PID]) || 0;
  const before = P.b ? { x: P.b.x + P.err.x, y: P.b.y + P.err.y } : null;
  const b = { id: PID, x: a[1], y: a[2], vx: a[3], vy: a[4], f: a[5], cd: a[6], armorT: a[7], ghostT: a[8], superT: a[9], dashT: a[10] };
  const env = { map: S.map, t: s.t, rot: s.rot, R: s.R, gh: s.gh, gate: s.gt || 0 };
  P.inputs = P.inputs.filter((i) => i.s > ack);
  for (const i of P.inputs) stepPredict(b, env, i.x, i.y, i.d);
  if (before) {
    P.err.x = before.x - b.x;
    P.err.y = before.y - b.y;
    if (Math.hypot(P.err.x, P.err.y) > 160) { P.err.x = 0; P.err.y = 0; }
  } else {
    P.err.x = 0; P.err.y = 0;
  }
  P.b = b;
  P.env = env;
}

function clientTick() {
  if (!S.inGame || !P.b || !S.latest || S.latest.ph !== 'play' || S.latest.fz) return;
  const inp = currentInput();
  const d = P.dashPending;
  P.dashPending = false;
  const seq = ++P.seq;
  socket.volatile.emit('inp', { s: seq, x: inp.x, y: inp.y, d });
  P.inputs.push({ s: seq, x: inp.x, y: inp.y, d });
  if (P.inputs.length > 90) P.inputs.shift();
  const canDash = d && P.b.cd <= 0;
  const mult = P.b.superT > 0 ? 2 : 1;
  stepPredict(P.b, P.env, inp.x, inp.y, d);
  if (canDash) {
    sfx.dash(mult);
    burst(P.b.x, P.b.y, 10, '#ffffff', 220);
    vibrate(12);
  }
}

function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* yok */ } }

function onSnap(s) {
  renderBoard(s);
  if (S.mode === 'SOCCER' && s.scr) {
    $('leftLbl').textContent = 'A';
    $('leftNum').textContent = `${s.scr[0]} : ${s.scr[1]} B`;
    const mm = Math.floor(s.tl / 60);
    const ss = String(s.tl % 60).padStart(2, '0');
    $('specLine').textContent = s.ot ? T('golden') : `${mm}:${ss}`;
  } else if (isRush(S.mode) && s.rc) {
    $('leftLbl').textContent = T('left');
    $('leftNum').textContent = String(s.left);
    const me = s.m.get(PID);
    const pct = me ? Math.min(100, Math.max(0, Math.round((me[1] / RUSH.finishX) * 100))) : 0;
    $('specLine').textContent = S.mode === 'RUSHT' ? 'A ' + s.rc[3] + ' : ' + s.rc[4] + ' B' : (me ? T('rush_prog', { p: pct }) : T('spectating', { n: s.sp }));
  } else if (S.mode === 'RACE' && s.rc) {
    $('leftLbl').textContent = T('race_round', { n: s.rc[0] }).split(' ')[0];
    $('leftNum').textContent = String(s.rc[0]);
    $('specLine').textContent = T('race_fin', { f: s.rc[2], t: s.rc[4] + s.rc[2] }) + ' · ' + T('left') + ': ' + s.rc[3];
  } else if (S.mode === 'HILL' || S.mode === 'COINS') {
    $('leftLbl').textContent = T('time');
    $('leftNum').textContent = String(Math.ceil(s.ht));
    const lead = s.sc && s.sc[0];
    const lp = lead && S.roster.get(lead[0]);
    const mine = s.sc && s.sc.find((x) => x[0] === PID);
    $('specLine').textContent = (lp ? T('leader', { name: CNAME[lp.country], pts: lead[1].toFixed(0) }) : T('leader_none')) + (mine ? T('you_pts', { pts: mine[1].toFixed(0) }) : '');
  } else {
    $('leftLbl').textContent = T('left');
    $('leftNum').textContent = String(s.left);
    $('specLine').textContent = T('spectating', { n: s.sp }) + (!S.alive && S.roster.has(PID) ? T('you_out') : '') + (!S.roster.has(PID) ? T('you_watching') : '');
  }
  if (s.bm && s.ph === 'play') {
    const sec = Math.ceil(s.bm[1]);
    if (sec !== S.lastBombSec) {
      S.lastBombSec = sec;
      if (s.bm[0] === PID || sec <= 3) sfx.beep(sec <= 2);
      if (s.bm[0] === PID) vibrate(15);
    }
  }

  if (s.ph === 'countdown') {
    if (S.lastPhase === '') sfx.gong();
    if (s.cd !== S.lastCd) { S.lastCd = s.cd; sfx.beep(false); }
    showCountdown(s.cd);
  } else if (S.lastPhase === 'countdown' && s.ph === 'play') {
    showBanner('GO!');
    $('banner').classList.remove('card');
    sfx.beep(true);
    setTimeout(() => { if (S.latest && S.latest.ph === 'play') $('banner').classList.add('hidden'); }, 700);
  } else if (S.lastPhase === '' && s.ph === 'play') {
    $('banner').classList.add('hidden');
  }
  S.lastPhase = s.ph;

  s.pu.forEach((p) => S.puSeen.add(p[0]));

  for (const e of s.ev) {
    if (e.k === 'hit') {
      sfx.hit(e.s, e.h);
      hitFx(e);
      const nowMs = performance.now();
      if ((e.a === PID || e.b === PID) && e.s >= 0.2 && nowMs - S.lastHitXp > 450 && S.roster.has(PID)) { S.lastHitXp = nowMs; addXp(10, e.x, e.y); }
    } else if (e.k === 'wall') {
      sfx.wall(e.s);
      if (e.s > 0.4) burst(e.x, e.y, 6, '#ff2d85', 160);
    } else if (e.k === 'dash') {
      if (e.id !== PID) { sfx.dash(e.s); burst(e.x, e.y, 10, '#ffffff', 220); }
      S.rings.push({ x: e.x, y: e.y, r: 20, max: 110, life: 0.35, max_life: 0.35, col: '#ffffff' });
    } else if (e.k === 'bump') {
      sfx.bump();
      S.bumpPulse[e.i] = 1;
      S.rings.push({ x: e.x, y: e.y, r: 40, max: 220, life: 0.5, max_life: 0.5, col: '#a78bfa' });
      burst(e.x, e.y, 14, '#c4b5fd', 420);
    } else if (e.k === 'puSpawn') {
      sfx.spawn();
      S.rings.push({ x: e.x, y: e.y, r: 10, max: 120, life: 0.6, max_life: 0.6, col: PU_COL[e.type] });
    } else if (e.k === 'pickup') {
      if (e.id === PID) { sfx.pickup(); vibrate(25); }
      burst(e.x, e.y, 26, PU_COL[e.type], 380);
      S.rings.push({ x: e.x, y: e.y, r: 20, max: 200, life: 0.55, max_life: 0.55, col: PU_COL[e.type] });
      S.floaters.push({ x: e.x, y: e.y - 40, text: puLabel(e.type) + '!', col: PU_COL[e.type], life: 1.2 });
    } else if (e.k === 'coin') {
      sfx.coin(e.v);
      burst(e.x, e.y, e.v > 1 ? 14 : 6, '#facc15', 260);
      if (e.id === PID) { S.floaters.push({ x: e.x, y: e.y - 30, text: '+' + e.v, col: '#facc15', life: 0.8 }); vibrate(8); }
    } else if (e.k === 'drop') {
      burst(e.x, e.y, 10, '#facc15', 320);
      if (e.id === PID) S.floaters.push({ x: e.x, y: e.y - 40, text: '-1', col: '#ef4444', life: 0.9 });
    } else if (e.k === 'goal') {
      sfx.win(); sfx.confetti();
      S.shake = Math.max(S.shake, 22);
      spawnConfetti();
      vibrate(60);
      addGoal({ id: e.by, team: e.team, s: e.s }, true);
      showBanner(`${T('goal')}<small>${T('team_x', { t: e.team })} · ${e.score[0]} - ${e.score[1]}</small>`);
      $('banner').style.color = TEAM_COL[e.team];
      setTimeout(() => { if (!S.over) { $('banner').classList.add('hidden'); $('banner').style.color = ''; } }, 1900);
    } else if (e.k === 'kick') {
      sfx.hit(e.s, 0);
      burst(e.x, e.y, 6, '#ffffff', 220);
      if (e.s > 0.5) S.shake = Math.max(S.shake, 5 + 6 * e.s);
    } else if (e.k === 'ot') {
      showBanner(`${T('golden_banner')}<small>${T('next_goal')}</small>`);
      setTimeout(() => { if (!S.over) $('banner').classList.add('hidden'); }, 1800);
    } else if (e.k === 'boom') {
      burst(e.x, e.y, 60, '#f97316', 650);
      burst(e.x, e.y, 30, '#fde047', 500);
      S.rings.push({ x: e.x, y: e.y, r: 30, max: 380, life: 0.7, max_life: 0.7, col: '#f97316' });
      S.floaters.push({ x: e.x, y: e.y - 60, text: T('boom'), col: '#f97316', life: 1.4 });
      S.shake = Math.max(S.shake, 24);
    } else if (e.k === 'pass') {
      sfx.spawn();
      const bb = s.m.get(e.id);
      if (bb) S.floaters.push({ x: bb[1], y: bb[2] - 70, text: T('bomb'), col: '#ef4444', life: 1.1 });
    } else if (e.k === 'roundStart') {
      S.rings.push({ x: 0, y: RACE.funnelY, r: 20, max: 260, life: 0.6, max_life: 0.6, col: '#ff2d85' });
      showBanner(T('race_round', { n: e.round }));
      setTimeout(() => { if (!S.over && S.latest && S.latest.ph === 'play') $('banner').classList.add('hidden'); }, 1100);
    } else if (e.k === 'gate') {
      sfx.gong();
      S.shake = Math.max(S.shake, 10);
      showBanner(T('race_go'));
      setTimeout(() => { if (!S.over) $('banner').classList.add('hidden'); }, 700);
    } else if (e.k === 'cross') {
      sfx.pickup();
      const cy = isRush(S.mode) ? e.y : RACE.redY;
      burst(e.x, cy, 14, '#4ade80', 320);
      S.rings.push({ x: e.x, y: cy, r: 20, max: 160, life: 0.45, max_life: 0.45, col: '#4ade80' });
      if (e.id === PID) { S.floaters.push({ x: e.x, y: cy - 70, text: T('race_safe'), col: '#4ade80', life: 1.2 }); vibrate(25); }
    } else if (e.k === 'rushHit') {
      sfx.bump();
      burst(e.x, e.y, 12, '#fb923c', 380);
      S.rings.push({ x: e.x, y: e.y, r: 16, max: 120, life: 0.35, max_life: 0.35, col: '#fb923c' });
      S.shake = Math.max(S.shake, 8);
    } else if (e.k === 'hillMove') {
      sfx.spawn();
      S.rings.push({ x: e.x, y: e.y, r: 20, max: HILL_R + 60, life: 0.7, max_life: 0.7, col: '#4ade80' });
    } else if (e.k === 'emote') {
      S.bubbles.set(e.id, { i: e.i, until: performance.now() + 2200 });
      if (e.id !== PID) sfx.pickup();
    } else if (e.k === 'elim') {
      onElim(e);
    } else if (e.k === 'over') {
      onOver(e);
    }
  }
}

function showCountdown(cd) {
  const b = $('banner');
  const sub = (S.mode === 'RACE' ? '' : S.map.name) + (S.rounds > 1 ? (S.mode === 'RACE' ? '' : ' · ') + T('round_lbl') + ' ' + S.round + '/' + S.rounds : '');
  const html = `<div class="cd">${cd}</div><div class="goal">${T('goal.' + S.mode)}</div>` +
    `<div class="ctrl">${isTouch() ? T('ctrl_touch') : T('ctrl_kb')}</div>` + (sub ? `<small>${sub}</small>` : '');
  b.classList.remove('over');
  b.classList.add('card');
  b.style.color = '';
  if (b.dataset.cd !== html) { b.innerHTML = html; b.dataset.cd = html; }
  b.classList.remove('hidden');
}

function feedRow(by, victim) {
  const feed = $('feed');
  const v = S.roster.get(victim);
  if (!v) return;
  const row = document.createElement('div');
  row.className = 'row' + (by === PID || victim === PID ? ' me' : '');
  const k = by ? S.roster.get(by) : null;
  if (k) {
    row.appendChild(flagIcon(k.country, 40));
    const a = document.createElement('span'); a.className = 'arrow'; a.textContent = '\u279C'; row.appendChild(a);
  }
  row.appendChild(flagIcon(v.country, 40));
  const t = document.createElement('span');
  t.textContent = k ? CNAME[v.country] : CNAME[v.country] + ' ' + T('feed_out');
  row.appendChild(t);
  feed.appendChild(row);
  while (feed.children.length > 4) feed.removeChild(feed.firstChild);
  setTimeout(() => { if (row.parentNode) row.parentNode.removeChild(row); }, 4500);
}

function seriesName(key) {
  if (!key) return '-';
  if (/^T[AB]$/.test(key)) return T('team_x', { t: key[1] });
  const p = S.roster.get(key);
  return p ? CNAME[p.country] : key;
}

function showResults(res, series) {
  const box = $('results');
  box.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'rt';
  t.textContent = series && series.rounds > 1 ? T('results_round', { r: series.round, n: series.rounds }) : T('results');
  box.appendChild(t);
  if (series && series.rounds > 1) {
    const sl = document.createElement('div');
    sl.className = 'rt';
    sl.style.cssText = 'color:#fff;font-size:calc(var(--u)*2.8)';
    sl.textContent = T('series_lbl', { list: series.wins.sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => seriesName(k) + ' ' + n).join(' · ') });
    box.appendChild(sl);
  }
  const rows = res.slice(0, 5);
  const meIdx = res.findIndex((r) => r.id === PID);
  if (meIdx >= 5) rows.push(res[meIdx]);
  rows.forEach((r) => {
    const p = S.roster.get(r.id);
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'rr' + (r.id === PID ? ' me' : '');
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = r.rank + '.'; d.appendChild(rk);
    d.appendChild(flagIcon(p.country, 44));
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.bot ? CNAME[p.country] : p.name; d.appendChild(nm);
    const kl = document.createElement('span'); kl.className = 'kl'; kl.textContent = (S.mode === 'HILL' || S.mode === 'COINS') ? Math.round(r.score) + ' ' + T('pts') : S.mode === 'BOMB' ? '' : S.mode === 'SOCCER' ? r.kills + ' ' + T('g_unit') : r.kills + ' ' + T('k_unit'); d.appendChild(kl);
    box.appendChild(d);
  });
  box.classList.remove('hidden');
}

function hitFx(e) {
  const heavy = e.h ? 1.6 : 1;
  const sc = e.s * heavy;
  S.rings.push({ x: e.x, y: e.y, r: 14, max: 70 + 150 * sc, life: 0.4, max_life: 0.4, col: e.h ? '#fb923c' : '#22d3ee' });
  burst(e.x, e.y, Math.round(6 + 22 * sc), e.h ? '#fb923c' : '#fde047', 260 + 420 * sc);
  if (sc > 0.45) {
    S.shake = Math.max(S.shake, 6 + 18 * Math.min(1, sc));
    vibrate(sc > 0.7 ? 30 : 12);
  }
}

function showBanner(html) {
  const b = $('banner');
  b.classList.remove('over', 'card');
  b.dataset.cd = '';
  b.innerHTML = html;
  b.classList.remove('hidden');
}

function addGoal(go, pop) {
  const d = document.createElement('div');
  d.className = 'el' + (pop ? ' pop' : '');
  const p = go.id ? S.roster.get(go.id) : null;
  if (p) d.appendChild(flagIcon(p.country, 64));
  const sp = document.createElement('span');
  sp.style.color = TEAM_COL[go.team];
  sp.textContent = (p ? '' : go.team + ' ') + Math.floor(go.s / 60) + "'" + String(go.s % 60).padStart(2, '0');
  d.appendChild(sp);
  $('elimList').appendChild(d);
}

function updateHostBadge() {
  const h = document.getElementById('dHost');
  if (h) h.classList.toggle('hidden', !(S.room && S.room.host === PID));
}
function addElimD(id, rank) {
  const p = S.roster.get(id);
  if (!p) return;
  const li = document.createElement('li');
  const img = document.createElement('img'); img.src = flagDataUrl(p.country); img.alt = '';
  const nm = document.createElement('span'); nm.textContent = CNAME[p.country] + (p.bot ? '' : ' · ' + p.name);
  const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = '#' + rank;
  li.append(img, nm, rk);
  $('elimListD').prepend(li);
}
function addElim(id, rank, pop) {
  const p = S.roster.get(id);
  if (!p) return;
  addElimD(id, rank);
  const d = document.createElement('div');
  d.className = 'el' + (pop ? ' pop' : '');
  d.appendChild(flagIcon(p.country, 64));
  const sp = document.createElement('span');
  sp.textContent = rank + '.';
  d.appendChild(sp);
  $('elimList').appendChild(d);
}

function onElim(e) {
  sfx.elim();
  burst(e.x, e.y, 46, '#ff2d85', 520);
  burst(e.x, e.y, 20, '#ffffff', 380);
  S.rings.push({ x: e.x, y: e.y, r: 20, max: 300, life: 0.6, max_life: 0.6, col: '#ff2d85' });
  S.shake = Math.max(S.shake, 12);
  addElim(e.id, e.rank, true);
  feedRow(e.by, e.id);
  if (e.by === PID) addXp(50, e.x, e.y);
  if (e.id === PID) {
    vibrate(80);
    P.b = null;
    P.inputs.length = 0;
    showBanner(`${T('out')}<small>${T('out_sub', { rank: e.rank })}</small>`);
    setTimeout(() => { if (!S.over) $('banner').classList.add('hidden'); }, 1800);
  }
}

function onOver(e) {
  S.over = true;
  const youWin = e.ids.includes(PID);
  const inGame = S.roster.has(PID);
  sfx.win();
  if (youWin) { sfx.confetti(); spawnConfetti(); vibrate(60); }
  const b = $('banner');
  b.style.color = '';
  b.classList.add('hidden');
  $('results').classList.add('hidden');

  const mine = e.res && e.res.find((r) => r.id === PID);
  const xpBefore = S.acctPrev !== undefined ? S.acctPrev : profile.xp - S.matchXp;
  const levelBefore = levelOf(xpBefore);
  if (inGame) {
    if (!acct.on) {
      if (youWin) { profile.wins++; addXp(250); }
      guestQuestAward(youWin, mine ? mine.kills : 0);
      saveProfile(profile);
      renderProfile();
    }
    const st = loadStats();
    st.games++;
    if (youWin) st.wins++;
    if (mine) st.kills += mine.kills;
    saveStats(st);
  }

  const winners = e.ids.map((id) => S.roster.get(id)).filter(Boolean);
  $('mHead').textContent = T('game_over');
  const flagBox = $('mFlag');
  flagBox.innerHTML = '';
  if (isTeam(S.mode) && e.team) {
    $('mWinner').textContent = T('team_winner', { t: e.team });
    $('mWinner').style.color = TEAM_COL[e.team];
  } else if (winners[0]) {
    flagBox.appendChild(flagIcon(winners[0].country, 160));
    $('mWinner').style.color = '';
    $('mWinner').textContent = T('winner_lbl') + ' ' + CNAME[winners[0].country].toUpperCase();
  } else {
    $('mWinner').style.color = '';
    $('mWinner').textContent = T('draw_lbl');
  }
  let rankTxt = '';
  if (inGame && mine) rankTxt = T('your_rank', { r: mine.rank, n: S.roster.size });
  if (e.series && e.series.rounds > 1) rankTxt += (rankTxt ? ' · ' : '') + (e.series.done ? T('champion', { name: seriesName(e.series.key) }) : T('next_round'));
  $('mRank').textContent = rankTxt;
  $('mXp').textContent = inGame ? T('xp_gained', { x: S.matchXp }) : '';
  const L0 = levelOf(xpBefore);
  $('mBar').style.transition = 'none';
  $('mBar').style.width = (Math.max(0, (xpBefore - xpCum(L0)) / xpNeed(L0)) * 100).toFixed(1) + '%';
  $('mXpTxt').textContent = inGame ? T('xp_total', { x: profile.xp, y: xpCum(profile.level + 1) }) + (profile.level > levelBefore ? ' · ' + T('level_up', { l: profile.level }) : '') : '';
  $('againBtn').disabled = false;
  $('shareBtn').classList.toggle('hidden', !(youWin && inGame));
  $('shareBtn').textContent = T('share_win');
  $('overModal').classList.remove('hidden');
  loadLeaderboard(true);
  const frac = profile.level > L0 ? 1 : Math.max(0, (profile.xp - xpCum(profile.level)) / xpNeed(profile.level));
  setTimeout(() => {
    $('mBar').style.transition = '';
    $('mBar').style.width = (Math.min(1, frac) * 100).toFixed(1) + '%';
    if (profile.level > L0) setTimeout(() => {
      $('mBar').style.transition = 'none';
      $('mBar').style.width = '0%';
      setTimeout(() => { $('mBar').style.transition = ''; $('mBar').style.width = (Math.max(0, (profile.xp - xpCum(profile.level)) / xpNeed(profile.level)) * 100).toFixed(1) + '%'; }, 60);
    }, 1300);
  }, 120);
}

$('againBtn').addEventListener('click', () => { $('againBtn').disabled = true; socket.emit('playAgain'); });
$('menuBtn').addEventListener('click', () => { $('overModal').classList.add('hidden'); leaveNow(); });
$('exitBtnD').addEventListener('click', leaveNow);
document.querySelectorAll('#emotesD button').forEach((b) => b.addEventListener('click', () => socket.emit('emote', Number(b.dataset.i))));
$('copyLinkBtn').addEventListener('click', () => {
  const code = S.room ? S.room.code : '';
  const link = location.origin + location.pathname + '?' + (SERVER.current ? 'region=' + encodeURIComponent(SERVER.current) + '&' : '') + 'room=' + encodeURIComponent(code);
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
  const el = $('copyLinkBtn');
  const old = el.textContent;
  el.textContent = '\u2714 ' + code;
  setTimeout(() => { el.textContent = old; }, 1400);
});
document.addEventListener('visibilitychange', refreshTitle);

/* ------------------------------ Efektler ------------------------------ */
function burst(x, y, n, col, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.2 + Math.random() * 0.8);
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.5, max: 0.85, col, r: 2 + Math.random() * 3.5 });
  }
  if (S.particles.length > 500) S.particles.splice(0, S.particles.length - 500);
}

function spawnConfetti() {
  const cols = ['#ff2d85', '#facc15', '#22d3ee', '#4ade80', '#a78bfa', '#fb923c', '#ffffff'];
  for (let i = 0; i < 220; i++) {
    const side = i % 2 ? 1 : -1;
    S.confetti.push({
      x: CX + side * 40, y: CH * 0.55,
      vx: side * (150 + Math.random() * 650) * (Math.random() < 0.5 ? 1 : -0.4),
      vy: -(500 + Math.random() * 1100),
      w: 8 + Math.random() * 10, h: 5 + Math.random() * 8,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16,
      col: cols[i % cols.length], life: 4.5 + Math.random() * 2
    });
  }
}

/* ------------------------------ Girdi ------------------------------ */
const keys = new Set();
let lastSent = '';
let joy = { on: false, id: null, x: 0, y: 0, sx: 0, sy: 0, ox: 0, oy: 0 };

function isTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
}

function currentInput() {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (joy.on) {
    // yumuşatma + ölü bölge
    joy.sx += (joy.x - joy.sx) * 0.55;
    joy.sy += (joy.y - joy.sy) * 0.55;
    const m = Math.hypot(joy.sx, joy.sy);
    if (m > 0.1) {
      const k = Math.min(1, (m - 0.1) / 0.8) / m;
      x += joy.sx * k;
      y += joy.sy * k;
    }
  }
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return { x: +x.toFixed(2), y: +y.toFixed(2) };
}
function doDash() {
  if (!S.inGame) return;
  initAudio();
  P.dashPending = true;
}

window.addEventListener('keydown', (e) => {
  if (!S.inGame) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === ' ') { if (!e.repeat) doDash(); return; }
  if (k >= '1' && k <= '4') { if (!e.repeat) socket.emit('emote', Number(k) - 1); return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) keys.add(k);
});
window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });
window.addEventListener('blur', () => { keys.clear(); });

// Dokunmatik: sanal joystick + dash düğmesi
const joyBase = $('joyBase');
const joyKnob = $('joyKnob');
const JOY_R = 60;
let dashTouchId = null;
$('dashBtn').addEventListener('touchstart', (e) => {
  e.preventDefault(); e.stopPropagation();
  dashTouchId = e.changedTouches[0].identifier;
  doDash();
}, { passive: false });
$('dashBtn').addEventListener('touchend', (e) => { e.stopPropagation(); dashTouchId = null; });
$('dashBtn').addEventListener('mousedown', (e) => { e.preventDefault(); doDash(); });

stage.addEventListener('touchstart', (e) => {
  if (!S.inGame) return;
  initAudio();
  if (e.target.closest && e.target.closest('#exitBtn, #emotes, #muteBtn')) return;
  const r = stage.getBoundingClientRect();
  for (const t of e.changedTouches) {
    if (joy.on) break;
    if (t.identifier === dashTouchId) continue;
    if (t.clientX - r.left > r.width * 0.65 && t.clientY - r.top > r.height * 0.5) continue;
    joy = { on: true, id: t.identifier, x: 0, y: 0, sx: 0, sy: 0, ox: t.clientX, oy: t.clientY };
    joyBase.style.left = (t.clientX - r.left) + 'px';
    joyBase.style.top = (t.clientY - r.top) + 'px';
    joyKnob.style.transform = 'translate(0,0)';
    joyBase.classList.remove('hidden');
  }
  e.preventDefault();
}, { passive: false });
stage.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) {
    if (!joy.on || t.identifier !== joy.id) continue;
    let dx = t.clientX - joy.ox;
    let dy = t.clientY - joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > JOY_R) {
      // joystick tabanı parmağı takip etsin (kayma hissi)
      const ex = (l - JOY_R) / l;
      joy.ox += dx * ex;
      joy.oy += dy * ex;
      const r = stage.getBoundingClientRect();
      joyBase.style.left = (joy.ox - r.left) + 'px';
      joyBase.style.top = (joy.oy - r.top) + 'px';
      dx = t.clientX - joy.ox;
      dy = t.clientY - joy.oy;
    }
    joy.x = dx / JOY_R;
    joy.y = dy / JOY_R;
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  e.preventDefault();
}, { passive: false });
const endTouch = (e) => {
  for (const t of e.changedTouches) {
    if (joy.on && t.identifier === joy.id) {
      joy = { on: false, id: null, x: 0, y: 0, sx: 0, sy: 0, ox: 0, oy: 0 };
      joyBase.classList.add('hidden');
    }
    if (t.identifier === dashTouchId) dashTouchId = null;
  }
};
stage.addEventListener('touchend', endTouch);
stage.addEventListener('touchcancel', endTouch);
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ------------------------------ Masaüstü 3 sütun ------------------------------ */
let deskMode = null;
function layoutPanels(desk) {
  if (deskMode === desk) return;
  deskMode = desk;
  gameEl.classList.toggle('desk', desk);
}

const flagUrl = new Map();
function flagDataUrl(code) {
  let url = flagUrl.get(code);
  if (!url) { url = flagIcon(code, 56).toDataURL(); flagUrl.set(code, url); }
  return url;
}
let boardSig = '';
let boardAt = 0;
function renderBoard(s) {
  const now = performance.now();
  if (now - boardAt < 200 || !deskMode) return;
  boardAt = now;
  const scores = new Map((s.sc || []).map((x) => [x[0], x[1]]));
  const rows = [];
  for (const a of s.b) {
    const p = S.roster.get(a[0]);
    if (!p) continue;
    rows.push({ p, hp: Math.max(0, 100 - (a[13] || 0)), x: a[1], y: a[2], fin: a[11] ? (a[12] || 99) : 0, sc: scores.get(a[0]) });
  }
  if (S.mode === 'HILL' || S.mode === 'COINS') rows.sort((a, b) => (b.sc || 0) - (a.sc || 0));
  else if (isRush(S.mode)) rows.sort((a, b) => (b.fin ? 1e6 - b.fin : b.x) - (a.fin ? 1e6 - a.fin : a.x));
  else if (S.mode === 'RACE') rows.sort((a, b) => (b.fin ? 1e6 - b.fin : b.y) - (a.fin ? 1e6 - a.fin : a.y));
  else rows.sort((a, b) => b.hp - a.hp);
  const top = rows.slice(0, 5);
  const sig = top.map((r) => r.p.id + ':' + Math.round(r.hp) + ':' + (r.sc ?? '') + ':' + Math.round(r.x / 40)).join(',') + getLang();
  if (sig === boardSig) return;
  boardSig = sig;
  const ul = $('liveBoard');
  ul.innerHTML = '';
  top.forEach((r, i) => {
    const li = document.createElement('li');
    if (r.p.id === PID) li.classList.add('me');
    const img = document.createElement('img'); img.src = flagDataUrl(r.p.country); img.alt = '';
    const mid = document.createElement('div');
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = (i + 1) + '. ' + CNAME[r.p.country];
    const hp = document.createElement('div'); hp.className = 'hp';
    const bar = document.createElement('i'); const prg = Math.min(100, Math.max(0, (r.x / RUSH.finishX) * 100));
    bar.style.width = (isRush(S.mode) ? prg : r.hp) + '%'; bar.style.background = isRush(S.mode) ? '#22d3ee' : r.hp > 55 ? '#22c55e' : r.hp > 28 ? '#facc15' : '#ef4444';
    hp.appendChild(bar);
    mid.append(nm, hp);
    const pt = document.createElement('span'); pt.className = 'pt';
    pt.textContent = r.sc !== undefined ? String(Math.round(r.sc)) : isRush(S.mode) ? Math.min(100, Math.max(0, Math.round((r.x / RUSH.finishX) * 100))) + '%' : Math.round(r.hp) + ' HP';
    li.append(img, mid, pt);
    ul.appendChild(li);
  });
}

/* ------------------------------ Boyutlandırma ------------------------------ */
function resize() {
  const vv = window.visualViewport;
  const W = Math.floor(vv ? vv.width : window.innerWidth);
  const H = Math.floor(vv ? vv.height : window.innerHeight);
  gameEl.style.width = W + 'px';
  gameEl.style.height = H + 'px';
  const desk = W >= 900;
  layoutPanels(desk);
  const w = Math.floor(Math.min(desk ? W - 560 : W, (H * 9) / 16));
  const h = Math.floor((w * 16) / 9);
  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
  stage.style.setProperty('--u', w / 100 + 'px');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.max(0.5, Math.min(1, (w * dpr) / CW));
  S.scale = scale;
  cv.width = Math.round(CW * scale);
  cv.height = Math.round(CH * scale);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

/* ------------------------------ Render ------------------------------ */
const lerp = (a, b, t) => a + (b - a) * t;
function lerpAng(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function ballFromArr(a) {
  return { id: a[0], x: a[1], y: a[2], f: a[5], cd: a[6], arm: a[7], gh: a[8], sup: a[9], dsh: a[10], fin: !!a[11], fo: a[12] || 0, dmg: a[13] || 0, sp: Math.hypot(a[3], a[4]) };
}

function sampleState() {
  const snaps = S.snaps;
  if (!snaps.length) return null;
  const rt = performance.now() - INTERP_MS;
  let a = snaps[0];
  let b = snaps[0];
  if (rt >= snaps[snaps.length - 1].at) {
    a = b = snaps[snaps.length - 1];
  } else if (rt > snaps[0].at) {
    for (let i = 0; i < snaps.length - 1; i++) {
      if (snaps[i].at <= rt && rt <= snaps[i + 1].at) { a = snaps[i]; b = snaps[i + 1]; break; }
    }
  }
  const span = b.at - a.at;
  const t = span > 0 ? Math.min(1, Math.max(0, (rt - a.at) / span)) : 1;
  const balls = [];
  for (const nb of b.b) {
    const cur = ballFromArr(nb);
    const pb = a.m.get(nb[0]);
    if (pb && a !== b) {
      cur.x = lerp(pb[1], nb[1], t);
      cur.y = lerp(pb[2], nb[2], t);
      cur.f = lerpAng(pb[5], nb[5], t);
    }
    if (nb[0] === PID && P.b) {
      // kendi topumuz: tahmin edilen durum (gecikmesiz his)
      cur.x = P.b.x + P.err.x;
      cur.y = P.b.y + P.err.y;
      cur.f = P.b.f;
      cur.cd = P.b.cd;
      cur.arm = P.b.armorT;
      cur.gh = P.b.ghostT;
      cur.sup = P.b.superT;
      cur.sp = Math.hypot(P.b.vx, P.b.vy);
    }
    balls.push(cur);
  }
  const L = snaps[snaps.length - 1];
  let sb = null;
  if (b.sb) sb = (a.sb && a !== b) ? [lerp(a.sb[0], b.sb[0], t), lerp(a.sb[1], b.sb[1], t), b.sb[2], b.sb[3]] : b.sb;
  return {
    sb,
    t: lerp(a.t, b.t, t), rot: lerp(a.rot, b.rot, t), gh: lerp(a.gh, b.gh, t), R: lerp(a.R, b.R, t),
    balls, pu: L.pu, ph: b.ph, gate: b.gt || 0
  };
}

// Arka plan
const bg = document.createElement('canvas');
bg.width = CW; bg.height = CH;
const THEMES = {
  neon: { accent: '#ff2d85', bg1: '#14102a', bg2: '#05050f', grid: '120,120,255' },
  cyber: { accent: '#38bdf8', bg1: '#0c1a33', bg2: '#030712', grid: '90,160,255' },
  toxic: { accent: '#22c55e', bg1: '#0b2316', bg2: '#030a06', grid: '80,220,140' },
  sunset: { accent: '#fb923c', bg1: '#2a1410', bg2: '#0a0405', grid: '255,150,90' },
  royal: { accent: '#facc15', bg1: '#241d0a', bg2: '#080602', grid: '230,200,90' }
};
let themeKey = 'neon';
try { const t = localStorage.getItem('low_theme'); if (THEMES[t]) themeKey = t; } catch (e) { /* yok */ }
function buildBg() {
  const th = THEMES[themeKey];
  const g = bg.getContext('2d');
  const gr = g.createRadialGradient(CX, CY, 50, CX, CY, 900);
  gr.addColorStop(0, th.bg1);
  gr.addColorStop(1, th.bg2);
  g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = 'rgba(' + th.grid + ',0.07)'; g.lineWidth = 2;
  for (let x = 0; x <= CW; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
  for (let y = 0; y <= CH; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
}
function applyTheme(k) {
  if (!THEMES[k]) return;
  themeKey = k;
  document.documentElement.setAttribute('data-theme', k);
  try { localStorage.setItem('low_theme', k); } catch (e) { /* yok */ }
  document.querySelectorAll('#themeSw button').forEach((b) => b.classList.toggle('on', b.dataset.theme === k));
  buildBg();
}
document.querySelectorAll('#themeSw button').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
applyTheme(themeKey);


function drawRace(st, time) {
  const hw = RACE.halfW, eh = RACE.exitHalf;
  ctx.save();
  ctx.translate(CX, CY);
  // tahta zemini
  const gr = ctx.createLinearGradient(0, RACE.topY, 0, RACE.bottomY);
  gr.addColorStop(0, 'rgba(60,40,120,0.35)'); gr.addColorStop(1, 'rgba(10,10,30,0.55)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(-hw, RACE.topY); ctx.lineTo(hw, RACE.topY); ctx.lineTo(hw, RACE.bottomY); ctx.lineTo(-hw, RACE.bottomY);
  ctx.closePath(); ctx.fill();
  // duvarlar + V huni
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(-hw, RACE.bottomY); ctx.lineTo(-hw, RACE.topY); ctx.lineTo(-eh, RACE.funnelY);
  ctx.moveTo(hw, RACE.bottomY); ctx.lineTo(hw, RACE.topY); ctx.lineTo(eh, RACE.funnelY);
  ctx.stroke();
  // kapı
  if (st.gate) {
    ctx.strokeStyle = '#facc15'; ctx.shadowColor = '#facc15'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-eh - 12, RACE.funnelY); ctx.lineTo(eh + 12, RACE.funnelY); ctx.stroke();
  }
  // parlayan çiviler
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
  for (let i = 0; i < RACE.pegs.length; i++) {
    const pg = RACE.pegs[i];
    ctx.fillStyle = `rgba(255,255,255,${0.85 + 0.15 * Math.sin(time * 3 + i)})`;
    ctx.beginPath(); ctx.arc(pg.x, pg.y, RACE.pegR, 0, Math.PI * 2); ctx.fill();
  }
  // kırmızı kesikli eleme çizgisi
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18;
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 8; ctx.setLineDash([36, 22]); ctx.lineCap = 'butt';
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath(); ctx.moveTo(-hw, RACE.redY); ctx.lineTo(hw, RACE.redY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(239,68,68,0.9)';
  ctx.font = '900 30px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(T('race_line'), 0, RACE.redY + 118);
  ctx.restore();
}

function drawRush(st, time) {
  const hh = RUSH.halfH;
  const TR = rushTrack(S.map);
  const x0 = S.camX - 640;
  const x1 = S.camX + 640;
  ctx.save();
  ctx.translate(CX, CY);
  // zemin
  const gr = ctx.createLinearGradient(0, -hh, 0, hh);
  gr.addColorStop(0, 'rgba(34,211,238,0.10)'); gr.addColorStop(0.5, 'rgba(20,16,42,0.55)'); gr.addColorStop(1, 'rgba(168,85,247,0.12)');
  ctx.fillStyle = gr;
  ctx.fillRect(x0, -hh, x1 - x0, hh * 2);
  ctx.strokeStyle = 'rgba(120,120,255,0.12)'; ctx.lineWidth = 2;
  for (let x = Math.floor(x0 / 80) * 80; x < x1; x += 80) { ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x, hh); ctx.stroke(); }
  // hızlandırma bantları
  for (const p of TR.pads) {
    if (p.x + p.w / 2 < x0 || p.x - p.w / 2 > x1) continue;
    const dir = p.dir || 1;
    const pc = dir > 0 ? '#4ade80' : '#f87171';
    ctx.fillStyle = dir > 0 ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.2)';
    ctx.fillRect(p.x - p.w / 2, -hh, p.w, hh * 2);
    ctx.strokeStyle = pc; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = pc; ctx.shadowBlur = 16;
    const off = (time * 120 * dir + 600) % 60;
    for (let k = -1; k < 4; k++) {
      const cx = p.x - p.w / 2 + 20 + k * 60 + off;
      if (cx < p.x - p.w / 2 || cx > p.x + p.w / 2 - 20) continue;
      for (const yy of [-240, -80, 80, 240]) { ctx.beginPath(); ctx.moveTo(cx, yy - 34); ctx.lineTo(cx + 24 * dir, yy); ctx.lineTo(cx, yy + 34); ctx.stroke(); }
    }
    ctx.shadowBlur = 0;
  }
  // dar geçit duvarları
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 28; ctx.lineCap = 'round';
  ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 20;
  for (const g of TR.gates) {
    if (g.x < x0 - 40 || g.x > x1 + 40) continue;
    ctx.beginPath(); ctx.moveTo(g.x, -hh); ctx.lineTo(g.x, g.gy - g.gap / 2); ctx.moveTo(g.x, g.gy + g.gap / 2); ctx.lineTo(g.x, hh); ctx.stroke();
  }
  // tamponlar
  for (const bm of TR.bumps) {
    if (bm.x < x0 - 60 || bm.x > x1 + 60) continue;
    const g2 = ctx.createRadialGradient(bm.x - 10, bm.y - 10, 4, bm.x, bm.y, bm.r);
    g2.addColorStop(0, '#f5f3ff'); g2.addColorStop(0.5, '#8b5cf6'); g2.addColorStop(1, '#4c1d95');
    ctx.fillStyle = g2; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2); ctx.fill();
  }
  // pervaneler
  ctx.lineWidth = 22; ctx.lineCap = 'round';
  // huni boğazlar
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 20; ctx.lineJoin = 'round'; ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 20;
  for (const f of TR.funnels) {
    if (f.x < x0 - 200 || f.x - 300 > x1) continue;
    const h = f.gap / 2;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(f.x - 300, sg * hh); ctx.lineTo(f.x, sg * h); ctx.lineTo(f.x + 140, sg * h); ctx.stroke(); }
  }
  // pistonlar
  for (const p of TR.pistons) {
    if (p.x < x0 - 100 || p.x > x1 + 100) continue;
    const len = pistonLen(p, st.t);
    ctx.fillStyle = '#334155'; ctx.fillRect(p.x - p.w / 2 - 6, p.side * hh - (p.side > 0 ? 18 : 0), p.w + 12, 18);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = p.w; ctx.lineCap = 'butt'; ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(p.x, p.side * hh); ctx.lineTo(p.x, p.side * (hh - len)); ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(p.x - p.w / 2 - 8, p.side * (hh - len) - (p.side > 0 ? 0 : 0) - 6, p.w + 16, 12);
  }
  // lazerler
  for (const l of TR.lasers) {
    if (l.x < x0 - 40 || l.x > x1 + 40) continue;
    const on = laserOn(l, st.t);
    const warn = !on && laserOn(l, st.t + 0.45);
    ctx.lineCap = 'round';
    if (on) {
      ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 16 + Math.sin(time * 40) * 3; ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(l.x, l.y0); ctx.lineTo(l.x, l.y1); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(l.x, l.y0); ctx.lineTo(l.x, l.y1); ctx.stroke();
    } else {
      ctx.strokeStyle = warn ? 'rgba(251,113,133,0.55)' : 'rgba(251,113,133,0.15)'; ctx.lineWidth = warn ? 8 : 4; ctx.setLineDash([14, 14]); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(l.x, l.y0); ctx.lineTo(l.x, l.y1); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = '#475569'; ctx.shadowBlur = 0;
    ctx.fillRect(l.x - 18, l.y0 - 8, 36, 16); ctx.fillRect(l.x - 18, l.y1 - 8, 36, 16);
  }
  ctx.shadowBlur = 0;
  for (const p of TR.props) {
    if (p.x < x0 - 240 || p.x > x1 + 240) continue;
    const a = p.s * st.t;
    const c = Math.cos(a) * p.L;
    const sn = Math.sin(a) * p.L;
    ctx.strokeStyle = '#fb923c'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(p.x - c, p.y - sn); ctx.lineTo(p.x + c, p.y + sn); ctx.stroke();
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // üst / alt neon duvar
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 10; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(x0, -hh - 5); ctx.lineTo(x1, -hh - 5); ctx.moveTo(x0, hh + 5); ctx.lineTo(x1, hh + 5); ctx.stroke();
  ctx.shadowBlur = 0;
  // başlangıç + bitiş
  for (const [x, col, txt] of [[RUSH.startX - 60, '#94a3b8', ''], [RUSH.finishX, '#ffffff', T('rush_finish')]]) {
    if (x < x0 - 80 || x > x1 + 80) continue;
    const n = 18;
    const sz = (hh * 2) / n;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(x - 12, -hh + i * sz, 12, sz); ctx.fillStyle = i % 2 ? '#111' : '#fff'; ctx.fillRect(x, -hh + i * sz, 12, sz); }
    if (txt) { ctx.fillStyle = col; ctx.font = '900 34px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, x, -hh - 24); }
  }
  // ölüm bariyeri
  const wx = st.R;
  if (wx > x0 - 300) {
    const wg = ctx.createLinearGradient(wx - 260, 0, wx, 0);
    wg.addColorStop(0, 'rgba(239,68,68,0.55)'); wg.addColorStop(1, 'rgba(239,68,68,0.15)');
    ctx.fillStyle = 'rgba(80,0,10,0.55)';
    ctx.fillRect(x0 - 100, -hh - 12, wx - x0 + 100, hh * 2 + 24);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 12; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.moveTo(wx, -hh - 12); ctx.lineTo(wx, hh + 12); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '900 30px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('\u2620 ' + T('rush_wall'), wx - 24, 10);
  }
  ctx.restore();
}

function drawRushHud(st, time) {
  const bx = 90;
  const bw = CW - 180;
  const by = CY - RUSH.halfH - 62;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by - 14, bw, 28);
  const wf = Math.max(0, Math.min(1, st.R / RUSH.finishX));
  ctx.fillStyle = 'rgba(239,68,68,0.6)';
  ctx.fillRect(bx, by - 14, bw * wf, 28);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.strokeRect(bx, by - 14, bw, 28);
  for (const b of st.balls) {
    const p = S.roster.get(b.id);
    if (!p) continue;
    const x = bx + Math.max(0, Math.min(1, b.x / RUSH.finishX)) * bw;
    ctx.fillStyle = b.id === PID ? '#facc15' : p.team === 'A' ? '#22d3ee' : p.team === 'B' ? '#fb923c' : '#e5e7eb';
    ctx.strokeStyle = b.id === PID ? '#fff' : '#000'; ctx.lineWidth = b.id === PID ? 4 : 2;
    if (b.id === PID) { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.arc(x, by, b.id === PID ? 14 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#fff'; ctx.font = '900 26px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('\u{1F3C1}', bx + bw + 6, by - 26);
  // lider göstergesi: lider ekranın sağında görünmüyorsa sağ kenarda ok
  const ld = S.rushLead;
  if (ld && ld.id !== PID) {
    const sx = CX + ld.x - S.camX;
    if (sx > CW - 30) {
      const lp = S.roster.get(ld.id);
      const pct = Math.min(100, Math.round((ld.x / RUSH.finishX) * 100));
      const ty = Math.max(CY - RUSH.halfH + 40, Math.min(CY + RUSH.halfH - 40, CY + ld.y));
      const txt = '\u{1F451} ' + T('rush_leader') + ' ' + (lp ? CNAME[lp.country] : '') + ' (%' + pct + ')';
      ctx.font = '900 24px "Segoe UI", Arial, sans-serif';
      const w = ctx.measureText(txt).width + 50;
      ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(CW - w - 14, ty - 22, w, 44, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(CW - 8, ty); ctx.lineTo(CW - 30, ty - 14); ctx.lineTo(CW - 30, ty + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(txt, CW - w + 2, ty + 8);
    }
  }
  ctx.restore();
}

function drawRing(st, time) {
  const n = S.map.gaps;
  const step = (Math.PI * 2) / n;
  ctx.save();
  ctx.translate(CX, CY);
  ctx.fillStyle = 'rgba(255,45,133,0.04)';
  ctx.beginPath(); ctx.arc(0, 0, st.R, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  const segs = [];
  for (let k = 0; k < n; k++) segs.push([st.rot + k * step + st.gh, st.rot + (k + 1) * step - st.gh]);
  const hot = S.map.key === 'classic' ? THEMES[themeKey].accent : (S.map.col || '#FF2D85');
  ctx.shadowColor = hot;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = hot;
  ctx.lineWidth = 18;
  segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, st.R + 9, a, b); ctx.stroke(); });
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd0e6';
  ctx.lineWidth = 5;
  segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, st.R + 9, a, b); ctx.stroke(); });
  ctx.restore();
}

function drawDeco(st, time, dt) {
  const key = S.map.key;
  ctx.save();
  ctx.translate(CX, CY);
  if (key === 'ice') {
    ctx.fillStyle = 'rgba(103,232,249,0.09)';
    ctx.beginPath(); ctx.arc(0, 0, st.R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(186,230,253,0.16)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a + 0.15) * st.R * 0.55, Math.sin(a + 0.15) * st.R * 0.55);
      ctx.lineTo(Math.cos(a - 0.1) * st.R * 0.95, Math.sin(a - 0.1) * st.R * 0.95); ctx.stroke();
    }
  } else if (key === 'whirlpool') {
    ctx.strokeStyle = 'rgba(52,211,153,0.16)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let r = 25; r < st.R - 10; r += 12) {
        const a = k * ((Math.PI * 2) / 3) + time * 0.9 + r * 0.011;
        const x = Math.cos(a) * r; const y = Math.sin(a) * r;
        if (r === 25) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (key === 'blackhole' && S.map.hole) {
    const h = S.map.hole;
    const gr = ctx.createRadialGradient(0, 0, h * 0.6, 0, 0, h * 3.2);
    gr.addColorStop(0, 'rgba(192,132,252,0.55)'); gr.addColorStop(1, 'rgba(192,132,252,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, h * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(233,213,255,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
    ctx.save(); ctx.rotate(time * 2.2); ctx.beginPath(); ctx.arc(0, 0, h + 12, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.setLineDash([]);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI * 2); ctx.fill();
  }
  if (S.mode === 'SOCCER') {
    ctx.fillStyle = 'rgba(34,197,94,0.10)';
    ctx.beginPath(); ctx.arc(0, 0, st.R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -st.R); ctx.lineTo(0, st.R); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    [[-1, TEAM_COL.A], [1, TEAM_COL.B]].forEach(([sgn, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.lineCap = 'round';
      const a0 = sgn < 0 ? Math.PI - st.gh : -st.gh;
      ctx.beginPath(); ctx.arc(0, 0, st.R + 9, a0, a0 + st.gh * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = col; ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(0, 0, st.R + 60, a0, a0 + st.gh * 2); ctx.arc(0, 0, st.R - 10, a0 + st.gh * 2, a0, true); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  if (S.map.lava) {
    const lc = lavaCycle({ map: S.map, t: st.t });
    if (lc && lc.state > 0) {
      const step = (Math.PI * 2) / LAVA_SECTORS;
      const blink = 0.5 + 0.5 * Math.sin(time * 14);
      lc.sectors.forEach((k) => {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, st.R, k * step, (k + 1) * step); ctx.closePath();
        if (lc.state === 1) {
          ctx.fillStyle = `rgba(251,146,60,${0.10 + 0.14 * blink})`; ctx.fill();
          ctx.strokeStyle = 'rgba(251,146,60,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 30;
          ctx.fillStyle = `rgba(239,68,68,${0.45 + 0.2 * blink})`; ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }
  }
  // King of the Hill bölgesi
  if (S.mode === 'HILL' && S.latest && S.latest.hill) {
    const t = S.latest.hill;
    if (!S.hillPos) S.hillPos = { x: t[0], y: t[1] };
    const k = Math.min(1, dt * 6);
    S.hillPos.x += (t[0] - S.hillPos.x) * k;
    S.hillPos.y += (t[1] - S.hillPos.y) * k;
    const inside = st.balls.filter((b) => Math.hypot(b.x - S.hillPos.x, b.y - S.hillPos.y) < HILL_R);
    const col = inside.length === 1 ? (inside[0].id === PID ? '#4ade80' : '#ff2d85') : inside.length > 1 ? '#facc15' : '#e5e7eb';
    ctx.fillStyle = col; ctx.globalAlpha = 0.12 + 0.05 * Math.sin(time * 4);
    ctx.beginPath(); ctx.arc(S.hillPos.x, S.hillPos.y, HILL_R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.setLineDash([22, 14]);
    ctx.save(); ctx.translate(S.hillPos.x, S.hillPos.y); ctx.rotate(time * 0.8);
    ctx.beginPath(); ctx.arc(0, 0, HILL_R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawCoins(list, time) {
  list.forEach((c) => {
    const gold = c.v > 1;
    const blink = c[4] < 2.5 && Math.floor(time * 8) % 2 === 0;
    if (blink) return;
    const r = gold ? 17 : 12;
    const squash = Math.abs(Math.cos(time * 3 + c[0]));
    ctx.save();
    ctx.translate(CX + c[1], CY + c[2] + Math.sin(time * 4 + c[0]) * 3);
    ctx.shadowColor = gold ? '#f59e0b' : '#facc15'; ctx.shadowBlur = gold ? 22 : 12;
    ctx.fillStyle = gold ? '#fbbf24' : '#facc15';
    ctx.beginPath(); ctx.ellipse(0, 0, r * (0.35 + 0.65 * squash), r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * (0.35 + 0.65 * squash), r, 0, 0, Math.PI * 2); ctx.stroke();
    if (gold && squash > 0.5) {
      ctx.fillStyle = '#a16207'; ctx.font = '900 18px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.fillText('3', 0, 6);
    }
    ctx.restore();
  });
}

function drawSoccerBall(st, time, dt) {
  const [x, y, vx, vy] = st.sb;
  S.ballRot = (S.ballRot || 0) + (vx / 20) * dt;
  const sp = Math.hypot(vx, vy);
  ctx.save();
  ctx.translate(CX + x, CY + y);
  if (sp > 450) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((-vx / sp) * Math.min(70, sp / 14), (-vy / sp) * Math.min(70, sp / 14)); ctx.stroke();
  }
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(S.ballRot);
  ctx.fillStyle = '#111';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.stroke(); }
  ctx.rotate(-S.ballRot);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawBumpers(st, dt) {
  if (!S.map.bumpers.length) return;
  const list = bumpers({ map: S.map, rot: st.rot });
  list.forEach((bm, i) => {
    S.bumpPulse[i] = Math.max(0, S.bumpPulse[i] - dt * 3);
    const pulse = 1 + S.bumpPulse[i] * 0.22;
    ctx.save();
    ctx.translate(CX + bm.x, CY + bm.y);
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 24 + 30 * S.bumpPulse[i];
    const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, bm.r * pulse);
    gr.addColorStop(0, '#f5f3ff');
    gr.addColorStop(0.45, '#8b5cf6');
    gr.addColorStop(1, '#4c1d95');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, bm.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, bm.r * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
}

function drawPowerups(list, time) {
  list.forEach((p) => {
    const col = PU_COL[p[1]];
    const bob = Math.sin(time * 4 + p[0]) * 4;
    const blink = p[4] < 3 && Math.floor(time * 8) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(CX + p[2], CY + p[3] + bob);
    ctx.shadowColor = col; ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(8,8,24,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, PU_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, PU_R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(0, 0, PU_R + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time * 1.5);
    ctx.fillStyle = col;
    if (p[1] === 0) { // zırh: altıgen
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); }
      ctx.closePath(); ctx.fill();
    } else if (p[1] === 1) { // yıldırım
      ctx.beginPath();
      ctx.moveTo(4, -15); ctx.lineTo(-9, 3); ctx.lineTo(-1, 3); ctx.lineTo(-5, 15); ctx.lineTo(9, -4); ctx.lineTo(1, -4);
      ctx.closePath(); ctx.fill();
    } else { // hayalet
      ctx.beginPath();
      ctx.arc(0, -3, 10, Math.PI, 0);
      ctx.lineTo(10, 12); ctx.lineTo(5, 8); ctx.lineTo(0, 12); ctx.lineTo(-5, 8); ctx.lineTo(-10, 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#05050f';
      ctx.beginPath(); ctx.arc(-4, -4, 2.4, 0, Math.PI * 2); ctx.arc(4, -4, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}

function drawBall(b, time) {
  const p = S.roster.get(b.id);
  if (!p) return;
  const mine = b.id === PID;
  const R = b.arm > 0 ? ARMOR_R : BALL_R;
  ctx.save();
  if (b.dsh > 0) {
    const tc = p.team === 'B' ? '#fb923c' : p.team === 'A' ? '#22d3ee' : (mine ? '#facc15' : '#ff2d85');
    S.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, col: tc, r: R * 0.85 });
    S.particles.push({ x: b.x - Math.cos(b.f) * R * 0.8, y: b.y - Math.sin(b.f) * R * 0.8, vx: 0, vy: 0, life: 0.22, max: 0.22, col: '#ffffff', r: R * 0.5 });
  }
  ctx.translate(CX + b.x, CY + b.y);
  if (b.fin) ctx.globalAlpha = 0.5;

  // kalkan / ghost balonu
  if (b.gh > 0) {
    const fade = b.gh < 1 ? (Math.floor(time * 10) % 2 ? 0.25 : 0.6) : 0.6;
    ctx.fillStyle = `rgba(34,211,238,${fade * 0.35})`;
    ctx.strokeStyle = `rgba(165,243,252,${fade + 0.2})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, R + 12 + Math.sin(time * 8) * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if (b.sup > 0) {
    ctx.strokeStyle = `rgba(250,204,21,${0.5 + 0.4 * Math.sin(time * 12)})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#facc15'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const col = b.arm > 0 ? '#cbd5e1' : isTeam(S.mode) ? TEAM_COL[p.team] : '#ffffff';
  ctx.shadowColor = b.arm > 0 ? '#94a3b8' : col;
  ctx.shadowBlur = b.sp > 500 || b.dsh > 0 ? 22 : 10;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, R + (b.arm > 0 ? 7 : 4), 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  if (b.arm > 0) {
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R + 3, 0, Math.PI * 2); ctx.stroke();
  }

  drawFlagCircle(ctx, p.country, 0, 0, R);
  const sh = ctx.createRadialGradient(-8, -10, 4, 0, 0, R);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)');
  sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

  // gözler
  const k = R / BALL_R;
  const cs = Math.cos(b.f);
  const sn = Math.sin(b.f);
  const ex = cs * 8 * k;
  const ey = sn * 8 * k;
  [-1, 1].forEach((s) => {
    const gx = ex - sn * 8.5 * k * s;
    const gy = ey + cs * 8.5 * k * s;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(gx, gy, 7.2 * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(gx + cs * 3 * k, gy + sn * 3 * k, 3.8 * k, 0, Math.PI * 2); ctx.fill();
  });

  if (mine) {
    // altın parıltılı çember + SEN / YOU işareti
    ctx.save();
    ctx.shadowColor = '#facc15'; ctx.shadowBlur = 26 + Math.sin(time * 6) * 8;
    ctx.strokeStyle = 'rgba(250,204,21,0.95)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, R + 19, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = b.cd > 0 ? 'rgba(250,204,21,0.9)' : 'rgba(80,255,160,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, R + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, b.cd / DASH_CD)));
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.moveTo(0, -R - 24); ctx.lineTo(-10, -R - 42); ctx.lineTo(10, -R - 42); ctx.closePath(); ctx.fill();
    ctx.font = '900 20px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(T('you_lbl'), 0, -R - 48);
    ctx.fillStyle = '#facc15'; ctx.fillText(T('you_lbl'), 0, -R - 48);
  }

  ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  const label = 'Lv.' + lvlOf(p) + ' ' + CNAME[p.country];
  ctx.strokeText(label, 0, R + 26);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, 0, R + 26);
  if (b.dmg > 0 && S.mode !== 'RACE') {
    const hp = Math.max(0, 100 - b.dmg);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-24, R + 32, 48, 6);
    ctx.fillStyle = hp > 55 ? '#22c55e' : hp > 28 ? '#facc15' : '#ef4444'; ctx.fillRect(-24, R + 32, 48 * hp / 100, 6);
  }

  const bmk = S.latest && S.latest.bm;
  if (bmk && bmk[0] === b.id) {
    const pulse = 0.5 + 0.5 * Math.sin(time * (6 + 14 / Math.max(0.6, bmk[1])));
    ctx.strokeStyle = `rgba(239,68,68,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(0, 0, R + 12 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, -R - 38, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '900 22px "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(Math.ceil(bmk[1])), 0, -R - 30);
  }

  // hızlı tepki balonu
  const bub = S.bubbles.get(b.id);
  if (bub && bub.until > performance.now()) {
    const txt = EMOTES[bub.i];
    ctx.font = '900 30px "Segoe UI", Arial, sans-serif';
    const w = ctx.measureText(txt).width + 30;
    const by = -R - (mine ? 64 : 46);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-w / 2, by - 24, w, 40, 14) : ctx.rect(-w / 2, by - 24, w, 40);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, by + 15); ctx.lineTo(8, by + 15); ctx.lineTo(0, by + 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillText(txt, 0, by + 6);
  }
  ctx.restore();
}

function computeDanger(me, st) {
  if (!me || me.gh > 0) return 0;
  const d = Math.hypot(me.x, me.y);
  let hole = 0;
  if (S.map.hole) hole = Math.max(0, Math.min(1, 1 - (d - S.map.hole) / 150));
  let lava = 0;
  if (S.map.lava) {
    const lv = lavaAt({ map: S.map, t: st.t }, Math.atan2(me.y, me.x));
    lava = lv === 2 ? 1 : lv === 1 ? 0.75 : 0;
  }
  hole = Math.max(hole, lava);
  if (st.gh <= 0) return hole;
  const gi = gapInfo({ map: S.map, rot: st.rot }, Math.atan2(me.y, me.x));
  const radial = Math.max(0, Math.min(1, (d - (st.R - 170)) / 150));
  const ang = Math.max(0, Math.min(1, 1 - Math.max(0, gi.dist - st.gh) / 0.7));
  return Math.max(hole, radial * ang);
}

function drawHud(me, st, time) {
  // Tehlike vinyeti + bar
  if (me) {
    const dg = S.danger;
    if (dg > 0.05) {
      const pulse = 0.6 + 0.4 * Math.sin(time * (6 + 10 * dg));
      const gr = ctx.createRadialGradient(CX, CH / 2, 450, CX, CH / 2, 1150);
      gr.addColorStop(0, 'rgba(255,0,40,0)');
      gr.addColorStop(1, `rgba(255,0,40,${0.55 * dg * pulse})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, CW, CH);
    }
    const useBar = S.mode === 'FFA' || S.mode === 'TEAM' || S.map.hole > 0 || !!S.map.lava;
    const bw = 440;
    const bx = CX - bw / 2;
    const by = 1470;
    if (useBar) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, 20);
    const bc = dg > 0.6 ? '#ef4444' : dg > 0.3 ? '#facc15' : '#4ade80';
    ctx.fillStyle = bc;
    ctx.shadowColor = bc; ctx.shadowBlur = dg > 0.6 ? 16 : 0;
    ctx.fillRect(bx, by, bw * Math.max(0.03, dg), 20);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 20);
    ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = dg > 0.6 ? '#fecaca' : '#e5e7eb';
    ctx.fillText(dg > 0.6 ? T('danger_zone') : T('edge_danger'), CX, by - 8);
    }

    // aktif güçlendirmeler (bar yalnızca ilgili modlarda)
    const chips = [];
    if (me.arm > 0) chips.push([T('armor') + ' ' + me.arm.toFixed(1), PU_COL[0]]);
    if (me.sup > 0) chips.push([T('superdash'), PU_COL[1]]);
    if (me.gh > 0) chips.push([T('ghost') + ' ' + me.gh.toFixed(1), PU_COL[2]]);
    const bmk = S.latest && S.latest.bm;
    if (bmk && bmk[0] === PID) chips.push([T('bomb') + ' ' + bmk[1].toFixed(1), '#ef4444']);
    if ((S.mode === 'HILL' || S.mode === 'COINS') && S.latest && S.latest.sc) {
      const mine = S.latest.sc.find((x) => x[0] === PID);
      if (mine) chips.push([T('score') + ' ' + mine[1].toFixed(1), '#4ade80']);
    }
    chips.forEach(([t, c], i) => {
      ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t, CX, by + 52 + i * 34);
      ctx.fillStyle = c;
      ctx.fillText(t, CX, by + 52 + i * 34);
    });
  }
}

let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!S.inGame) return;
  const time = now / 1000;

  // sabit 30Hz istemci tick (tahmin + girdi gönderimi)
  P.acc = Math.min(0.25, P.acc + dt);
  while (P.acc >= DT) { P.acc -= DT; clientTick(); }
  const decay = Math.exp(-dt * 10);
  P.err.x *= decay; P.err.y *= decay;

  const sc = S.scale;
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  ctx.drawImage(bg, 0, 0);
  if (S.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
    S.shake *= 0.86;
  }

  let camOn = false;
  const st = sampleState();
  let me = null;
  if (st) {
    if (isRush(S.mode)) {
      // Kamera: yerel oyuncu hayattaysa onu (ekranın %35'inde) takip eder; elenince lideri izler
      const meB = st.balls.find((bb) => bb.id === PID);
      let lead = null;
      for (const bb of st.balls) if (!bb.fin && (!lead || bb.x > lead.x)) lead = bb;
      if (!lead) for (const bb of st.balls) if (!lead || bb.x > lead.x) lead = bb;
      S.rushLead = lead;
      const target = meB || lead;
      const want = target ? target.x + (CX - CW * 0.35) : S.camX;
      S.camX += (Math.max(300, Math.min(RUSH.finishX + 300, want)) - S.camX) * Math.min(1, dt * 10);
      ctx.save();
      ctx.translate(-S.camX, 0);
      camOn = true;
      drawRush(st, time);
    } else if (S.mode === 'RACE') drawRace(st, time);
    else {
      drawDeco(st, time, dt);
      drawRing(st, time);
      drawBumpers(st, dt);
    }

    // zemin ışık halkaları
    for (let i = S.rings.length - 1; i >= 0; i--) {
      const r = S.rings[i];
      r.life -= dt;
      if (r.life <= 0) { S.rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max_life;
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = r.col; ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.shadowColor = r.col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(CX + r.x, CY + r.y, r.r + (r.max - r.r) * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    drawPowerups(st.pu, time);
    if (S.mode === 'COINS' && S.latest && S.latest.cn) drawCoins(S.latest.cn, time);
    if (st.sb) drawSoccerBall(st, time, dt);
    st.balls.sort((a, b) => a.y - b.y);
    st.balls.forEach((b) => drawBall(b, time));
    me = st.balls.find((b) => b.id === PID) || null;

    S.danger = me && st.ph === 'play' && S.mode !== 'SOCCER' && S.mode !== 'RACE' && !isRush(S.mode) ? computeDanger(me, st) : 0;
    if (S.danger > 0.4 && now - S.lastAlarm > 480 - 280 * S.danger) { S.lastAlarm = now; sfx.alarm(); }
  }

  // parçacıklar
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i];
    p.life -= dt;
    if (p.life <= 0) { S.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.95; p.vy *= 0.95;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    ctx.shadowColor = p.col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(CX + p.x, CY + p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // yüzen yazılar
  for (let i = S.floaters.length - 1; i >= 0; i--) {
    const f = S.floaters[i];
    f.life -= dt; f.y -= 40 * dt;
    if (f.life <= 0) { S.floaters.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.font = '900 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(f.text, CX + f.x, CY + f.y);
    ctx.fillStyle = f.col;
    ctx.fillText(f.text, CX + f.x, CY + f.y);
  }
  ctx.globalAlpha = 1;
  if (camOn) { ctx.restore(); if (st) drawRushHud(st, time); }

  drawHud(me, st, time);

  // konfeti (ekran uzayı)
  for (let i = S.confetti.length - 1; i >= 0; i--) {
    const c = S.confetti[i];
    c.life -= dt;
    if (c.life <= 0 || c.y > CH + 40) { S.confetti.splice(i, 1); continue; }
    c.vy += 900 * dt; c.vx *= 0.99; c.vy *= 0.992;
    c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.col;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 2)) + 2);
    ctx.restore();
  }

  if (isTouch()) $('dashBtn').classList.toggle('cool', !!me && me.cd > 0);
}
requestAnimationFrame(frame);

// Sunucudan oda listesi iste
socket.emit('listRooms');

/* ------------------------------ Hesap (giriş / kayıt / misafir) ------------------------------ */
async function apiCall(method, path, body, tokenOverride) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = tokenOverride !== undefined ? tokenOverride : getToken();
  if (tok) headers.Authorization = 'Bearer ' + tok;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch (e) { /* boş */ }
  if (!res.ok) { const err = new Error(data.error || 'net'); err.status = res.status; throw err; }
  return data;
}
const authErr = (code) => { const k = 'auth_err_' + code; const v = T(k); return v === k ? T('auth_err_net') : v; };

function updateAccBtn() {
  const lbl = $('accLbl');
  if (acct.on && acct.user) { lbl.removeAttribute('data-i18n'); lbl.textContent = acct.user.username + ' · Lv.' + profile.level; }
  else { lbl.setAttribute('data-i18n', 'auth_btn'); lbl.textContent = T('auth_btn'); }
  $('adminBtn').classList.toggle('hidden', !(acct.on && acct.user && acct.user.role === 'admin'));
}

function applyAccount(user) {
  acct.on = true;
  acct.user = user;
  profile.xp = user.xp; profile.wins = user.wins; profile.score = user.score; profile.level = levelOf(user.xp);
  nameInput.value = user.username;
  nameInput.readOnly = true;
  renderQuests();
  if (user.country && CNAME[user.country]) { S.myCountry = user.country; refreshCountrySel(); }
  renderProfile();
  updateAccBtn();
}

function showModal(id, on) { $(id).classList.toggle('hidden', !on); }
function setAuthTab(tab) {
  $('tabLogin').classList.toggle('on', tab === 'login');
  $('tabReg').classList.toggle('on', tab === 'register');
  $('loginForm').classList.toggle('hidden', tab !== 'login');
  $('regForm').classList.toggle('hidden', tab !== 'register');
  $('authMsg').textContent = '';
}
$('tabLogin').addEventListener('click', () => setAuthTab('login'));
$('tabReg').addEventListener('click', () => setAuthTab('register'));
$('authClose').addEventListener('click', () => { try { sessionStorage.setItem('low_guest', '1'); } catch (e) { /* yok */ } showModal('authModal', false); });
$('guestBtn').addEventListener('click', () => { try { sessionStorage.setItem('low_guest', '1'); } catch (e) { /* yok */ } showModal('authModal', false); });

async function authSubmit(path, body) {
  $('authMsg').textContent = '';
  try {
    const r = await apiCall('POST', path, body, '');
    setToken(r.token);
    location.reload(); // soket oturumu yeni token ile açılsın
  } catch (e) { $('authMsg').textContent = authErr(e.message); }
}
$('loginForm').addEventListener('submit', (ev) => { ev.preventDefault(); authSubmit('/api/login', { id: $('loginId').value, password: $('loginPw').value }); });
$('regForm').addEventListener('submit', (ev) => { ev.preventDefault(); authSubmit('/api/register', { username: $('regUser').value, email: $('regEmail').value, password: $('regPw').value }); });

function openAccount() {
  const u = acct.user;
  const L = profile.level;
  $('acName').textContent = u.username;
  $('acLvl').textContent = 'Lv.' + L;
  $('acXp').textContent = T('xp_total', { x: profile.xp, y: xpCum(L + 1) });
  $('acBar').style.width = (Math.max(0, Math.min(1, (profile.xp - xpCum(L)) / xpNeed(L))) * 100).toFixed(1) + '%';
  $('acWins').textContent = String(profile.wins);
  $('acScore').textContent = String(profile.score);
  $('adminOpen').classList.toggle('hidden', u.role !== 'admin');
  showModal('acctModal', true);
}
$('accBtn').addEventListener('click', () => { if (acct.on) openAccount(); else { setAuthTab('login'); showModal('authModal', true); } });
$('acctClose').addEventListener('click', () => showModal('acctModal', false));
$('logoutBtn').addEventListener('click', () => { setToken(''); try { sessionStorage.removeItem('low_admin'); } catch (e) { /* yok */ } location.reload(); });
$('adminBtn').addEventListener('click', () => openAdmin());
$('adminOpen').addEventListener('click', () => { showModal('acctModal', false); openAdmin(); });
$('adminLink').addEventListener('click', (ev) => { ev.preventDefault(); showModal('authModal', false); openAdmin(); });

/* Sistem duyurusu: tüm oyunculara kayan kırmızı neon bant */
let announceTimer = null;
function showAnnounce(text) {
  $('announceText').textContent = '⚠ ' + text + '   ⚠ ' + text;
  $('announceBar').classList.remove('hidden');
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => $('announceBar').classList.add('hidden'), 45000);
  try { sfx.alarm(); } catch (e) { /* yok */ }
}
$('announceClose').addEventListener('click', () => $('announceBar').classList.add('hidden'));

/* ------------------------------ Admin paneli ------------------------------ */
let admTimer = null;
const admToken = () => { let t = ''; try { t = sessionStorage.getItem('low_admin') || ''; } catch (e) { /* yok */ } return t || (acct.on && acct.user && acct.user.role === 'admin' ? getToken() : ''); };
const admCall = (method, path, body) => apiCall(method, path, body, admToken());
const mk = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
function admBtn(label, fn, danger) { const b = mk('button', danger ? 'danger' : '', label); b.addEventListener('click', fn); return b; }
const admOut = (t) => { $('admMsgOut').textContent = t || ''; };

function openAdmin() {
  showModal('adminModal', true);
  const tok = admToken();
  $('adminLoginForm').classList.toggle('hidden', !!tok);
  $('adminDash').classList.toggle('hidden', !tok);
  if (tok) startAdmin();
}
function closeAdmin() { showModal('adminModal', false); clearInterval(admTimer); admTimer = null; if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); }
$('adminClose').addEventListener('click', closeAdmin);
$('adminLoginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const r = await apiCall('POST', '/api/admin/login', { password: $('adminPw').value }, '');
    try { sessionStorage.setItem('low_admin', r.token); } catch (e) { /* yok */ }
    $('adminPw').value = '';
    $('adminLoginForm').classList.add('hidden');
    $('adminDash').classList.remove('hidden');
    startAdmin();
  } catch (e) { $('adminPw').value = ''; $('adminPw').placeholder = e.message === 'admin_disabled' ? T('adm_disabled') : T('adm_bad_pw'); }
});
function adminLost() { try { sessionStorage.removeItem('low_admin'); } catch (e) { /* yok */ } clearInterval(admTimer); $('adminDash').classList.add('hidden'); $('adminLoginForm').classList.remove('hidden'); }
function startAdmin() {
  refreshAdmin();
  clearInterval(admTimer);
  admTimer = setInterval(() => { if ($('adminModal').classList.contains('hidden')) { clearInterval(admTimer); return; } refreshAdmin(true); }, 3000);
  loadAdmUsers();
  loadAdmBans();
}
async function refreshAdmin() {
  try {
    const [st, rm] = await Promise.all([admCall('GET', '/api/admin/stats'), admCall('GET', '/api/admin/rooms')]);
    const box = $('admStats');
    box.innerHTML = '';
    [[T('adm_s_rooms'), st.rooms], [T('adm_s_players'), st.players], [T('adm_s_conn'), st.connections], [T('adm_s_accounts'), st.accounts], [T('adm_s_uptime'), Math.round(st.uptime / 60) + ' dk']].forEach(([k, v]) => {
      const d = mk('div'); d.appendChild(mk('b', '', String(v))); d.appendChild(document.createTextNode(k)); box.appendChild(d);
    });
    const list = $('admRooms');
    list.innerHTML = '';
    if (!rm.rooms.length) list.appendChild(mk('div', 'adm-item', T('adm_none')));
    rm.rooms.forEach((r) => {
      const it = mk('div', 'adm-item');
      it.appendChild(mk('div', 'grow', `${r.code} · ${r.mode} · ${r.map} · ${r.count} · ${r.phase} · ${r.host}`));
      it.appendChild(admBtn(T('adm_close_room'), async () => { if (!confirm(r.code + '?')) return; try { await admCall('POST', '/api/admin/rooms/close', { code: r.code }); refreshAdmin(); } catch (e) { admOut(e.message); } }, true));
      const sub = mk('div', 'sub');
      r.players.forEach((p) => {
        const sp = mk('span', '', (p.uid ? '@' + p.uid : p.name) + (p.ip ? ' [' + p.ip + '] ' : ' '));
        sub.appendChild(sp);
        if (p.ip) { const b = admBtn('IP ban', async () => { try { await admCall('POST', '/api/admin/ip/ban', { ip: p.ip, banned: true }); loadAdmBans(); refreshAdmin(); } catch (e) { admOut(e.message); } }, true); sub.appendChild(b); }
      });
      it.appendChild(sub);
      list.appendChild(it);
    });
  } catch (e) { if (e.status === 401) adminLost(); }
}
async function loadAdmUsers() {
  try {
    const r = await admCall('GET', '/api/admin/users?q=' + encodeURIComponent($('admQ').value));
    const list = $('admUsers');
    list.innerHTML = '';
    r.users.forEach((u) => {
      const it = mk('div', 'adm-item');
      it.appendChild(mk('div', 'grow', `${u.username} · ${u.email} · Lv.${u.level}${u.role === 'admin' ? ' · ADMIN' : ''}${u.banned ? ' · BAN' : ''}`));
      const xp = mk('input'); xp.type = 'number'; xp.value = u.xp; xp.title = 'XP';
      const wn = mk('input'); wn.type = 'number'; wn.value = u.wins; wn.title = 'Wins';
      it.append(xp, wn);
      it.appendChild(admBtn(T('adm_save'), async () => { try { await admCall('POST', '/api/admin/users/update', { username: u.key, xp: xp.value, wins: wn.value }); admOut(T('adm_saved')); loadAdmUsers(); } catch (e) { admOut(e.message); } }));
      it.appendChild(admBtn(T('adm_reset'), async () => { if (!confirm(u.username + ' ?')) return; try { await admCall('POST', '/api/admin/users/update', { username: u.key, reset: true }); loadAdmUsers(); } catch (e) { admOut(e.message); } }, true));
      it.appendChild(admBtn(u.banned ? T('adm_unban') : T('adm_ban'), async () => { try { await admCall('POST', '/api/admin/users/ban', { username: u.key, banned: !u.banned }); loadAdmUsers(); } catch (e) { admOut(e.message); } }, !u.banned));
      list.appendChild(it);
    });
  } catch (e) { if (e.status === 401) adminLost(); }
}
async function loadAdmBans() {
  try {
    const r = await admCall('GET', '/api/admin/bans');
    const list = $('admBans');
    list.innerHTML = '';
    r.ips.forEach((ip) => {
      const it = mk('div', 'adm-item');
      it.appendChild(mk('div', 'grow', ip));
      it.appendChild(admBtn(T('adm_unban'), async () => { try { await admCall('POST', '/api/admin/ip/ban', { ip, banned: false }); loadAdmBans(); } catch (e) { admOut(e.message); } }));
      list.appendChild(it);
    });
  } catch (e) { if (e.status === 401) adminLost(); }
}
$('admQBtn').addEventListener('click', loadAdmUsers);
$('admQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadAdmUsers(); });
$('admIpBan').addEventListener('click', async () => { try { await admCall('POST', '/api/admin/ip/ban', { ip: $('admIp').value, banned: true }); $('admIp').value = ''; loadAdmBans(); } catch (e) { admOut(e.message); } });
$('admSend').addEventListener('click', async () => {
  const m = $('admMsg').value.trim();
  if (!m) return;
  try { await admCall('POST', '/api/admin/broadcast', { message: m }); $('admMsg').value = ''; admOut(T('adm_sent')); } catch (e) { admOut(e.message); }
});

/* Açılışta: kayıtlı oturumu doğrula; yoksa giriş penceresini göster */
(async function initAccount() {
  const tok = getToken();
  if (tok) {
    try { applyAccount((await apiCall('GET', '/api/me', null, tok)).user); } catch (e) { if (e.status === 401 || e.status === 403) setToken(''); }
  }
  let guest = false;
  try { guest = sessionStorage.getItem('low_guest') === '1'; } catch (e) { /* yok */ }
  if (location.hash === '#admin') { openAdmin(); return; }
  if (!acct.on && !guest) { setAuthTab('login'); showModal('authModal', true); }
})();
window.addEventListener('hashchange', () => { if (location.hash === '#admin') openAdmin(); });

/* ------------------------------ Günlük görevler ------------------------------ */
const QUESTS = [
  { id: 'win1', stat: 'wins', goal: 1, xp: 100, key: 'quest_win1' },
  { id: 'kill3', stat: 'kills', goal: 3, xp: 50, key: 'quest_kill3' },
  { id: 'play3', stat: 'played', goal: 3, xp: 30, key: 'quest_play3' }
];
const todayStr = () => new Date().toISOString().slice(0, 10);
function guestDaily() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('low_daily') || 'null'); } catch (e) { d = null; }
  if (!d || d.date !== todayStr()) d = { date: todayStr(), wins: 0, kills: 0, played: 0, claimed: [] };
  return d;
}
function currentDaily() { return acct.on && acct.user && acct.user.daily ? acct.user.daily : guestDaily(); }
/* Misafir: maç sonunda ilerlemeyi yerelde işle, tamamlanan görevin XP'sini ver (hesaplılarda sunucu işler) */
function guestQuestAward(win, kills) {
  const d = guestDaily();
  d.played++; if (win) d.wins++; d.kills += kills;
  let bonus = 0;
  for (const q of QUESTS) if (!d.claimed.includes(q.id) && d[q.stat] >= q.goal) { d.claimed.push(q.id); bonus += q.xp; }
  try { localStorage.setItem('low_daily', JSON.stringify(d)); } catch (e) { /* yok */ }
  if (bonus) addXp(bonus);
  renderQuests();
}
function renderQuests() {
  const ul = document.getElementById('questList');
  if (!ul) return;
  const d = currentDaily();
  ul.innerHTML = '';
  QUESTS.forEach((q) => {
    const have = Math.min(q.goal, d[q.stat] || 0);
    const done = d.claimed.includes(q.id);
    const li = document.createElement('li');
    if (done) li.className = 'done';
    const top = document.createElement('div');
    top.className = 'q-top';
    const t = document.createElement('span'); t.textContent = (done ? '✔ ' : '') + T(q.key);
    const r = document.createElement('b'); r.textContent = '+' + q.xp + ' XP';
    top.append(t, r);
    const bar = document.createElement('div'); bar.className = 'q-bar';
    const fill = document.createElement('i'); fill.style.width = (have / q.goal * 100) + '%';
    bar.appendChild(fill);
    const cnt = document.createElement('small'); cnt.textContent = have + ' / ' + q.goal;
    li.append(top, bar, cnt);
    ul.appendChild(li);
  });
}
renderQuests();

/* Topluluk bağlantıları: adresleri buraya yaz; boş olan düğme pasif kalır */
const SOCIAL = { socDiscord: '', socX: '', socIg: '' };
Object.entries(SOCIAL).forEach(([id, url]) => {
  const a = document.getElementById(id);
  if (!a) return;
  if (url) a.href = url; else { a.classList.add('off'); a.title = T('soon'); a.addEventListener('click', (e) => e.preventDefault()); }
});

/* ------------------------------ Lobi sohbeti ------------------------------ */
function addChat(m) {
  const log = $('chatLog');
  const empty = log.querySelector('.chat-empty');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'chat-row';
  if (m.country && CNAME[m.country]) { const im = document.createElement('img'); im.src = flagDataUrl(m.country); im.alt = ''; row.appendChild(im); }
  const who = document.createElement('b'); who.textContent = m.sender;
  const tx = document.createElement('span');
  // sunucu HTML-escape eder; textContent ile gösterirken gerçek karakterlere çevir
  const d = document.createElement('textarea'); d.innerHTML = m.text;
  tx.textContent = d.value;
  row.append(who, tx);
  log.appendChild(row);
  while (log.children.length > 60) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
function resetChatEmpty() {
  const log = $('chatLog');
  if (!log.children.length) { const e = document.createElement('div'); e.className = 'chat-empty'; e.textContent = T('chat_empty'); log.appendChild(e); }
}
socket.on('lobby_chat', addChat);
socket.on('lobby_chat_history', (list) => { $('chatLog').innerHTML = ''; (list || []).forEach(addChat); resetChatEmpty(); });
$('chatForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const text = $('chatInput').value.trim().slice(0, 100);
  if (!text) return;
  socket.emit('lobby_chat', { text, user: myName(), country: S.myCountry });
  $('chatInput').value = '';
});
resetChatEmpty();

/* ------------------------------ Küresel liderlik tablosu ------------------------------ */
var lbAt = 0;
async function loadLeaderboard(force) {
  if (!force && performance.now() - lbAt < 20000) return;
  lbAt = performance.now();
  try {
    const r = await apiCall('GET', '/api/leaderboard', null, '');
    const ol = $('lbList');
    ol.innerHTML = '';
    $('lbEmpty').classList.toggle('hidden', r.top.length > 0);
    const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
    r.top.forEach((u, i) => {
      const li = mk('li', 'r' + (i + 1) + (acct.on && acct.user && u.username.toLowerCase() === acct.user.username.toLowerCase() ? ' me' : ''));
      li.appendChild(mk('span', 'rk', i < 3 ? medals[i] : String(u.rank)));
      const img = document.createElement('img');
      img.alt = '';
      if (u.country && CNAME[u.country]) img.src = flagDataUrl(u.country);
      li.appendChild(img);
      li.appendChild(mk('span', 'nm', u.username));
      li.appendChild(mk('span', 'lv', 'Lv.' + u.level));
      li.appendChild(mk('span', 'wn', '\u{1F3C6} ' + u.wins));
      ol.appendChild(li);
    });
  } catch (e) { /* ağ yok */ }
}
setInterval(() => { if (!S.room && !S.inGame) loadLeaderboard(true); }, 30000);
loadLeaderboard(true);

/* Zafer paylaşımı */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy') ? resolve() : reject(new Error('copy')); } catch (e) { reject(e); } finally { ta.remove(); }
  });
}
$('shareBtn').addEventListener('click', async () => {
  const b = $('shareBtn');
  const old = b.textContent;
  try { await copyText(T('share_text')); b.textContent = T('share_done'); } catch (e) { b.textContent = T('share_text'); }
  setTimeout(() => { b.textContent = old; }, 2200);
});

/* ------------------------------ Dil seçici ------------------------------ */
document.querySelectorAll('.lang-sw button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
onLang(() => {
  updateAccBtn();
  renderQuests();
  Object.entries(SOCIAL).forEach(([id, url]) => { const a = document.getElementById(id); if (a && !url) a.title = T('soon'); });
  $('entryMsg').textContent = '';
  $('roomMsg').textContent = '';
  refreshNames();
  document.querySelectorAll('#countryGrid span[data-cc]').forEach((sp) => { sp.textContent = CNAME[sp.dataset.cc]; });
  renderMute();
  renderStats();
  renderRooms(S.roomsList);
  side.shownMap = null;
  side.shownMode = null;
  if (S.room && !S.inGame) renderLobby(); else updateSides();
  if (S.inGame) {
    $('elimTitle').textContent = S.mode === 'SOCCER' ? T('goals') : T('eliminated');
    $('banner').dataset.cd = '';
    if (S.latest && S.latest.ph === 'countdown') showCountdown(S.latest.cd);
  }
});
applyStatic();
renderMute();
renderStats();
renderProfile();

/* ------------------------------ Gecikme (ping) göstergesi ------------------------------ */
setInterval(() => {
  if (!S.inGame || !socket.connected) return;
  const t0 = performance.now();
  socket.timeout(2000).emit('pingx', t0, (err) => {
    const el = $('pingTag');
    if (err) { el.textContent = '...'; el.style.color = '#ef4444'; return; }
    const ms = Math.round(performance.now() - t0);
    el.textContent = ms + ' ms';
    el.style.color = ms < 80 ? '#4ade80' : ms < 160 ? '#facc15' : '#ef4444';
  });
}, 2000);
