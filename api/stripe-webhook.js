// Webhook Stripe: parte da solo a ogni pagamento riuscito, anche se il cliente
// chiude la pagina prima di arrivare su grazie.html.
//
// Per ogni ordine PijamaMania:
//   1) email di conferma al cliente (se la pagina "grazie" non l'ha già mandata)
//   2) copia a te con il CSV allegato
//   3) ordine al fornitore (FORNITORE_EMAIL) con il CSV allegato
// Ogni passo viene segnato nei metadata del pagamento, così se Stripe
// ripete l'evento nessuno riceve due email.
//
// Variabili d'ambiente su Vercel:
//   STRIPE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD   (ci sono già)
//   STRIPE_WEBHOOK_SECRET   whsec_... (Stripe → Sviluppatori → Webhook)
//   FORNITORE_EMAIL         email del fornitore (se manca, al fornitore non parte nulla)

const Stripe = require('stripe');
const O = require('../lib/ordini.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function corpoGrezzo(req){
  return new Promise((ok, ko) => {
    const pezzi = [];
    req.on('data', c => pezzi.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => ok(Buffer.concat(pezzi)));
    req.on('error', ko);
  });
}

async function segna(id, chiave, valore){
  await stripe.paymentIntents.update(id, { metadata: { [chiave]: valore } });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Metodo non consentito');
  }

  let evento;
  try {
    const grezzo = await corpoGrezzo(req);
    evento = stripe.webhooks.constructEvent(grezzo, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Firma webhook non valida:', err.message);
    return res.status(400).send('Firma non valida');
  }

  if (evento.type !== 'payment_intent.succeeded') return res.status(200).json({ ignorato: evento.type });

  // rileggo il pagamento da Stripe: i flag nei metadata devono essere quelli aggiornati
  const pi = await stripe.paymentIntents.retrieve(evento.data.object.id);
  if (!O.eDiPijamaMania(pi)) return res.status(200).json({ ignorato: 'altro negozio' });

  const m = pi.metadata || {};
  const errori = [];

  // 1) cliente
  if (m.email_inviata !== 'si' && pi.receipt_email) {
    try { await segna(pi.id, 'email_inviata', 'si'); await O.inviaMailCliente(pi); }
    catch (e) { errori.push('cliente: ' + e.message); await segna(pi.id, 'email_inviata', '').catch(() => {}); }
  }

  // 2) copia a te
  if (m.copia_inviata !== 'si') {
    try { await segna(pi.id, 'copia_inviata', 'si'); await O.inviaCopiaNegozio(pi); }
    catch (e) { errori.push('copia: ' + e.message); await segna(pi.id, 'copia_inviata', '').catch(() => {}); }
  }

  // 3) fornitore (mai per gli ordini di prova)
  if (process.env.FORNITORE_EMAIL && !O.eDiProva(pi) && m.fornitore_inviato !== 'si') {
    try { await segna(pi.id, 'fornitore_inviato', 'si'); await O.inviaAlFornitore(pi); }
    catch (e) { errori.push('fornitore: ' + e.message); await segna(pi.id, 'fornitore_inviato', '').catch(() => {}); }
  }

  if (errori.length) {
    console.error('Webhook ' + pi.id + ':', errori.join(' | '));
    return res.status(500).json({ errori });   // Stripe riprova da solo più tardi
  }
  return res.status(200).json({ ok: true });
};

// serve il corpo originale per verificare la firma di Stripe
module.exports.config = { api: { bodyParser: false } };
