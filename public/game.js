/* LAST ONE WINS! - istemci (ES module) */
import {
  DT, SUB, BALL_R, ARMOR_R, DASH_CD, PU_R, MAPS, MAP_KEYS,
  advanceEnv, applyControl, moveSub, gapInfo, bumpers, mapFor, HILL_R
} from './shared.js';

const MODE_INFO = {
  FFA: ['HERKES TEK', 'Son kalan kazanır.'],
  TEAM: ['TAKIM A vs B', 'Rakip takımı eleyin; takım arkadaşına yumuşak çarparsın.'],
  BOMB: ['BOMB TAG', 'Halka kapalı! Bombayı taşıyan süre bitince patlar; çarparak başkasına devret.'],
  HILL: ['KING OF THE HILL', '60 sn: tepede tek başına kalan puan kazanır. Halka kapalı, en çok puan kazanır.']
};

/* ------------------------------ Sabitler ------------------------------ */
const CW = 1080;
const CH = 1920;
const CX = CW / 2;
const CY = 960;
const INTERP_MS = 100;
const TEAM_COL = { A: '#22d3ee', B: '#f97316', F: '#ffffff' };
const PU_COL = ['#94a3b8', '#facc15', '#22d3ee'];
const PU_LABEL = ['ARMOR', 'SUPER DASH', 'GHOST'];
const EMOTES = ['GG', 'LOL', 'OOPS!', '!!!'];

const COUNTRIES = [
  ['TR', 'Turkey'], ['ZA', 'South Africa'], ['NO', 'Norway'], ['CN', 'China'],
  ['PK', 'Pakistan'], ['US', 'USA'], ['GB', 'UK'], ['DE', 'Germany'],
  ['FR', 'France'], ['JP', 'Japan'], ['BR', 'Brazil'], ['AR', 'Argentina'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['KR', 'S. Korea'], ['NL', 'Netherlands']
].map(([code, name]) => ({ code, name }));
const CNAME = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

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
function renderStats() {
  const st = loadStats();
  const el = document.getElementById('statsLine');
  if (el) el.textContent = st.games ? `Oyun: ${st.games} · Galibiyet: ${st.wins} · Eleme: ${st.kills}` : 'İlk maçını oyna, istatistiklerin burada görünsün!';
}
function renderMute() {
  const m1 = document.getElementById('muteBtn');
  const m2 = document.getElementById('muteBtn2');
  if (m1) m1.classList.toggle('off', muted);
  if (m2) m2.textContent = muted ? 'SES: KAPALI' : 'SES: AÇIK';
}
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('low_muted', muted ? '1' : '0'); } catch (e) { /* yok */ }
  if (master) master.gain.value = muted ? 0 : 0.9;
  renderMute();
}
const socket = window.io({ auth: { pid: PID } });

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
  lastCd: 0,
  shake: 0,
  alive: false,
  over: false,
  needResume: false,
  scale: 1,
  myCountry: 'TR',
  lastAlarm: 0,
  lastBombSec: 0,
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
  s.textContent = c.name;
  b.appendChild(s);
  b.addEventListener('click', () => {
    initAudio();
    if (b.classList.contains('taken')) return;
    S.myCountry = c.code;
    refreshCountrySel();
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
  b.textContent = k === 'random' ? 'RASTGELE' : MAPS[k].name;
  b.addEventListener('click', () => socket.emit('setMap', k));
  mapGrid.appendChild(b);
  mapBtns[k] = b;
});

nameInput.addEventListener('change', () => {
  const n = myName();
  if (S.room) socket.emit('setProfile', { name: n });
});

$('createBtn').addEventListener('click', () => {
  initAudio();
  $('entryMsg').textContent = '';
  socket.emit('createRoom', { name: myName(), country: S.myCountry }, onEnter);
});
$('quickBtn').addEventListener('click', () => {
  initAudio();
  $('entryMsg').textContent = '';
  socket.emit('quickPlay', { name: myName(), country: S.myCountry }, (res) => {
    onEnter(res);
    if (res && res.ok && res.quick) $('roomMsg').textContent = 'Rakip aranıyor... 8 sn içinde botlarla başlayacak.';
  });
});
document.querySelectorAll('#diffSeg button').forEach((b) => b.addEventListener('click', () => socket.emit('setDiff', b.dataset.diff)));
$('muteBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
$('muteBtn').addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
$('muteBtn2').addEventListener('click', toggleMute);
document.querySelectorAll('#emotes button').forEach((b) => b.addEventListener('click', () => socket.emit('emote', Number(b.dataset.i))));
renderMute();
renderStats();
$('joinBtn').addEventListener('click', () => joinCode($('codeInput').value));
$('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinCode($('codeInput').value); });
function joinCode(raw) {
  initAudio();
  const code = String(raw || '').trim();
  if (!code) { $('entryMsg').textContent = 'Oda kodunu gir.'; return; }
  $('entryMsg').textContent = '';
  socket.emit('joinRoom', { code, name: myName(), country: S.myCountry }, onEnter);
}
function onEnter(res) {
  if (!res || !res.ok) { $('entryMsg').textContent = (res && res.error) || 'Bağlanılamadı.'; return; }
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
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
  $('roomMsg').textContent = 'Kod kopyalandı: ' + code;
});
document.querySelectorAll('#modeGrid button').forEach((b) => b.addEventListener('click', () => socket.emit('setMode', b.dataset.mode)));
$('teamA').addEventListener('click', () => socket.emit('setProfile', { team: 'A' }));
$('teamB').addEventListener('click', () => socket.emit('setProfile', { team: 'B' }));
$('botCount').addEventListener('input', () => { $('botVal').textContent = $('botCount').value; });
$('startBtn').addEventListener('click', () => {
  initAudio();
  $('roomMsg').textContent = '';
  socket.emit('startGame', { bots: Number($('botCount').value) }, (res) => {
    if (!res || !res.ok) $('roomMsg').textContent = (res && res.error) || 'Başlatılamadı.';
  });
});

function mapTitle(k) { return k === 'random' ? 'RASTGELE' : (MAPS[k] ? MAPS[k].name : k); }

function renderRooms(list) {
  const ul = $('roomList');
  ul.innerHTML = '';
  if (!list || !list.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Şu an açık oda yok. Bir tane kur!';
    ul.appendChild(li);
    return;
  }
  list.forEach((r) => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = r.code;
    const sm = document.createElement('small');
    sm.textContent = `${r.host} · ${(MODE_INFO[r.mode] || [r.mode])[0]} · ${mapTitle(r.map)} · ${r.count}/${r.max}`;
    info.appendChild(b);
    info.appendChild(sm);
    const st = document.createElement('span');
    st.className = 'st ' + r.status;
    st.textContent = r.status === 'lobby' ? 'LOBİ' : r.status === 'full' ? 'DOLU' : 'OYNANIYOR';
    const btn = document.createElement('button');
    btn.className = 'btn small';
    btn.textContent = r.status === 'playing' ? 'İZLE' : 'KATIL';
    btn.disabled = r.status === 'full';
    btn.addEventListener('click', () => joinCode(r.code));
    li.appendChild(info);
    li.appendChild(st);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function renderLobby() {
  const r = S.room;
  $('entryCard').classList.toggle('hidden', !!r);
  $('roomCard').classList.toggle('hidden', !r);
  refreshCountrySel();
  if (!r) return;
  const me = r.players.find((p) => p.id === S.id);
  if (me && me.country !== S.myCountry) { S.myCountry = me.country; refreshCountrySel(); }
  const isHost = r.host === S.id;
  const team = r.mode === 'TEAM';

  $('roomCode').textContent = r.code;
  document.querySelectorAll('#modeGrid button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === r.mode); b.disabled = !isHost; });
  $('modeDesc').textContent = (MODE_INFO[r.mode] || ['', ''])[1];
  Object.entries(mapBtns).forEach(([k, b]) => { b.classList.toggle('on', r.map === k); b.disabled = !isHost; });
  $('mapDesc').textContent = r.map === 'random' ? 'Her maçta rastgele bir harita seçilir.' : (MAPS[r.map] ? MAPS[r.map].desc : '');
  document.querySelectorAll('#diffSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.diff === r.diff); b.disabled = !isHost; });
  $('teamPick').classList.toggle('hidden', !team);
  $('teamA').classList.toggle('on', !!me && me.team === 'A');
  $('teamB').classList.toggle('on', !!me && me.team === 'B');
  $('hostControls').classList.toggle('hidden', !isHost);
  $('waitMsg').classList.toggle('hidden', isHost);
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
    nm.textContent = p.name + ' · ' + CNAME[p.country] + (p.off ? ' (bağlantı yok)' : '');
    li.appendChild(nm);
    if (p.wins) { const t = document.createElement('span'); t.className = 'tag w'; t.textContent = '\u{1F3C6} ' + p.wins; li.appendChild(t); }
    if (p.id === r.host) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'HOST'; li.appendChild(t); }
    if (team) { const t = document.createElement('span'); t.className = 'tag ' + p.team.toLowerCase(); t.textContent = 'TAKIM ' + p.team; li.appendChild(t); }
    ul.appendChild(li);
  });
}

function showScreen(game) {
  S.inGame = game;
  lobbyEl.classList.toggle('hidden', game);
  gameEl.classList.toggle('hidden', !game);
  document.documentElement.classList.toggle('ingame', game);
  if (game) resize();
  else window.scrollTo(0, 0);
}

/* ------------------------------ Socket olayları ------------------------------ */
socket.on('connect', () => {
  $('netLine').classList.add('hidden');
});
socket.on('disconnect', () => {
  S.needResume = !!S.room;
  if (S.inGame) $('netLine').classList.remove('hidden');
  else if (S.room) $('roomMsg').textContent = 'Bağlantı koptu, yeniden bağlanılıyor...';
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
    $('entryMsg').textContent = 'Odadan düşüldün (bağlantı çok uzun süre koptu).';
    renderLobby();
  }
  renderRooms(list);
});
socket.on('roomState', (r) => {
  S.room = r;
  S.id = PID;
  if (!S.inGame) renderLobby();
});
socket.on('gameStart', (g) => {
  S.mode = g.mode;
  S.map = mapFor(g.map, g.mode);
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
  (g.elims || []).forEach((e) => addElim(e.id, e.rank, false));
  $('leftNum').textContent = String(g.total - (g.elims || []).length);
  $('banner').classList.add('hidden');
  $('banner').classList.remove('over');
  $('results').classList.add('hidden');
  $('feed').innerHTML = '';
  $('hint').classList.add('hidden');
  keys.clear();
  lastSent = '';
  showScreen(true);
  initAudio();
  $('dashBtn').classList.toggle('hidden', !isTouch());
});
socket.on('toLobby', () => {
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
  if (!a || s.ph !== 'play') { P.b = null; P.inputs.length = 0; return; }
  const ack = (s.ak && s.ak[PID]) || 0;
  const before = P.b ? { x: P.b.x + P.err.x, y: P.b.y + P.err.y } : null;
  const b = { id: PID, x: a[1], y: a[2], vx: a[3], vy: a[4], f: a[5], cd: a[6], armorT: a[7], ghostT: a[8], superT: a[9], dashT: a[10] };
  const env = { map: S.map, t: s.t, rot: s.rot, R: s.R, gh: s.gh };
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
  if (!S.inGame || !P.b || !S.latest || S.latest.ph !== 'play') return;
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
  if (S.mode === 'HILL') {
    $('leftLbl').textContent = 'TIME';
    $('leftNum').textContent = String(Math.ceil(s.ht));
    const lead = s.sc && s.sc[0];
    const lp = lead && S.roster.get(lead[0]);
    const mine = s.sc && s.sc.find((x) => x[0] === PID);
    $('specLine').textContent = (lp ? `Leader: ${CNAME[lp.country]} ${lead[1].toFixed(0)}` : 'Leader: -') + (mine ? ` · You: ${mine[1].toFixed(0)}` : '');
  } else {
    $('leftLbl').textContent = 'LEFT';
    $('leftNum').textContent = String(s.left);
    $('specLine').textContent = 'Spectating: ' + s.sp + (!S.alive && S.roster.has(PID) ? ' · you are out' : '') + (!S.roster.has(PID) ? ' · you are watching' : '');
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
    showBanner(`${s.cd}<small>${S.map.name}</small>`);
    maybeHint();
  } else if (S.lastPhase === 'countdown' && s.ph === 'play') {
    showBanner('GO!');
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
      S.floaters.push({ x: e.x, y: e.y - 40, text: PU_LABEL[e.type] + '!', col: PU_COL[e.type], life: 1.2 });
    } else if (e.k === 'boom') {
      burst(e.x, e.y, 60, '#f97316', 650);
      burst(e.x, e.y, 30, '#fde047', 500);
      S.rings.push({ x: e.x, y: e.y, r: 30, max: 380, life: 0.7, max_life: 0.7, col: '#f97316' });
      S.floaters.push({ x: e.x, y: e.y - 60, text: 'BOOM!', col: '#f97316', life: 1.4 });
      S.shake = Math.max(S.shake, 24);
    } else if (e.k === 'pass') {
      sfx.spawn();
      const bb = s.m.get(e.id);
      if (bb) S.floaters.push({ x: bb[1], y: bb[2] - 70, text: 'BOMB!', col: '#ef4444', life: 1.1 });
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

function maybeHint() {
  if (!S.roster.has(PID)) return;
  if (S.mode === 'BOMB' || S.mode === 'HILL') {
    const hb = $('hint');
    hb.innerHTML = '<b>' + MODE_INFO[S.mode][0] + '</b><br>' + MODE_INFO[S.mode][1];
    hb.classList.remove('hidden');
    setTimeout(() => hb.classList.add('hidden'), 5000);
    return;
  }
  let seen = '0';
  try { seen = localStorage.getItem('low_seen') || '0'; } catch (e) { /* yok */ }
  if (seen === '1') return;
  const h = $('hint');
  h.innerHTML = (isTouch()
    ? '<b>Sürükle</b>: hareket · <b>DASH</b>: sağ alt düğme'
    : '<b>WASD / OK</b>: hareket · <b>SPACE</b>: dash') + '<br>Rakipleri <b>yarıktan</b> dışarı it, kendin yaklaşma!';
  h.classList.remove('hidden');
  try { localStorage.setItem('low_seen', '1'); } catch (e) { /* yok */ }
  setTimeout(() => h.classList.add('hidden'), 7000);
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
  t.textContent = k ? CNAME[v.country] : CNAME[v.country] + ' is out';
  row.appendChild(t);
  feed.appendChild(row);
  while (feed.children.length > 4) feed.removeChild(feed.firstChild);
  setTimeout(() => { if (row.parentNode) row.parentNode.removeChild(row); }, 4500);
}

function showResults(res) {
  const box = $('results');
  box.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'rt';
  t.textContent = 'RESULTS';
  box.appendChild(t);
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
    const kl = document.createElement('span'); kl.className = 'kl'; kl.textContent = S.mode === 'HILL' ? Math.round(r.score) + ' pts' : S.mode === 'BOMB' ? '' : r.kills + ' K'; d.appendChild(kl);
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
  b.classList.remove('over');
  b.innerHTML = html;
  b.classList.remove('hidden');
}

function addElim(id, rank, pop) {
  const p = S.roster.get(id);
  if (!p) return;
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
  if (e.id === PID) {
    vibrate(80);
    P.b = null;
    P.inputs.length = 0;
    showBanner(`OUT!<small>#${e.rank} · spectating</small>`);
    setTimeout(() => { if (!S.over) $('banner').classList.add('hidden'); }, 1800);
  }
}

function onOver(e) {
  S.over = true;
  sfx.win();
  sfx.confetti();
  spawnConfetti();
  const b = $('banner');
  b.innerHTML = '';
  if (!e.ids.length) { showBanner('DRAW!'); return; }
  const winners = e.ids.map((id) => S.roster.get(id)).filter(Boolean);
  const youWin = e.ids.includes(PID);
  if (S.mode === 'TEAM' && e.team) {
    b.innerHTML = `<span style="color:${TEAM_COL[e.team]}">TEAM ${e.team}</span><br>WINS!<small>${youWin ? 'YOU WIN!' : ''}</small>`;
  } else if (winners[0]) {
    const w = winners[0];
    b.appendChild(flagIcon(w.country, 160));
    const t = document.createElement('div');
    t.textContent = CNAME[w.country].toUpperCase() + ' WINS!';
    b.appendChild(t);
    const sm = document.createElement('small');
    sm.textContent = youWin ? 'YOU WIN!' : (w.bot ? '' : w.name);
    b.appendChild(sm);
  }
  b.classList.add('over');
  b.classList.remove('hidden');
  if (e.res) {
    showResults(e.res);
    if (S.roster.has(PID)) {
      const st = loadStats();
      const mine = e.res.find((r) => r.id === PID);
      st.games++;
      if (youWin) st.wins++;
      if (mine) st.kills += mine.kills;
      saveStats(st);
    }
  }
}

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

/* ------------------------------ Boyutlandırma ------------------------------ */
function resize() {
  const vv = window.visualViewport;
  const W = Math.floor(vv ? vv.width : window.innerWidth);
  const H = Math.floor(vv ? vv.height : window.innerHeight);
  gameEl.style.width = W + 'px';
  gameEl.style.height = H + 'px';
  const w = Math.floor(Math.min(W, (H * 9) / 16));
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
  return { id: a[0], x: a[1], y: a[2], f: a[5], cd: a[6], arm: a[7], gh: a[8], sup: a[9], dsh: a[10], sp: Math.hypot(a[3], a[4]) };
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
  return {
    rot: lerp(a.rot, b.rot, t), gh: lerp(a.gh, b.gh, t), R: lerp(a.R, b.R, t),
    balls, pu: L.pu, ph: b.ph
  };
}

// Arka plan
const bg = document.createElement('canvas');
bg.width = CW; bg.height = CH;
(function buildBg() {
  const g = bg.getContext('2d');
  const gr = g.createRadialGradient(CX, CY, 50, CX, CY, 900);
  gr.addColorStop(0, '#14102a');
  gr.addColorStop(1, '#05050f');
  g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = 'rgba(120,120,255,0.06)'; g.lineWidth = 2;
  for (let x = 0; x <= CW; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
  for (let y = 0; y <= CH; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
})();

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
  const hot = S.map.col || '#FF2D85';
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
  ctx.translate(CX + b.x, CY + b.y);

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

  const col = b.arm > 0 ? '#cbd5e1' : S.mode === 'TEAM' ? TEAM_COL[p.team] : '#ffffff';
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
    ctx.lineWidth = 4;
    ctx.strokeStyle = b.cd > 0 ? 'rgba(250,204,21,0.9)' : 'rgba(80,255,160,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, R + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, b.cd / DASH_CD)));
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.moveTo(0, -R - 16); ctx.lineTo(-8, -R - 30); ctx.lineTo(8, -R - 30); ctx.closePath(); ctx.fill();
  }

  ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(CNAME[p.country], 0, R + 26);
  ctx.fillStyle = '#fff';
  ctx.fillText(CNAME[p.country], 0, R + 26);

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
    const useBar = S.mode === 'FFA' || S.mode === 'TEAM' || S.map.hole > 0;
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
    ctx.fillText(dg > 0.6 ? '! DANGER ZONE !' : 'EDGE DANGER', CX, by - 8);
    }

    // aktif güçlendirmeler (bar yalnızca ilgili modlarda)
    const chips = [];
    if (me.arm > 0) chips.push(['ARMOR ' + me.arm.toFixed(1), PU_COL[0]]);
    if (me.sup > 0) chips.push(['SUPER DASH', PU_COL[1]]);
    if (me.gh > 0) chips.push(['GHOST ' + me.gh.toFixed(1), PU_COL[2]]);
    const bmk = S.latest && S.latest.bm;
    if (bmk && bmk[0] === PID) chips.push(['BOMB! ' + bmk[1].toFixed(1), '#ef4444']);
    if (S.mode === 'HILL' && S.latest && S.latest.sc) {
      const mine = S.latest.sc.find((x) => x[0] === PID);
      if (mine) chips.push(['SCORE ' + mine[1].toFixed(1), '#4ade80']);
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

  const st = sampleState();
  let me = null;
  if (st) {
    drawDeco(st, time, dt);
    drawRing(st, time);
    drawBumpers(st, dt);

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
    st.balls.sort((a, b) => a.y - b.y);
    st.balls.forEach((b) => drawBall(b, time));
    me = st.balls.find((b) => b.id === PID) || null;

    S.danger = me && st.ph === 'play' ? computeDanger(me, st) : 0;
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
