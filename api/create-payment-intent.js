// Funzione serverless (Vercel / Netlify Functions).
// I prezzi stanno QUI e solo qui: il browser non deve mai poterli decidere,
// altrimenti chiunque apra la console compra la coperta a 1 centesimo.

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODOTTO = 'Coperta Squalo Indossabile';

// prezzi in centesimi — PREZZO UNICO 39,90€ su tutte le taglie
const VARIANTI = {
  baby:   { nome: 'Baby Shark · 2-5 anni',    prezzo: 3990 },
  junior: { nome: 'Junior Shark · 6-10 anni', prezzo: 3990 },
  teen:   { nome: 'Teen Shark · 11-15 anni',  prezzo: 3990 },
  mega:   { nome: 'Mega Shark · 16+ anni',    prezzo: 3990 }
};

const SPEDIZIONE = 0;   // gratuita
const QTA_MAX = 5;

// sconto quantità: 2 pezzi -5%, da 3 in su -10%
function sconto(qta){
  if (qta >= 3) return 0.10;
  if (qta === 2) return 0.05;
  return 0;
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

    const variante = VARIANTI[body.taglia];
    if (!variante) return res.status(400).json({ errore: 'Taglia non valida' });

    const qta = Math.min(Math.max(parseInt(body.qta, 10) || 1, 1), QTA_MAX);

    const pieno = variante.prezzo * qta;
    const importo = Math.round(pieno * (1 - sconto(qta))) + SPEDIZIONE;

    const dati = {
      amount: importo,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },   // carte, Apple Pay, Google Pay, Klarna se attivi
      description: `${PRODOTTO} — ${variante.nome} × ${qta}`,
      metadata: {
        prodotto: PRODOTTO,
        taglia: body.taglia,
        taglia_nome: variante.nome,
        qta: String(qta),
        sconto_applicato: (sconto(qta) * 100) + '%'
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
      nomeVariante: variante.nome
    });

  } catch (err) {
    console.error('Errore PaymentIntent:', err);
    return res.status(500).json({ errore: 'Impossibile creare il pagamento' });
  }
};
