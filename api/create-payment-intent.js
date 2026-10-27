// Funzione serverless (Vercel / Netlify Functions).
// I prezzi stanno QUI e solo qui: il browser non deve mai poterli decidere,
// altrimenti chiunque apra la console compra la coperta a 1 centesimo.

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODOTTO = 'Coperta Squalo Indossabile';

// taglie (stesso prezzo per tutte)
const VARIANTI = {
  baby:   { nome: 'Bimbo 2-5 anni' },
  junior: { nome: 'Bambino 6-10 anni' },
  teen:   { nome: 'Ragazzo 11-15 anni' },
  mega:   { nome: 'Adulto 16+' }
};

// prezzi in centesimi — QUESTI sono quelli che il cliente paga davvero
const PREZZO_SINGOLO = 3990;
const OFFERTE = { 1: 3990, 2: 6990, 3: 9490 };   // 1, 2 o 3 coperte
const SPEDIZIONE = 0;   // gratuita

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

    // taglie: ["mega","baby"] — accetta anche il vecchio formato {taglia, qta}
    let taglie = Array.isArray(body.taglie) ? body.taglie
      : (body.taglia ? Array(Math.min(Math.max(parseInt(body.qta, 10) || 1, 1), 3)).fill(body.taglia) : []);
    taglie = taglie.map(String);
    if (taglie.length < 1 || taglie.length > 3 || !taglie.every(t => VARIANTI[t]))
      return res.status(400).json({ errore: 'Taglie non valide' });

    const qta = taglie.length;
    const pieno = PREZZO_SINGOLO * qta;
    const importo = OFFERTE[qta] + SPEDIZIONE;
    const nomeVariante = taglie.map(t => VARIANTI[t].nome).join(' + ');

    const dati = {
      amount: importo,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },   // carte, Apple Pay, Google Pay, Klarna se attivi
      description: `${PRODOTTO} — ${nomeVariante}`,
      metadata: {
        prodotto: PRODOTTO,
        taglia: taglie.join(','),
        taglia_nome: nomeVariante,
        qta: String(qta),
        sconto_applicato: ((pieno - importo) / 100).toFixed(2).replace('.', ',') + ' €'
      }
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
      nomeVariante,
      qta
    });

  } catch (err) {
    console.error('Errore PaymentIntent:', err);
    return res.status(500).json({ errore: 'Impossibile creare il pagamento' });
  }
};
