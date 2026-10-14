// Yük testi: N oda x (1 gerçek istemci + botlar) açar, girdi gönderir ve sunucunun tick süresini ölçer.
// Kullanım: npm run loadtest -- http://localhost:3000 20 7 30 [gerçek istemci/oda]
//   (url, oda sayısı, oda başına bot, saniye, oda başına gerçek istemci sayısı)
//   Örn. 8 gerçek oyunculu 50 oda: npm run loadtest -- http://localhost:3000 50 0 30 8
import { io } from 'socket.io-client';

const [url = 'http://localhost:3000', rooms = '10', bots = '7', secs = '20', humans = '1'] = process.argv.slice(2);
const H = Math.max(1, Number(humans));
const R = Number(rooms);
const B = Number(bots);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clients = [];
let snaps = 0;
let late = 0;
const last = new Map();

function connect(pid) {
  const s = io(url, { auth: { pid }, forceNew: true, transports: ['websocket'] });
  clients.push(s);
  s.on('snap', () => {
    snaps++;
    const now = performance.now();
    const p = last.get(s.id);
    if (p && now - p > 70) late++;
    last.set(s.id, now);
  });
  let seq = 0;
  setInterval(() => { if (s.connected) s.emit('inp', { s: ++seq, x: Math.cos(seq / 15), y: Math.sin(seq / 15), d: seq % 60 === 0 }); }, 33);
  return s;
}
const ackOf = (s) => (ev, d) => new Promise((res) => s.emit(ev, d, res));

for (let i = 0; i < R; i++) {
  const host = connect('load' + i + 'h' + Math.random().toString(36).slice(2, 10));
  const ack = ackOf(host);
  const c = await ack('createRoom', { name: 'L' + i, country: 'TR' });
  for (let k = 1; k < H; k++) {
    const g = connect('load' + i + 'g' + k + Math.random().toString(36).slice(2, 8));
    await ackOf(g)('joinRoom', { code: c.code, name: 'G' + k, country: 'US' });
  }
  host.emit('setMode', ['FFA', 'BOMB', 'COINS', 'HILL'][i % 4]);
  host.emit('setRounds', 5);
  await ack('startGame', { bots: B });
  await sleep(30);
}
console.log(`${R} oda başlatıldı (${H} gerçek istemci + ${B} bot / oda, toplam ${clients.length} bağlantı). ${secs} sn ölçülüyor...`);
const t0 = Date.now();
await sleep(Number(secs) * 1000);
let info = null;
try { info = await (await fetch(url + '/info')).json(); } catch (e) { /* uzak sunucu olabilir */ }
const dur = (Date.now() - t0) / 1000;
console.log('--- Sonuç ---');
console.log(`Alınan snapshot: ${snaps} (${(snaps / dur / clients.length).toFixed(1)}/sn/istemci, hedef 30)`);
console.log(`Geç gelen (>70ms) snapshot: ${late}`);
if (info) console.log(`Sunucu tick süresi (ms): ort ${info.tick.avg}, p95 ${info.tick.p95}, max ${info.tick.max}  | bütçe ${info.tick.budget} ms | oyuncu ${info.players}, oda ${info.rooms}`);
clients.forEach((c) => c.close());
process.exit(0);
