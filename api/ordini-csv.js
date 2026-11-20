// Scarica gli ordini PijamaMania in CSV (una riga per articolo), pronti per il fornitore.
//
//   https://pijamamania.it/api/ordini-csv?chiave=LA_TUA_CHIAVE            ultimi 7 giorni
//   https://pijamamania.it/api/ordini-csv?chiave=LA_TUA_CHIAVE&giorni=30  ultimi 30 giorni
//   ...&solo_nuovi=1   solo gli ordini non ancora mandati al fornitore
//
// Variabile su Vercel: ORDINI_CHIAVE (almeno 12 caratteri, inventala tu).
// Contiene dati dei clienti: il link non va condiviso.

const Stripe = require('stripe');
const O = require('../lib/ordini.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const chiave = process.env.ORDINI_CHIAVE || '';
  const q = req.query || {};
  if (chiave.length < 12 || q.chiave !== chiave) return res.status(403).send('Accesso negato');

  const giorni = Math.min(Math.max(parseInt(q.giorni, 10) || 7, 1), 90);
  const da = Math.floor(Date.now() / 1000) - giorni * 86400;

  try {
    const righe = [];
    let letti = 0;   // l'account Stripe è condiviso con altri negozi: tetto di sicurezza
    for await (const pi of stripe.paymentIntents.list({ created: { gte: da }, limit: 100 })) {
      if (++letti > 3000) break;
      if (pi.status !== 'succeeded' || !O.eDiPijamaMania(pi) || O.eDiProva(pi)) continue;
      if (q.solo_nuovi && (pi.metadata || {}).fornitore_inviato === 'si') continue;
      righe.push(...O.righeCsv(pi));
    }
    righe.sort((a, b) => a[1].localeCompare(b[1]));
    const oggi = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ordini-pijamamania-${oggi}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(O.csv(righe));
  } catch (err) {
    console.error('Errore export ordini:', err);
    return res.status(500).send('Errore nel leggere gli ordini');
  }
};
