/* LAST ONE WINS! - istemci */
(() => {
  'use strict';

  /* ------------------------------ Sabitler ------------------------------ */
  const CW = 1080;
  const CH = 1920;
  const CX = CW / 2;
  const CY = 960;
  const INTERP_MS = 100;
  const TEAM_COL = { A: '#22d3ee', B: '#f97316', F: '#ffffff' };

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
      c.fillStyle = '#fff';
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
      [[22, 22, 1], [150, 22, -1], [22, 92, -1], [150, 92, 1]].forEach(([x, y]) => {
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
    const g = c.getContext('2d');
    (FLAGS[code] || FLAGS.TR)(g);
    flagCache[code] = c;
    return c;
  }
  // Yuvarlak rozet olarak bayrak çizer (merkez kırpma)
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

  function initAudio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { /* ses yoksa sessiz devam */ }
  }
  function envGain(vol, dur, t0 = actx.currentTime) {
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(actx.destination);
    return g;
  }
  function tone(type, f0, f1, dur, vol) {
    const t = actx.currentTime;
    const o = actx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    o.connect(envGain(vol, dur, t));
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(ftype, f0, f1, dur, vol, q = 1) {
    const t = actx.currentTime;
    const s = actx.createBufferSource();
    s.buffer = noiseBuf;
    const f = actx.createBiquadFilter();
    f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    s.connect(f); f.connect(envGain(vol, dur, t));
    s.start(t); s.stop(t + dur + 0.02);
  }
  const sfx = {
    hit(s) {
      if (!actx) return;
      const n = performance.now();
      if (n - lastHit < 50) return;
      lastHit = n;
      tone('sine', 170 + 60 * s, 45, 0.2, 0.25 + 0.5 * s);
      noise('lowpass', 900, 150, 0.08, 0.15 + 0.2 * s);
    },
    wall(s) {
      if (!actx) return;
      const n = performance.now();
      if (n - lastWall < 80) return;
      lastWall = n;
      tone('triangle', 520, 300, 0.09, 0.06 + 0.1 * s);
    },
    dash() {
      if (!actx) return;
      noise('bandpass', 350, 3200, 0.28, 0.35, 1.5);
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
    win() {
      if (!actx) return;
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.3, 0.25), i * 140));
    }
  };

  /* ------------------------------ Durum ------------------------------ */
  const socket = io();
  const S = {
    id: null,
    room: null,
    inGame: false,
    mode: 'FFA',
    roster: new Map(),
    snaps: [],
    latest: null,
    particles: [],
    lastPhase: '',
    lastCd: 0,
    shake: 0,
    myCountry: 'TR'
  };
  try { S.myCountry = localStorage.getItem('low_country') || 'TR'; } catch (e) { /* yok */ }
  if (!CNAME[S.myCountry]) S.myCountry = 'TR';

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

  nameInput.addEventListener('change', () => {
    const n = myName();
    if (S.room) socket.emit('setProfile', { name: n });
  });

  $('createBtn').addEventListener('click', () => {
    initAudio();
    $('entryMsg').textContent = '';
    socket.emit('createRoom', { name: myName(), country: S.myCountry }, onEnter);
  });
  $('joinBtn').addEventListener('click', joinNow);
  $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinNow(); });
  function joinNow() {
    initAudio();
    const code = $('codeInput').value.trim();
    if (!code) { $('entryMsg').textContent = 'Oda kodunu gir.'; return; }
    socket.emit('joinRoom', { code, name: myName(), country: S.myCountry }, onEnter);
  }
  function onEnter(res) {
    if (!res || !res.ok) { $('entryMsg').textContent = (res && res.error) || 'Bağlanılamadı.'; return; }
    S.id = res.id;
  }

  $('leaveBtn').addEventListener('click', () => {
    socket.emit('leaveRoom');
    S.room = null;
    renderLobby();
  });
  $('roomCode').addEventListener('click', () => {
    const code = $('roomCode').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    $('roomMsg').textContent = 'Kod kopyalandı: ' + code;
  });
  $('modeFFA').addEventListener('click', () => socket.emit('setMode', 'FFA'));
  $('modeTEAM').addEventListener('click', () => socket.emit('setMode', 'TEAM'));
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
    $('modeFFA').classList.toggle('on', !team);
    $('modeTEAM').classList.toggle('on', team);
    $('modeFFA').disabled = !isHost;
    $('modeTEAM').disabled = !isHost;
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
      li.appendChild(flagIcon(p.country, 60));
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = p.name + ' · ' + CNAME[p.country];
      li.appendChild(nm);
      if (p.id === r.host) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'HOST'; li.appendChild(t); }
      if (team) { const t = document.createElement('span'); t.className = 'tag ' + p.team.toLowerCase(); t.textContent = 'TAKIM ' + p.team; li.appendChild(t); }
      ul.appendChild(li);
    });
  }

  function showScreen(game) {
    S.inGame = game;
    lobbyEl.classList.toggle('hidden', game);
    gameEl.classList.toggle('hidden', !game);
    if (game) resize();
  }

  /* ------------------------------ Socket olayları ------------------------------ */
  socket.on('connect', () => { S.id = socket.id; });
  socket.on('disconnect', () => {
    S.room = null;
    showScreen(false);
    renderLobby();
    $('entryMsg').textContent = 'Sunucu bağlantısı koptu.';
  });
  socket.on('roomState', (r) => {
    S.room = r;
    S.id = socket.id;
    if (!S.inGame) renderLobby();
  });
  socket.on('gameStart', (g) => {
    S.mode = g.mode;
    S.roster = new Map(g.roster.map((p) => [p.id, p]));
    S.snaps = [];
    S.latest = null;
    S.particles = [];
    S.lastPhase = '';
    S.lastCd = 0;
    $('elimList').innerHTML = '';
    $('leftNum').textContent = String(g.total);
    $('banner').classList.add('hidden');
    keys.clear();
    lastSent = '';
    showScreen(true);
    initAudio();
    const touch = isTouch();
    $('dashBtn').classList.toggle('hidden', !touch);
  });
  socket.on('toLobby', () => {
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
    onSnap(s);
  });

  function onSnap(s) {
    $('leftNum').textContent = String(s.left);
    // geri sayım / başlangıç
    if (s.ph === 'countdown') {
      if (s.cd !== S.lastCd) { S.lastCd = s.cd; sfx.beep(false); }
      showBanner(String(s.cd));
    } else if (S.lastPhase === 'countdown' && s.ph === 'play') {
      showBanner('GO!');
      sfx.beep(true);
      setTimeout(() => { if (S.latest && S.latest.ph === 'play') $('banner').classList.add('hidden'); }, 700);
    }
    S.lastPhase = s.ph;

    for (const e of s.ev) {
      if (e.k === 'hit') sfx.hit(e.s);
      else if (e.k === 'wall') sfx.wall(e.s);
      else if (e.k === 'dash') { sfx.dash(); burst(e.x, e.y, 10, '#ffffff', 220); }
      else if (e.k === 'elim') onElim(e);
      else if (e.k === 'over') onOver(e);
    }
  }

  function showBanner(html) {
    const b = $('banner');
    b.innerHTML = html;
    b.classList.remove('hidden');
  }

  function rankLabel(n) { return n + '.'; }

  function onElim(e) {
    sfx.elim();
    burst(e.x, e.y, 46, '#ff2d85', 520);
    burst(e.x, e.y, 20, '#ffffff', 380);
    S.shake = 10;
    const p = S.roster.get(e.id);
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'el pop';
    d.appendChild(flagIcon(p.country, 64));
    const sp = document.createElement('span');
    sp.textContent = rankLabel(e.rank);
    d.appendChild(sp);
    $('elimList').appendChild(d);
  }

  function onOver(e) {
    sfx.win();
    const b = $('banner');
    b.innerHTML = '';
    if (!e.ids.length) { showBanner('DRAW!'); return; }
    const winners = e.ids.map((id) => S.roster.get(id)).filter(Boolean);
    const youWin = e.ids.includes(S.id);
    if (S.mode === 'TEAM' && e.team) {
      b.innerHTML = `<span style="color:${TEAM_COL[e.team]}">TEAM ${e.team}</span><br>WINS!<small>${youWin ? 'YOU WIN!' : ''}</small>`;
    } else if (winners[0]) {
      const w = winners[0];
      b.appendChild(flagIcon(w.country, 160));
      const t = document.createElement('div');
      t.textContent = CNAME[w.country].toUpperCase() + ' WINS!';
      b.appendChild(t);
      const sm = document.createElement('small');
      sm.textContent = youWin ? 'YOU WIN!' : w.name;
      b.appendChild(sm);
    }
    b.classList.remove('hidden');
  }

  /* ------------------------------ Parçacıklar ------------------------------ */
  function burst(x, y, n, col, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.2 + Math.random() * 0.8);
      S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.5, max: 0.9, col, r: 2 + Math.random() * 4 });
    }
  }

  /* ------------------------------ Girdi ------------------------------ */
  const keys = new Set();
  let lastSent = '';
  let joy = { on: false, id: null, x: 0, y: 0, ox: 0, oy: 0 };

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
    if (joy.on) { x += joy.x; y += joy.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x: +x.toFixed(2), y: +y.toFixed(2) };
  }
  function pushInput() {
    if (!S.inGame) return;
    const i = currentInput();
    const k = i.x + ',' + i.y;
    if (k !== lastSent) { lastSent = k; socket.emit('input', i); }
  }
  setInterval(pushInput, 33);

  function doDash() { if (S.inGame) { initAudio(); socket.emit('dash'); } }

  window.addEventListener('keydown', (e) => {
    if (!S.inGame) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === ' ') { if (!e.repeat) doDash(); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); pushInput(); }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); pushInput(); });
  window.addEventListener('blur', () => { keys.clear(); pushInput(); });

  // Dokunmatik: sanal joystick + dash düğmesi
  const joyBase = $('joyBase');
  const joyKnob = $('joyKnob');
  const JOY_R = 60;
  $('dashBtn').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); doDash(); }, { passive: false });
  $('dashBtn').addEventListener('mousedown', (e) => { e.preventDefault(); doDash(); });

  stage.addEventListener('touchstart', (e) => {
    if (!S.inGame) return;
    initAudio();
    for (const t of e.changedTouches) {
      if (joy.on) break;
      const r = stage.getBoundingClientRect();
      if (t.clientX - r.left > r.width * 0.65 && t.clientY - r.top > r.height * 0.55) continue; // dash bölgesi
      joy = { on: true, id: t.identifier, x: 0, y: 0, ox: t.clientX, oy: t.clientY };
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
      if (l > JOY_R) { dx = (dx / l) * JOY_R; dy = (dy / l) * JOY_R; }
      joy.x = dx / JOY_R;
      joy.y = dy / JOY_R;
      joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    }
    pushInput();
    e.preventDefault();
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (joy.on && t.identifier === joy.id) {
        joy = { on: false, id: null, x: 0, y: 0, ox: 0, oy: 0 };
        joyBase.classList.add('hidden');
      }
    }
    pushInput();
  };
  stage.addEventListener('touchend', endTouch);
  stage.addEventListener('touchcancel', endTouch);

  /* ------------------------------ Boyutlandırma ------------------------------ */
  function resize() {
    const w = stage.clientWidth || 360;
    stage.style.setProperty('--u', (w / 100) + 'px');
  }
  window.addEventListener('resize', resize);
  resize();

  /* ------------------------------ Render ------------------------------ */
  const lerp = (a, b, t) => a + (b - a) * t;
  function lerpAng(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
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
      const pb = a.m.get(nb[0]);
      if (pb && a !== b) {
        balls.push({ id: nb[0], x: lerp(pb[1], nb[1], t), y: lerp(pb[2], nb[2], t), f: lerpAng(pb[5], nb[5], t), cd: nb[6], sp: Math.hypot(nb[3], nb[4]) });
      } else {
        balls.push({ id: nb[0], x: nb[1], y: nb[2], f: nb[5], cd: nb[6], sp: Math.hypot(nb[3], nb[4]) });
      }
    }
    return { rot: lerp(a.rot, b.rot, t), gh: lerp(a.gh, b.gh, t), balls, ph: b.ph };
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

  const RING_R = 360;
  const BALL_R = 26;

  function drawRing(rot, gh) {
    ctx.save();
    ctx.translate(CX, CY);
    // zemin
    ctx.fillStyle = 'rgba(255,45,133,0.04)';
    ctx.beginPath(); ctx.arc(0, 0, RING_R, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round';
    const segs = [[rot + gh, rot + Math.PI - gh], [rot + Math.PI + gh, rot + Math.PI * 2 - gh]];
    ctx.shadowColor = '#FF2D85';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#FF2D85';
    ctx.lineWidth = 18;
    segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, RING_R + 9, a, b); ctx.stroke(); });
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffd0e6';
    ctx.lineWidth = 5;
    segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, RING_R + 9, a, b); ctx.stroke(); });
    ctx.restore();
  }

  function drawBall(b) {
    const p = S.roster.get(b.id);
    if (!p) return;
    const mine = b.id === S.id;
    ctx.save();
    ctx.translate(CX + b.x, CY + b.y);

    // takım / kendi halkası
    const col = S.mode === 'TEAM' ? TEAM_COL[p.team] : '#ffffff';
    ctx.shadowColor = col;
    ctx.shadowBlur = b.sp > 500 ? 22 : 10;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    drawFlagCircle(ctx, p.country, 0, 0, BALL_R);
    const sh = ctx.createRadialGradient(-8, -10, 4, 0, 0, BALL_R);
    sh.addColorStop(0, 'rgba(255,255,255,0.28)');
    sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill();

    // gözler
    const cs = Math.cos(b.f);
    const sn = Math.sin(b.f);
    const ex = cs * 8;
    const ey = sn * 8;
    [-1, 1].forEach((s) => {
      const gx = ex - sn * 8.5 * s;
      const gy = ey + cs * 8.5 * s;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(gx, gy, 7.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(gx + cs * 3, gy + sn * 3, 3.8, 0, Math.PI * 2); ctx.fill();
    });

    // dash bekleme göstergesi (kendi topun)
    if (mine) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = b.cd > 0 ? 'rgba(250,204,21,0.9)' : 'rgba(80,255,160,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, BALL_R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.cd));
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(0, -BALL_R - 14); ctx.lineTo(-8, -BALL_R - 28); ctx.lineTo(8, -BALL_R - 28); ctx.closePath(); ctx.fill();
    }

    // ülke adı
    ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(CNAME[p.country], 0, BALL_R + 26);
    ctx.fillStyle = '#fff';
    ctx.fillText(CNAME[p.country], 0, BALL_R + 26);
    ctx.restore();
  }

  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!S.inGame) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    if (S.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
      S.shake *= 0.86;
    }

    const st = sampleState();
    if (st) {
      drawRing(st.rot, st.gh);
      st.balls.sort((a, b) => a.y - b.y);
      st.balls.forEach(drawBall);
    }

    // parçacıklar
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.life -= dt;
      if (p.life <= 0) { S.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.shadowColor = p.col; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(CX + p.x, CY + p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // dash düğmesi durumu
    if (st && isTouch()) {
      const me = st.balls.find((b) => b.id === S.id);
      $('dashBtn').classList.toggle('cool', !!me && me.cd > 0);
    }
  }
  requestAnimationFrame(frame);
})();
