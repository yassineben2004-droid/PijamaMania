// CENTRALE — riceve gli eventi dallo script ct.js di tutti gli store
// (visite, prodotti visti, carrello, checkout, acquisti) e li salva nel database.

const C = require('../lib/centrale.js');

const taglia = (v, n) => (v == null ? null : String(v).slice(0, n));
const ID = /^[a-z0-9]{6,40}$/;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b); else if (Buffer.isBuffer(b)) b = JSON.parse(b.toString()); } catch (e) { b = null; }
  if (!b || typeof b !== 'object') return res.status(400).end();

  const ua = String(req.headers['user-agent'] || '');
  if (C.eBot(ua)) return res.status(204).end();
  if (!C.STORE[b.s] || !C.EVENTI.includes(b.e) || !ID.test(b.v || '') || !ID.test(b.ss || '')) return res.status(400).end();

  const f = C.fonte(b.r, b.u, ua);
  const valore = Number.isFinite(+b.val) ? Math.max(0, Math.min(Math.round(+b.val), 10000000)) : null;
  const pezzi = Number.isFinite(+b.q) ? Math.max(0, Math.min(Math.round(+b.q), 100)) : null;
  const pi = /^pi_[A-Za-z0-9]{10,40}$/.test(b.pi || '') ? b.pi : null;

  try {
    await C.pronto();
    await C.db().query(
      `INSERT INTO c_eventi (giorno, store, ev, vid, sid, pagina, prodotti, valore, pezzi, fonte, disp, paese, pi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [C.giornoRoma(), b.s, b.e, b.v, b.ss, taglia(b.p, 120), taglia(b.pr, 600), valore, pezzi,
       f || 'Diretto', C.dispositivo(ua), taglia(req.headers['x-vercel-ip-country'], 2), pi]);
    // pulizia: gli eventi più vecchi di 13 mesi non servono
    if (Math.random() < 0.002) await C.db().query(`DELETE FROM c_eventi WHERE giorno < (now() - interval '400 days')::date`);
    return res.status(204).end();
  } catch (err) {
    if (err.codice !== 'NO_DB') console.error('c-evento:', err.message);
    return res.status(204).end();   // il sito non deve mai accorgersene
  }
};
