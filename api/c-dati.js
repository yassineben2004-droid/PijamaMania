// CENTRALE — tutti i numeri della dashboard per un periodo.
//   GET /api/c-dati?da=2026-11-01&a=2026-11-30&store=tutti|pijamamania|…
// Ricavi e ordini arrivano da Stripe (sempre esatti), visite e funnel dal database.

const Stripe = require('stripe');
const C = require('../lib/centrale.js');

const n = v => Number(v) || 0;

async function datiEventi(da, a, st) {
  const q = (t, extra) => C.db().query(t, [da, a, st, ...(extra || [])]);
  const W = `giorno BETWEEN $1::date AND $2::date AND ($3 = '' OR store = $3)`;
  const FUNNEL = `count(DISTINCT vid) AS vis, count(DISTINCT sid) AS sess,
    count(DISTINCT sid) FILTER (WHERE ev = 'view_item') AS prod,
    count(DISTINCT sid) FILTER (WHERE ev = 'add_to_cart') AS carr,
    count(DISTINCT sid) FILTER (WHERE ev = 'begin_checkout') AS chk,
    count(DISTINCT sid) FILTER (WHERE ev = 'add_payment_info') AS paga,
    count(DISTINCT sid) FILTER (WHERE ev = 'purchase') AS acq`;
  await C.pronto();
  const [tot, giorni, store, fonti, prodotti, pagine, disp] = await Promise.all([
    q(`SELECT ${FUNNEL} FROM c_eventi WHERE ${W}`),
    q(`SELECT giorno::text AS g, ${FUNNEL} FROM c_eventi WHERE ${W} GROUP BY 1`),
    q(`SELECT store, ${FUNNEL} FROM c_eventi WHERE ${W} GROUP BY 1`),
    q(`WITH s AS (
         SELECT sid, (array_agg(fonte ORDER BY ts))[1] AS fonte,
                bool_or(ev = 'add_to_cart') AS c, bool_or(ev = 'begin_checkout') AS k,
                string_agg(DISTINCT pi, ',') AS pis
         FROM c_eventi WHERE ${W} GROUP BY sid)
       SELECT fonte, count(*) AS sess, count(*) FILTER (WHERE c) AS carr, count(*) FILTER (WHERE k) AS chk,
              string_agg(pis, ',') AS pis
       FROM s GROUP BY fonte ORDER BY sess DESC LIMIT 12`),
    q(`SELECT p, count(DISTINCT sid) FILTER (WHERE ev = 'view_item') AS viste,
              count(DISTINCT sid) FILTER (WHERE ev = 'add_to_cart') AS carr
       FROM c_eventi, unnest(string_to_array(prodotti, '|')) AS p
       WHERE ${W} AND ev IN ('view_item', 'add_to_cart') AND p <> ''
       GROUP BY p ORDER BY viste DESC LIMIT 40`),
    q(`SELECT store, pagina, count(DISTINCT sid) AS sess FROM c_eventi
       WHERE ${W} AND ev = 'page_view' GROUP BY 1, 2 ORDER BY sess DESC LIMIT 15`),
    q(`SELECT disp, count(DISTINCT sid) AS sess FROM c_eventi WHERE ${W} GROUP BY 1 ORDER BY sess DESC`)
  ]);
  const f = r => ({ visitatori: n(r.vis), sessioni: n(r.sess), prodotto: n(r.prod), carrello: n(r.carr),
    checkout: n(r.chk), pagamento: n(r.paga), acquisti: n(r.acq) });
  return {
    totale: f(tot[0] || {}),
    giorni: Object.fromEntries(giorni.map(r => [r.g, f(r)])),
    store: Object.fromEntries(store.map(r => [r.store, f(r)])),
    fonti: fonti.map(r => ({ fonte: r.fonte || 'Diretto', sessioni: n(r.sess), carrello: n(r.carr), checkout: n(r.chk),
      pis: String(r.pis || '').split(',').filter(Boolean) })),
    prodotti: prodotti.map(r => ({ nome: r.p, viste: n(r.viste), carrello: n(r.carr) })),
    pagine: pagine.map(r => ({ store: r.store, pagina: r.pagina || '/', sessioni: n(r.sess) })),
    dispositivi: disp.map(r => ({ nome: r.disp || '—', sessioni: n(r.sess) }))
  };
}

async function datiStripe(da, a, st) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const gte = C.inizioGiorno(da);
  const d = new Date(Date.parse(a) + 86400e3).toISOString().slice(0, 10);
  const lt = C.inizioGiorno(d);
  const ordini = [];
  let letti = 0;
  for await (const pi of stripe.paymentIntents.list({ created: { gte, lt }, limit: 100, expand: ['data.latest_charge'] })) {
    if (++letti > 6000) break;
    if (pi.status !== 'succeeded' || (pi.metadata || {}).ordine_di_prova === 'si') continue;
    const s = C.storeDelPagamento(pi);
    if (!s || (st && s !== st)) continue;
    const ch = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : {};
    const sp = pi.shipping || {};
    ordini.push({
      id: pi.id, store: s, creato: pi.created, giorno: C.giornoRoma(new Date(pi.created * 1000)),
      importo: pi.amount_received || pi.amount, rimborsato: ch.amount_refunded || 0, valuta: pi.currency,
      prodotti: C.prodottiDelPagamento(pi), cliente: sp.name || '', citta: (sp.address || {}).city || '',
      fornitore: (pi.metadata || {}).fornitore_inviato === 'si'
    });
  }
  return ordini;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!C.autorizzato(req)) return res.status(401).json({ errore: 'Accesso richiesto' });
  const q = req.query || {};
  const oggi = C.giornoRoma();
  const da = C.giornoValido(q.da) ? q.da : oggi;
  let a = C.giornoValido(q.a) ? q.a : oggi;
  if (a < da) a = da;
  if ((Date.parse(a) - Date.parse(da)) / 86400e3 > 400) return res.status(400).json({ errore: 'Periodo troppo lungo' });
  const st = C.STORE[q.store] ? q.store : '';

  const [ev, or] = await Promise.allSettled([datiEventi(da, a, st), datiStripe(da, a, st)]);
  const eventi = ev.status === 'fulfilled' ? ev.value : null;
  const ordini = or.status === 'fulfilled' ? or.value : [];
  if (ev.status === 'rejected' && ev.reason.codice !== 'NO_DB') console.error('c-dati eventi:', ev.reason.message);
  if (or.status === 'rejected') console.error('c-dati stripe:', or.reason.message);

  // fatturato per fonte: l'evento "purchase" porta l'id del pagamento Stripe
  const perPi = Object.fromEntries(ordini.map(o => [o.id, o]));
  const fonti = eventi ? eventi.fonti.map(f => {
    const ok = [...new Set(f.pis)].map(p => perPi[p]).filter(Boolean);
    return { fonte: f.fonte, sessioni: f.sessioni, carrello: f.carrello, checkout: f.checkout,
      ordini: ok.length, ricavi: ok.reduce((s, o) => s + o.importo - o.rimborsato, 0) };
  }) : [];

  // prodotti: viste e carrello dal database, pezzi venduti da Stripe
  const prod = {};
  (eventi ? eventi.prodotti : []).forEach(p => { prod[p.nome] = { nome: p.nome, viste: p.viste, carrello: p.carrello, venduti: 0 }; });
  ordini.forEach(o => o.prodotti.forEach(nome => {
    (prod[nome] = prod[nome] || { nome, viste: 0, carrello: 0, venduti: 0 }).venduti++;
  }));

  return res.status(200).json({
    da, a, store: st || 'tutti', oggi,
    database: !!eventi, stripe: or.status === 'fulfilled',
    store_nomi: Object.fromEntries(Object.entries(C.STORE).map(([k, s]) => [k, s.nome])),
    eventi: eventi && { totale: eventi.totale, giorni: eventi.giorni, store: eventi.store,
      pagine: eventi.pagine, dispositivi: eventi.dispositivi },
    fonti,
    prodotti: Object.values(prod).sort((x, y) => y.venduti - x.venduti || y.viste - x.viste),
    ordini: ordini.sort((x, y) => y.creato - x.creato)
  });
};
