// CENTRALE — la dashboard unica di tutti gli store (stile Shopify).
// Funzioni comuni a api/c-evento.js (raccoglie le visite), api/c-login.js e api/c-dati.js.
//
// Variabili su Vercel (progetto pijamamania):
//   DATABASE_URL       → si crea da sola collegando Neon (Vercel → Storage → Neon)
//   CENTRALE_PASSWORD  → facoltativa; se manca la password è ORDINI_CHIAVE
//   STRIPE_SECRET_KEY  → c'è già (lo Stripe è unico per tutti gli store)

const crypto = require('crypto');

/* Gli store: chiave usata dallo script ct.js  →  nome come compare nella
   descrizione del pagamento Stripe ("PijamaMania — …", "AfterShift — …"). */
const STORE = {
  pijamamania:   { nome: 'PijamaMania',    stripe: 'PijamaMania' },
  donidinatale:  { nome: 'Doni di Natale', stripe: 'Doni di Natale' },
  aftershift:    { nome: 'AfterShift',     stripe: 'AfterShift' },
  ciabattepazze: { nome: 'Ciabatte Pazze', stripe: 'Ciabatte Pazze' },
  lucedifede:    { nome: 'Luce di Fede',   stripe: 'Luce di Fede' }
};
const EVENTI = ['page_view', 'view_item', 'add_to_cart', 'view_cart', 'begin_checkout', 'add_payment_info', 'purchase'];

/* ---------- database (Neon Postgres, piano gratuito) ---------- */
let _db = null, _pronto = null;
function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw Object.assign(new Error('Database non collegato'), { codice: 'NO_DB' });
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);
  _db = { query: (t, p) => sql.query(t, p || []) };
  return _db;
}
function usaDb(d) { _db = d; _pronto = null; }   // per i test

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS c_eventi (
     id BIGSERIAL PRIMARY KEY,
     ts TIMESTAMPTZ NOT NULL DEFAULT now(),
     giorno DATE NOT NULL,
     store TEXT NOT NULL,
     ev TEXT NOT NULL,
     vid TEXT NOT NULL,
     sid TEXT NOT NULL,
     pagina TEXT,
     prodotti TEXT,
     valore INTEGER,
     pezzi INTEGER,
     fonte TEXT,
     disp TEXT,
     paese TEXT,
     pi TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS c_eventi_giorno ON c_eventi (giorno, store)`,
  `CREATE INDEX IF NOT EXISTS c_eventi_pi ON c_eventi (pi) WHERE pi IS NOT NULL`
];
async function pronto() {
  if (!_pronto) _pronto = (async () => { for (const q of SCHEMA) await db().query(q); })()
    .catch(e => { _pronto = null; throw e; });
  return _pronto;
}

/* ---------- giorni nel fuso di Roma ---------- */
const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
const giornoRoma = d => FMT.format(d || new Date());      // 'YYYY-MM-DD'
// mezzanotte di Roma di un giorno 'YYYY-MM-DD' → secondi unix
function inizioGiorno(g) {
  const [y, m, d] = g.split('-').map(Number);
  const t0 = Date.UTC(y, m - 1, d);
  const ore = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t0));
  return Math.floor((t0 - ore * 3600e3) / 1000);         // Roma è avanti di 1h (inverno) o 2h (estate)
}
const giornoValido = g => /^\d{4}-\d{2}-\d{2}$/.test(g || '') && !isNaN(Date.parse(g));

/* ---------- da dove arriva il visitatore ---------- */
function fonte(ref, utm, ua) {
  ua = String(ua || '');
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|BytedanceWebview|ByteLocale|trill_/i.test(ua)) return 'TikTok';
  const u = String(utm || '').toLowerCase();
  if (u) {
    if (/^(ig|insta)/.test(u)) return 'Instagram';
    if (/^(fb|face|meta)/.test(u)) return 'Facebook';
    if (/tiktok|^tt/.test(u)) return 'TikTok';
    if (/google/.test(u)) return 'Google';
    if (/youtube|^yt/.test(u)) return 'YouTube';
  }
  let h = '';
  try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) {}
  if (!h) return u ? u.slice(0, 30) : 'Diretto';
  if (/instagram\.com$/.test(h)) return 'Instagram';
  if (/facebook\.com$|fb\.com$|fb\.me$/.test(h)) return 'Facebook';
  if (/tiktok\.com$/.test(h)) return 'TikTok';
  if (/(^|\.)google\./.test(h)) return 'Google';
  if (/youtube\.com$|youtu\.be$/.test(h)) return 'YouTube';
  if (/pijamamania\.it$|donidinatale\.it$|aftershiftstore\.shop$|ciabattepazze\.it$|lucedifede\.it$|vercel\.app$/.test(h)) return 'Diretto';
  if (/stripe\.com$/.test(h)) return null;               // ritorno dal pagamento: non è una fonte
  return h.slice(0, 40);
}
const dispositivo = ua => /iPad|Tablet/i.test(ua) ? 'Tablet' : (/Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop');
const eBot = ua => !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i.test(ua);

/* ---------- accesso con password (cookie firmato, 30 giorni) ---------- */
const password = () => process.env.CENTRALE_PASSWORD || process.env.ORDINI_CHIAVE || '';
function firma(scad) {
  return crypto.createHmac('sha256', 'centrale:' + password()).update(String(scad)).digest('base64url');
}
function cookieAccesso() {
  const scad = Date.now() + 30 * 86400e3;
  return `cz=${scad}.${firma(scad)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`;
}
function autorizzato(req) {
  if (password().length < 8) return false;
  const m = /(?:^|;\s*)cz=(\d+)\.([\w-]+)/.exec(req.headers.cookie || '');
  if (!m || +m[1] < Date.now()) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(firma(m[1]));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function passwordGiusta(p) {
  const v = password();
  if (v.length < 8 || typeof p !== 'string') return false;
  const a = crypto.createHash('sha256').update(p).digest(), b = crypto.createHash('sha256').update(v).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------- da che store arriva un pagamento Stripe ---------- */
function storeDelPagamento(pi) {
  const d = String((pi && pi.description) || '');
  for (const [k, s] of Object.entries(STORE)) if (d.startsWith(s.stripe)) return k;
  return null;
}
// "Nome — dettagli — 44,90 €" → nome del prodotto
function prodottiDelPagamento(pi) {
  const m = pi.metadata || {};
  const k = Object.keys(m).filter(x => /^articolo_\d+$/.test(x));
  if (!k.length) return [m.prodotto || String(pi.description || '').split(' — ')[1] || 'Prodotto'];
  return k.map(x => m[x].split(' — ')[0]);
}

module.exports = { STORE, EVENTI, db, usaDb, pronto, giornoRoma, inizioGiorno, giornoValido, fonte, dispositivo, eBot,
  cookieAccesso, autorizzato, passwordGiusta, storeDelPagamento, prodottiDelPagamento };
