/* Hafif kimlik doğrulama: kullanıcılar data/users.json içinde, şifreler scrypt ile hash'li, oturum HMAC imzalı token. Bağımlılık yok. */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('data dizini oluşturulamadı:', e.message); }

/* ---------- gizli anahtar ---------- */
function loadSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch (e) { /* ilk çalıştırma */ }
  const s = crypto.randomBytes(48).toString('hex');
  try { fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 }); } catch (e) { console.error('secret.key yazılamadı:', e.message); }
  return s;
}
const SECRET = loadSecret();

/* ---------- dosya tabanlı depo ---------- */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

const users = new Map(Object.entries(readJson(USERS_FILE, {}))); // anahtar: küçük harfli kullanıcı adı
const bans = readJson(BANS_FILE, { ips: [] });
if (!Array.isArray(bans.ips)) bans.ips = [];

let saveTimer = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { writeJsonAtomic(USERS_FILE, Object.fromEntries(users)); } catch (e) { console.error('users.json yazılamadı:', e.message); }
  }, 400);
}
function saveBans() {
  try { writeJsonAtomic(BANS_FILE, bans); } catch (e) { console.error('bans.json yazılamadı:', e.message); }
}
export function flushNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try { writeJsonAtomic(USERS_FILE, Object.fromEntries(users)); } catch (e) { /* yok */ }
}

/* ---------- şifre ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('hex') + '$' + h.toString('hex');
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const h = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hashHex, 'hex');
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}

/* ---------- token (JWT benzeri: base64url(payload).hmac) ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64url');
export function signToken(payload, ttlSec) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
export function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p || typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
    return p;
  } catch (e) { return null; }
}

/* ---------- seviye hesabı (istemciyle aynı formül) ---------- */
export const xpCum = (L) => 150 * (L - 1) + 50 * (L - 1) * (L - 2);
export function levelOf(xp) { let L = 1; while (xpCum(L + 1) <= xp) L++; return L; }

/* ---------- yönetici ---------- */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_USERS = new Set((process.env.ADMIN_USERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
export const adminEnabled = () => !!ADMIN_PASSWORD || ADMIN_USERS.size > 0;
export function isAdminUser(u) { return !!u && (u.role === 'admin' || ADMIN_USERS.has(u.username.toLowerCase())); }
export function checkAdminPassword(pw) {
  if (!ADMIN_PASSWORD || typeof pw !== 'string') return false;
  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------- kullanıcı işlemleri ---------- */
const USER_RE = /^[A-Za-z0-9_]{3,16}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/* Günlük görevler (UTC günü): kimlik, hedef, ödül XP */
export const QUESTS = [
  { id: 'win1', stat: 'wins', goal: 1, xp: 100 },
  { id: 'kill3', stat: 'kills', goal: 3, xp: 50 },
  { id: 'play3', stat: 'played', goal: 3, xp: 30 }
];
const today = () => new Date().toISOString().slice(0, 10);
export function dailyOf(u) {
  if (!u.daily || u.daily.date !== today()) u.daily = { date: today(), wins: 0, kills: 0, played: 0, claimed: [] };
  return u.daily;
}

export function publicUser(u) {
  return {
    username: u.display, key: u.username, email: u.email, xp: u.xp, level: levelOf(u.xp), wins: u.wins, score: u.score,
    country: u.country || '', daily: dailyOf(u), role: isAdminUser(u) ? 'admin' : 'user', banned: !!u.banned, created: u.created, lastLogin: u.lastLogin || 0
  };
}

export function register({ username, email, password }) {
  username = String(username || '').trim();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  if (!USER_RE.test(username)) return { error: 'bad_username' };
  if (!EMAIL_RE.test(email)) return { error: 'bad_email' };
  if (password.length < 6 || password.length > 72) return { error: 'bad_password' };
  const key = username.toLowerCase();
  if (users.has(key)) return { error: 'username_taken' };
  for (const u of users.values()) if (u.email === email) return { error: 'email_taken' };
  const u = {
    username: key, display: username, email, passHash: hashPassword(password), xp: 0, wins: 0, score: 0, country: '',
    role: 'user', banned: false, created: Date.now(), lastLogin: Date.now()
  };
  users.set(key, u);
  saveSoon();
  return { user: u };
}

export function login({ id, password }) {
  id = String(id || '').trim().toLowerCase();
  password = String(password || '');
  if (!id || !password || password.length > 72) return { error: 'bad_credentials' };
  let u = users.get(id);
  if (!u) for (const x of users.values()) if (x.email === id) { u = x; break; }
  if (!u || !verifyPassword(password, u.passHash)) return { error: 'bad_credentials' };
  if (u.banned) return { error: 'banned' };
  u.lastLogin = Date.now();
  saveSoon();
  return { user: u };
}

export const getUser = (key) => users.get(String(key || '').toLowerCase()) || null;
export const userCount = () => users.size;
export function userFromToken(token) {
  const p = verifyToken(token);
  if (!p || p.t !== 'user') return null;
  const u = users.get(p.u);
  return u && !u.banned ? u : null;
}
export const makeUserToken = (u) => signToken({ t: 'user', u: u.username }, 30 * 24 * 3600);
export const makeAdminToken = () => signToken({ t: 'admin' }, 12 * 3600);
export const isAdminToken = (token) => { const p = verifyToken(token); return !!p && p.t === 'admin'; };

export function setCountry(u, code) {
  if (typeof code === 'string' && /^[A-Z]{2}$/.test(code)) { u.country = code; saveSoon(); }
}

/* Maç sonu ödülü (yalnızca sunucu hesaplar) */
export function award(u, { xp = 0, win = false, kills = 0 }) {
  const d = dailyOf(u);
  d.played++;
  if (win) d.wins++;
  d.kills += Math.max(0, Math.floor(kills));
  let bonus = 0;
  for (const q of QUESTS) if (!d.claimed.includes(q.id) && d[q.stat] >= q.goal) { d.claimed.push(q.id); bonus += q.xp; }
  const total = Math.max(0, Math.min(5000, Math.floor(xp))) + bonus;
  u.xp += total;
  u.score += total;
  if (win) u.wins++;
  saveSoon();
  return bonus;
}

/* Yönetici düzenlemeleri */
export function adminUpdate(key, { xp, wins, score, reset, role }) {
  const u = getUser(key);
  if (!u) return null;
  if (reset) { u.xp = 0; u.wins = 0; u.score = 0; }
  const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
  if (xp !== undefined) u.xp = num(xp, 1e7);
  if (wins !== undefined) u.wins = num(wins, 1e6);
  if (score !== undefined) u.score = num(score, 1e9);
  if (role === 'admin' || role === 'user') u.role = role;
  saveSoon();
  return u;
}
export function setBanned(key, banned) {
  const u = getUser(key);
  if (!u) return null;
  u.banned = !!banned;
  saveSoon();
  return u;
}
export function searchUsers(q, limit = 50) {
  q = String(q || '').trim().toLowerCase();
  const out = [];
  for (const u of users.values()) {
    if (q && !u.username.includes(q) && !u.email.includes(q)) continue;
    out.push(publicUser(u));
    if (out.length >= limit) break;
  }
  return out;
}

/* Küresel liderlik tablosu: XP, sonra galibiyet sırasına göre (yasaklılar hariç) */
export function leaderboard(limit = 10) {
  return [...users.values()]
    .filter((u) => !u.banned && (u.xp > 0 || u.wins > 0))
    .sort((a, b) => b.xp - a.xp || b.wins - a.wins || a.created - b.created)
    .slice(0, limit)
    .map((u, i) => ({ rank: i + 1, username: u.display, country: u.country || '', level: levelOf(u.xp), wins: u.wins, xp: u.xp }));
}

/* IP yasakları */
export const isIpBanned = (ip) => bans.ips.includes(ip);
export const listBans = () => bans.ips.slice();
export function setIpBan(ip, banned) {
  ip = String(ip || '').trim();
  if (!ip || ip.length > 64) return false;
  const i = bans.ips.indexOf(ip);
  if (banned && i < 0) bans.ips.push(ip);
  if (!banned && i >= 0) bans.ips.splice(i, 1);
  saveBans();
  return true;
}

/* Basit hız sınırı (bellek içi) */
const hits = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600000)) hits.delete(k); }, 600000).unref();

process.on('exit', flushNow);
