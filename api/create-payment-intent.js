// Funzione serverless (Vercel / Netlify Functions).
// I prezzi stanno QUI e solo qui: il browser non deve mai poterli decidere,
// altrimenti chiunque apra la console compra i pigiami a 1 centesimo.

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prezzi, prodotti, taglie e sconti bundle stanno in catalogo.js (radice del sito):
// lo stesso file che usa il sito per mostrare i prezzi, così non vanno mai fuori sincrono.
const C = require('../catalogo.js');
const SPEDIZIONE = 0;   // gratuita

// Codice di prova SEGRETO: se su Vercel esiste la variabile CODICE_TEST
// (almeno 8 caratteri) e il link del checkout contiene ?codice=<quel valore>,
// l'ordine costa 0,50 € (il minimo che Stripe accetta in euro).
// Per disattivarlo basta cancellare la variabile su Vercel.
const IMPORTO_TEST = 50;
function codiceTestValido(codice){
  const segreto = process.env.CODICE_TEST || '';
  return segreto.length >= 8 && typeof codice === 'string' && codice === segreto;
}

// ---------- nome sull'estratto conto della carta ----------
// Il cliente vede "<PREFISSO ACCOUNT>* PIJAMAMANIA". Il prefisso è quello del
// tuo account Stripe (max 10 caratteri); il totale non può superare 22.
// Vale solo per i pagamenti di questo sito: l'account e gli altri negozi non cambiano.
const MARCHIO = 'PIJAMAMANIA';
let suffissoCache;   // calcolato una volta per istanza

async function suffissoEstratto(){
  if (suffissoCache !== undefined) return suffissoCache;
  try {
    const acc = await stripe.accounts.retrieve();
    const st = acc.settings || {};
    const prefisso = ((st.card_payments && st.card_payments.statement_descriptor_prefix)
      || (st.payments && st.payments.statement_descriptor) || '').trim().slice(0, 10).trim();
    const spazio = 22 - prefisso.length - 2;          // "* " occupa 2 caratteri
    // se il prefisso contiene già il marchio non serve aggiungerlo
    const giaPresente = prefisso.replace(/\s/g,'').toUpperCase().includes('PIJAMA');
    suffissoCache = (!prefisso || giaPresente || spazio < 5) ? null : MARCHIO.slice(0, spazio);
  } catch (e) {
    suffissoCache = null;    // se non riesco a leggerlo, non tocco nulla
  }
  return suffissoCache;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // articoli: [{p:'anatra', colore:'nero', taglia:'L', ciabatte:'39-41'}, ...]
    // accetta anche il vecchio formato della pagina squalo: {taglie:['mega','baby']} o {taglia, qta}
    let articoli = Array.isArray(body.articoli) ? body.articoli : null;
    if (!articoli) {
      const vecchie = Array.isArray(body.taglie) ? body.taglie
        : (body.taglia ? Array(Math.min(Math.max(parseInt(body.qta, 10) || 1, 1), 3)).fill(body.taglia) : []);
      articoli = vecchie.map(t => ({ p: 'squalo', taglia: String(t) }));
    }
    if (articoli.length < 1 || articoli.length > C.maxPezzi)
      return res.status(400).json({ errore: 'Carrello non valido' });
    // tengo solo i campi che conosco, così nessuno può infilare roba strana
    articoli = articoli.map(a => {
      const prod = a && C.prodotti[a.p];
      if (!prod) return { p: '' };
      const pulito = { p: a.p };
      prod.opzioni.forEach(o => { if (a[o.id] != null) pulito[o.id] = String(a[o.id]); });
      return pulito;
    });
    const conto = C.totale(articoli);
    if (!conto) return res.status(400).json({ errore: 'Articoli non validi' });

    const qta = conto.righe.length;
    const pieno = conto.pieno;
    const test = codiceTestValido(body.codice);
    const importo = test ? IMPORTO_TEST : conto.importo + SPEDIZIONE;
    const righe = conto.righe.map(r => ({ nome: r.breve, dettagli: r.dettagli, prezzo: r.prezzo }));
    const nomeVariante = conto.righe.map(r => r.breve + ' (' + r.dettagli + ')').join(' + ');

    // 1) solo preventivo: il checkout mostra prezzi e modulo carta senza creare nulla su Stripe
    if (body.solo_prezzo) {
      return res.status(200).json({ importo, pieno, pct: conto.pct, righe, nomeVariante, qta, test });
    }

    // 2) il cliente ha cliccato "Paga": ora si crea il pagamento
    const prodottiDiversi = [...new Set(conto.righe.map(r => r.breve))];
    const metadata = {
      prodotto: prodottiDiversi.length === 1 ? conto.righe[0].nome : 'PijamaMania — ' + qta + ' articoli',
      taglia_nome: nomeVariante.slice(0, 490),
      qta: String(qta),
      sconto_applicato: ((pieno - importo) / 100).toFixed(2).replace('.', ',') + ' €' + (conto.pct && !test ? ' (bundle -' + conto.pct + '%)' : ''),
      ordine_di_prova: test ? 'si' : 'no'
    };
    // un campo per articolo (Stripe accetta max 500 caratteri per valore)
    conto.righe.forEach((r, i) => {
      metadata['articolo_' + (i + 1)] = (r.nome + ' — ' + r.dettagli + ' — ' + (r.prezzo / 100).toFixed(2).replace('.', ',') + ' €').slice(0, 490);
    });

    const dati = {
      amount: importo,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },   // carte, Apple Pay, Google Pay, Klarna se attivi
      description: ('PijamaMania — ' + nomeVariante).slice(0, 990),
      metadata
    };

    const suffisso = await suffissoEstratto();
    let intent;
    try {
      intent = await stripe.paymentIntents.create(suffisso ? { ...dati, statement_descriptor_suffix: suffisso } : dati);
    } catch (err) {
      // rete di sicurezza: se Stripe rifiuta il suffisso, il pagamento parte comunque senza
      if (suffisso && /statement_descriptor/i.test(String(err && err.message))) {
        console.error('Suffisso estratto conto rifiutato, procedo senza:', err.message);
        suffissoCache = null;
        intent = await stripe.paymentIntents.create(dati);
      } else {
        throw err;
      }
    }

    return res.status(200).json({
      clientSecret: intent.client_secret,
      importo,
      pieno,
      pct: conto.pct,
      righe,
      nomeVariante,
      qta,
      test
    });

  } catch (err) {
    console.error('Errore PaymentIntent:', err);
    return res.status(500).json({ errore: 'Impossibile creare il pagamento' });
  }
};
