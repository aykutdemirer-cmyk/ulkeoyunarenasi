// Hızlı duman testi: sunucuyu başlatır, oda kurar, botlarla maçı başlatır, snapshot akışını ve uç noktaları doğrular.
import { spawn } from 'child_process';
import { io } from 'socket.io-client';

const PORT = 3900 + Math.floor(Math.random() * 90);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
let failed = null;
const fail = (m) => { if (!failed) failed = m; };

try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(base + '/healthz')).ok) break; } catch (e) { /* bekle */ } await sleep(150); }
  const h = await (await fetch(base + '/healthz')).json();
  if (!h.ok) fail('healthz');
  const info = await (await fetch(base + '/info')).json();
  if (typeof info.version !== 'string') fail('info');
  const rg = await (await fetch(base + '/regions.json')).json();
  if (!Array.isArray(rg.regions)) fail('regions.json');
  for (const f of ['/', '/game.js', '/shared.js', '/i18n.js', '/style.css']) if (!(await fetch(base + f)).ok) fail('static ' + f);

  const s = io(base, { auth: { pid: 'smoketest' + Math.random().toString(36).slice(2, 10) }, forceNew: true });
  const ack = (ev, d) => new Promise((res) => s.emit(ev, d, res));
  let play = 0;
  s.on('snap', (p) => { if (p.ph === 'play') play++; });
  const bad = await ack('joinRoom', { code: '!!' });
  if (bad.ok || bad.error !== 'bad_code') fail('hata kodu');
  const c = await ack('createRoom', { name: 'smoke', country: 'TR' });
  if (!c.ok) fail('createRoom');
  const st = await ack('startGame', { bots: 3 });
  if (!st.ok) fail('startGame');
  await sleep(6500);
  if (play < 20) fail(`oyun snapshot akışı yetersiz (${play})`);
  const h2 = await (await fetch(base + '/healthz')).json();
  if (h2.rooms !== 1) fail('oda sayısı');
  s.close();
} catch (e) {
  fail(String(e && e.stack || e));
}
server.kill('SIGTERM');
await sleep(300);
if (failed) { console.error('SMOKE FAIL:', failed); process.exit(1); }
console.log('SMOKE OK');
