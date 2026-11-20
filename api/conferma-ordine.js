// La chiama grazie.html dopo il pagamento: manda subito la mail di conferma
// al cliente dalla tua Gmail (senza ricevute Stripe).
// Prima chiede a Stripe se il pagamento è davvero riuscito e segna l'ordine come
// "email inviata", così né ricaricare la pagina né il webhook mandano la mail due volte.
//
// La copia per te e l'ordine al fornitore li manda il webhook (api/stripe-webhook.js).
// Finché il webhook non è configurato (manca STRIPE_WEBHOOK_SECRET), la copia la manda questa funzione.

const Stripe = require('stripe');
const O = require('../lib/ordini.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const id = String(body.id || '');
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ errore: 'Ordine non valido' });

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(id);
  } catch (err) {
    return res.status(404).json({ errore: 'Ordine non trovato' });
  }

  if (pi.status !== 'succeeded') return res.status(200).json({ inviata: false, motivo: 'pagamento non riuscito' });
  if (!O.eDiPijamaMania(pi)) return res.status(200).json({ inviata: false, motivo: 'altro negozio' });
  if (pi.metadata && pi.metadata.email_inviata === 'si') return res.status(200).json({ inviata: true, gia: true });
  if (!pi.receipt_email) return res.status(200).json({ inviata: false, motivo: 'email cliente mancante' });

  // segno subito l'ordine, così due richieste ravvicinate non mandano due mail
  await stripe.paymentIntents.update(id, { metadata: { email_inviata: 'si' } });

  try {
    await O.inviaMailCliente(pi);
  } catch (err) {
    console.error('Errore invio email:', err);
    // tolgo il segno, così ricaricando la pagina (o col webhook) si può riprovare
    await stripe.paymentIntents.update(id, { metadata: { email_inviata: '' } }).catch(() => {});
    return res.status(500).json({ inviata: false, motivo: 'invio non riuscito' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET && pi.metadata.copia_inviata !== 'si') {
    await stripe.paymentIntents.update(id, { metadata: { copia_inviata: 'si' } }).catch(() => {});
    await O.inviaCopiaNegozio(pi).catch(e => console.error('Errore copia ordine:', e));
  }

  return res.status(200).json({ inviata: true });
};
