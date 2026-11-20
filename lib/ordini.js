// Funzioni comuni per gli ordini: le usano il webhook Stripe, la pagina "grazie"
// (conferma-ordine) e l'export CSV per il fornitore.

const nodemailer = require('nodemailer');

const SITO = 'https://pijamamania.it';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const euro = c => (c / 100).toFixed(2).replace('.', ',') + ' €';

// Lo stesso account Stripe incassa anche per altri negozi:
// qui si riconoscono solo i pagamenti fatti su PijamaMania.
function eDiPijamaMania(pi){
  return !!pi && String(pi.description || '').startsWith('PijamaMania');
}
const eDiProva = pi => (pi.metadata || {}).ordine_di_prova === 'si';
const numeroOrdine = pi => 'PM-' + pi.id.slice(-8).toUpperCase();

// articoli salvati nei metadata: "Nome — nero, taglia L — 44,90 €"
function articoli(pi){
  const m = pi.metadata || {};
  const chiavi = Object.keys(m).filter(k => /^articolo_\d+$/.test(k))
    .sort((a, b) => +a.split('_')[1] - +b.split('_')[1]);
  if (!chiavi.length) return [{ testo: (m.prodotto || 'PijamaMania') + ' — ' + (m.taglia_nome || ''),
    prodotto: m.prodotto || 'PijamaMania', colore: '', taglia: m.taglia_nome || '', ciabatte: '' }];
  return chiavi.map(k => {
    const [prodotto, dettagli = ''] = m[k].split(' — ');
    const r = { testo: m[k], prodotto, colore: '', taglia: '', ciabatte: '' };
    dettagli.split(', ').forEach(p => {
      if (p.startsWith('taglia ')) r.taglia = p.slice(7);
      else if (p.startsWith('+ ciabatte ')) r.ciabatte = p.slice(11);
      else if (p) r.colore = p;
    });
    return r;
  });
}

function spedizione(pi){
  const s = pi.shipping || {};
  const a = s.address || {};
  return {
    nome: s.name || '', telefono: s.phone || '', via: a.line1 || '',
    cap: a.postal_code || '', citta: a.city || '', provincia: a.state || '', paese: a.country || 'IT'
  };
}

function indirizzoRighe(sp){
  return [sp.nome, sp.via, [sp.cap, sp.citta, sp.provincia].filter(Boolean).join(' '),
    sp.telefono ? 'Tel. ' + sp.telefono : ''].filter(Boolean);
}

// ---------- CSV per il fornitore: una riga per articolo ----------
const INTESTAZIONE = ['Order ID','Date','Name','Phone','Email','Address','City','Province','ZIP','Country',
  'Product','Color','Size','Slippers','Qty'];

function righeCsv(pi){
  const sp = spedizione(pi);
  const data = new Date(pi.created * 1000).toISOString().slice(0, 10);
  return articoli(pi).map(a => [numeroOrdine(pi), data, sp.nome, sp.telefono, pi.receipt_email || '',
    sp.via, sp.citta, sp.provincia, sp.cap, sp.paese, a.prodotto, a.colore, a.taglia, a.ciabatte, '1']);
}

function csv(righe){
  const cella = v => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [INTESTAZIONE, ...righe].map(r => r.map(cella).join(',')).join('\r\n') + '\r\n';
}

// ---------- email ----------
function posta(){
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });
}

function mailCliente(pi){
  const sp = spedizione(pi);
  const nome = (sp.nome || '').split(' ')[0];
  const arts = articoli(pi);
  const qta = (pi.metadata || {}).qta || String(arts.length);
  const indirizzo = indirizzoRighe(sp);
  const riga = (a, b) => `<tr><td style="padding:8px 0;color:#5b6b82">${a}</td><td style="padding:8px 0;text-align:right;color:#0b1b33;font-weight:600">${b}</td></tr>`;
  const html = `
<div style="background:#eef3f9;padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
    <div style="background:#07152e;padding:22px;text-align:center">
      <img src="${SITO}/img/logo.png" alt="PijamaMania" height="38" style="height:38px;width:auto">
    </div>
    <div style="padding:28px 24px">
      <h1 style="margin:0 0 10px;font-size:22px;color:#0b1b33">Grazie${nome ? ', ' + esc(nome) : ''}! Ordine confermato 🎉</h1>
      <p style="margin:0 0 20px;color:#5b6b82;font-size:15px;line-height:1.5">
        Abbiamo ricevuto il tuo pagamento. Appena il pacco parte ti scriviamo di nuovo con il codice di tracciamento.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14.5px;border-top:1px solid #e3e9f1;border-bottom:1px solid #e3e9f1">
        ${riga('Numero ordine', esc(numeroOrdine(pi)))}
        ${arts.map((a, i) => riga(arts.length > 1 ? 'Articolo ' + (i + 1) : 'Articolo', esc(a.testo))).join('')}
        ${riga('Quantità', esc(qta))}
        ${riga('Spedizione', 'Gratuita')}
        ${riga('<b style="color:#0b1b33">Totale pagato</b>', '<b>' + esc(euro(pi.amount)) + '</b>')}
      </table>
      <p style="margin:20px 0 4px;font-size:13px;color:#5b6b82;font-weight:700;letter-spacing:.5px">SPEDIAMO A</p>
      <p style="margin:0;font-size:14.5px;color:#0b1b33;line-height:1.5">${indirizzo.map(esc).join('<br>')}</p>
      <p style="margin:24px 0 0;font-size:13.5px;color:#5b6b82;line-height:1.5">
        Hai una domanda o un dato da correggere? Rispondi a questa email, ti leggiamo noi.
      </p>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#8a99ad;margin:16px 0 0">PijamaMania · pijamamania.it@gmail.com</p>
</div>`;
  const text =
`Grazie${nome ? ', ' + nome : ''}! Ordine confermato.

Numero ordine: ${numeroOrdine(pi)}
${arts.map(a => '- ' + a.testo).join('\n')}
Quantità: ${qta}
Spedizione: gratuita
Totale pagato: ${euro(pi.amount)}

Spediamo a:
${indirizzo.join('\n')}

Appena il pacco parte ti scriviamo con il codice di tracciamento.
Per qualsiasi domanda rispondi a questa email.

PijamaMania`;
  return { html, text };
}

async function inviaMailCliente(pi){
  const { html, text } = mailCliente(pi);
  await posta().sendMail({
    from: `"PijamaMania" <${process.env.GMAIL_USER}>`,
    to: pi.receipt_email,
    subject: `Ordine ${numeroOrdine(pi)} confermato 🎉`,
    html, text
  });
}

function testoOrdine(pi){
  const m = pi.metadata || {};
  const sp = spedizione(pi);
  return `Nuovo ordine ${numeroOrdine(pi)}${eDiProva(pi) ? '  (ORDINE DI PROVA)' : ''}

${articoli(pi).map(a => '- ' + a.testo).join('\n')}
Quantità: ${m.qta || '1'}
Sconto: ${m.sconto_applicato || '0%'}
Totale incassato: ${euro(pi.amount)}

Cliente: ${pi.receipt_email || '-'}
Spedire a:
${indirizzoRighe(sp).join('\n')}

Pagamento Stripe: ${pi.id}`;
}

// copia per te
async function inviaCopiaNegozio(pi){
  await posta().sendMail({
    from: `"PijamaMania Ordini" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: pi.receipt_email || undefined,
    subject: `🛒 Nuovo ordine ${numeroOrdine(pi)} — ${(pi.metadata || {}).qta || 1} pz — ${euro(pi.amount)}`,
    text: testoOrdine(pi),
    attachments: [{ filename: numeroOrdine(pi) + '.csv', content: csv(righeCsv(pi)) }]
  });
}

// ordine al fornitore: testo semplice in inglese + CSV allegato
async function inviaAlFornitore(pi){
  const sp = spedizione(pi);
  const righe = articoli(pi).map(a =>
    `- ${a.prodotto}${a.colore ? ' | color: ' + a.colore : ''}${a.taglia ? ' | size: ' + a.taglia : ''}${a.ciabatte ? ' | slippers: ' + a.ciabatte : ''} | qty 1`);
  await posta().sendMail({
    from: `"PijamaMania Orders" <${process.env.GMAIL_USER}>`,
    to: process.env.FORNITORE_EMAIL,
    cc: process.env.GMAIL_USER,
    subject: `New order ${numeroOrdine(pi)} — PijamaMania`,
    text:
`Hi, new order to ship. Details also in the attached CSV.

Order: ${numeroOrdine(pi)}
${righe.join('\n')}

Ship to:
${sp.nome}
${sp.via}
${[sp.cap, sp.citta, sp.provincia].filter(Boolean).join(' ')}
Italy
Phone: ${sp.telefono || '-'}
Email: ${pi.receipt_email || '-'}

Please reply with the tracking number. Thank you!
PijamaMania`,
    attachments: [{ filename: numeroOrdine(pi) + '.csv', content: csv(righeCsv(pi)) }]
  });
}

module.exports = {
  eDiPijamaMania, eDiProva, numeroOrdine, articoli, spedizione, righeCsv, csv,
  inviaMailCliente, inviaCopiaNegozio, inviaAlFornitore
};
