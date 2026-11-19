#!/usr/bin/env node
/* Genera la homepage (index.html) e le pagine prodotto a partire da
   catalogo.js (prezzi, taglie, foto) + i testi qui sotto.
   Uso:  node strumenti/genera-pagine.js
   Le pagine generate sono HTML statico vero: titolo, descrizione e
   anteprima social giuste per ogni prodotto (WhatsApp, Instagram…). */

const fs = require('fs');
const path = require('path');
const C = require('../catalogo.js');

const RADICE = path.join(__dirname, '..');
const SITO = 'https://pijamamania.it';
const fmt = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const S2 = C.sconti[2], S3 = C.sconti[3];

/* ============================================================
   TESTI DELLE PAGINE (tono PijamaMania: diretto, ironico, concreto)
   ============================================================ */
const T = {

  squalo: {
    titolo: 'Coperta Squalo Indossabile — PijamaMania',
    meta: 'La coperta squalo indossabile: infili i piedi nella coda e ti avvolgi. Pile flanellato ultra morbido, 4 taglie da bambino ad adulto. Spedizione gratuita in Italia.',
    og: 'img/anteprima.jpg',
    badge: 'PERFETTA DA REGALARE 🎁',
    stelle: true,
    sub: 'Infili i piedi nella coda, tiri su il resto e sei dentro uno squalo. Metà coperta, metà sacco a pelo, in pile morbidissimo che non pizzica.',
    chips: ['☁️ Pile ultra morbido', '🧼 In lavatrice', "👨‍👩‍👧 Dai 2 anni all'adulto"],
    blocchi: [
      ['img/desc-1.jpg', '', 'Entri dalla coda e sparisci', "Non è una coperta da tenere su con le mani: i piedi entrano nella pinna caudale e il corpo scivola dentro la sacca. Da lì in poi puoi muoverti sul divano, allungare le gambe, girarti — lo squalo resta addosso."],
      ['img/desc-2.png', 'center 25%', 'Pile flanellato, caldo dal primo secondo', "Interno in flanella di pile spazzolata: trattiene il calore senza pesare e non dà quella sensazione ruvida dei pile economici. Sta bene anche sulla pelle nuda, che è il vero test."],
      ['img/squalo-6.jpg', 'center 30%', 'Il regalo che nessuno si aspetta', "Compleanni, Natale, Secret Santa fra colleghi: è il pacco che blocca la stanza per cinque minuti. E a differenza di quasi tutti i regali buffi, poi viene usato davvero tutte le sere."],
      ['img/squalo-4.jpg', '', 'In lavatrice e via', "Lavaggio in lavatrice a ciclo delicato con acqua fredda, asciugatrice a bassa temperatura. Niente candeggina, niente ferro da stiro: il pile mantiene morbidezza e forma lavaggio dopo lavaggio."]
    ],
    tabella: { col: ['TAGLIA', 'ETÀ', 'LUNGHEZZA'], righe: [
      ['Bimbo', '2-5 anni', '84-150 cm'], ['Bambino', '6-10 anni', '152-170 cm'],
      ['Ragazzo', '11-15 anni', '173-190 cm'], ['Adulto', '16+ anni', '193-211 cm']] },
    notaTaglie: "Scegli in base all'età: per tutti gli adulti va bene la taglia <b>Adulto</b>. Il modello è largo per costruzione, quindi non conta la corporatura. Se sei a cavallo fra due taglie, prendi la più grande.",
    recensioni: true,
    faq: [
      ['Come si indossa esattamente?', "Ti siedi, infili i piedi nell'apertura della coda e tiri su il corpo della coperta fino a dove vuoi. Puoi lasciarla all'altezza della vita o tirarla fino alle spalle."],
      ['Posso scegliere taglie diverse nell\'offerta?', 'Sì: con 2 o 3 coperte scegli la taglia di ognuna. Per esempio una Adulto e una Bimbo per mamma e figlio.'],
      ['Di che materiale è fatta?', 'Pile flanellato ultra morbido, lo stesso tipo di tessuto delle coperte invernali di qualità. Leggero da indossare ma caldo.'],
      ['Va bene anche per i bambini?', 'Sì, la taglia Bimbo parte dai 2 anni. Per i più piccoli consigliamo comunque la presenza di un adulto durante l\'uso.'],
      ['Si può lavare?', 'Sì, lavatrice a ciclo delicato con acqua fredda e asciugatrice a bassa temperatura. Evita candeggina e ferro da stiro.']
    ]
  },

  anatra: {
    titolo: 'Pigiama Anatra con cappuccio e ali — PijamaMania',
    meta: "Il pigiama anatra oversize: cappuccio gigante con occhi e becco giallo, maniche ad ala. Pile morbidissimo, bianco o nero, con ciabatte abbinate. Spedizione gratuita.",
    badge: 'IL PIÙ RICHIESTO IN COPPIA 🦆',
    sub: "Cappuccio gigante con occhi e becco giallo, maniche ad ala: allarghi le braccia e diventi un'anatra a grandezza naturale. Largo, morbido e impossibile da prendere sul serio.",
    chips: ['☁️ Pile morbidissimo', '🪽 Maniche ad ala', '🖤🤍 Bianco o nero', '🥿 Ciabatte abbinate'],
    blocchi: [
      ['img/anatra-4.jpg', '', 'Allarghi le braccia, spuntano le ali', "Le maniche sono tagliate ad ala: quando apri le braccia il pigiama si trasforma in un'anatra intera. Il cappuccio oversize con occhi e becco giallo fa il resto. Funziona sul divano, funziona ancora meglio quando entri in una stanza piena di gente."],
      ['img/anatra-6.jpg', '', 'Le mani escono quando servono', "Dentro le maniche ci sono due aperture: tiri fuori le mani per scrivere, mangiare o giocare alla play, e quando hai finito le rimetti dentro al caldo. Niente maniche da arrotolare ogni cinque minuti."],
      ['img/anatra-3.jpg', '', 'Metà coperta, metà pigiama', "Il taglio è volutamente oversize: ti muovi libero, ti siedi a gambe incrociate, ti addormenti sul divano. Il pile è morbido sulla pelle e tiene caldo senza pesare — è una coperta che ha deciso di diventare anatra."],
      ['img/anatra-2.jpg', '', 'In coppia rende il doppio', "Bianco e nero, uno per lei e uno per lui, o per i coinquilini che non si prendono sul serio. Aggiungi le ciabatte anatra abbinate e il look è completo dalla testa ai piedi."]
    ],
    tabella: { col: ['TAGLIA', 'ALTEZZA CONSIGLIATA'], righe: [
      ['S', 'fino a 152 cm'], ['M', '152-160 cm'], ['L', '160-165 cm'], ['XL', '165-172 cm'], ['XXL', '172-185 cm']] },
    notaTaglie: "Scegli in base alla tua <b>altezza</b>: il modello è oversize per costruzione, quindi la corporatura conta poco. Se sei a cavallo fra due taglie, prendi la più grande.",
    faq: [
      ['Le ciabatte sono comprese?', `No, sono un'aggiunta: per ogni pigiama scegli se vuoi anche le ciabatte anatra abbinate (+5 €, quindi ${fmt(C.prodotti.anatra.prezzo + 500)} in totale) e la tua misura.`],
      ['Veste largo?', "Sì, è un modello oversize tipo coperta indossabile. Scegli la taglia in base all'altezza e avrai il giusto margine per muoverti."],
      ['Posso prendere colori diversi nell\'offerta?', 'Sì: con 2 o 3 pigiami scegli colore, taglia e ciabatte di ognuno. Bianco per uno, nero per l\'altro.'],
      ['Di che materiale è?', 'Pile morbido in 100% poliestere, leggero ma caldo, piacevole anche sulla pelle.'],
      ['Si può lavare?', 'Sì, in lavatrice a ciclo delicato con acqua fredda. Evita candeggina e asciugatrice ad alta temperatura.']
    ]
  },

  stranger: {
    titolo: 'Pigiama Stranger Things Demogorgone — PijamaMania',
    meta: "La tuta pigiama del Demogorgone di Stranger Things con cappuccio a petali. Pile invernale, zip intera, taglie da bambino (110 cm) ad adulto. Spedizione gratuita.",
    badge: 'DIRETTAMENTE DAL SOTTOSOPRA 👹',
    sub: "La tuta intera con il cappuccio a petali del Demogorgone: lo apri e sembra di avere il mostro del Sottosopra in testa. Per le maratone di Stranger Things, Halloween e chi non ha paura di niente.",
    chips: ['🔥 Pile grigio venato', '🌺 Cappuccio a petali', '👨‍👩‍👧 Dai 110 cm all\'adulto'],
    blocchi: [
      ['img/stranger-3.jpg', '', 'Il cappuccio che si apre come una corolla', "Il dettaglio che lo rende inconfondibile: il cappuccio ha i petali del Demogorgone attorno al viso. Chi ha visto la serie lo riconosce da lontano, chi non l'ha vista chiede subito cos'è."],
      ['img/stranger-2.jpg', '', 'Zip davanti, Demogorgone sulla schiena', "Si apre tutto con una zip frontale lunga, quindi lo metti e lo togli in un attimo. Dietro c'è il ricamo del Demogorgone, polsini e caviglie sono stretti per non far entrare il freddo: è un pigiama vero, non un costume da una sera."],
      ['img/stranger-5.jpg', '', 'Una taglia per ogni membro del party', "Dalle taglie bambino da 110 cm fino all'adulto da 190: si veste tutta la famiglia, come i ragazzi di Hawkins. Con il bundle scegli una taglia diversa per ogni pezzo."],
      ['img/stranger-4.jpg', '', 'Maratona, Halloween, carnevale', "Divano e ultima stagione in loop, festa di Halloween o carnevale coi bambini: è lo stesso pigiama, cambia solo quanta gente ti fa le foto."]
    ],
    tabella: { col: ['TAGLIA', 'ALTEZZA'], righe: [
      ['Bimbo S', '110-120 cm'], ['Bimbo M', '120-130 cm'], ['Bimbo L', '130-140 cm'], ['Bimbo XL', '140-155 cm'],
      ['Adulto S', '156-170 cm'], ['Adulto M', '170-180 cm'], ['Adulto L', '180-190 cm']] },
    notaTaglie: "Per i bambini la taglia corrisponde all'<b>altezza in cm</b>. Se sei indeciso fra due taglie, prendi la più grande.",
    faq: [
      ['Va bene anche come costume?', 'Sì: è un pigiama da usare davvero, ma con il cappuccio a petali è perfetto anche per Halloween, carnevale e feste a tema.'],
      ['Ci sono le taglie per bambini?', 'Sì, dalla Bimbo S (110-120 cm) alla Bimbo XL (140-155 cm), più tre taglie adulto fino a 190 cm.'],
      ['Di che materiale è?', 'Pile invernale (80% poliestere, 20% cotone): caldo, morbido e pensato per le serate fredde.'],
      ['Si può lavare?', 'Sì, in lavatrice. Consigliamo ciclo delicato con acqua fredda e niente candeggina.']
    ]
  },

  stitch: {
    titolo: 'Pigiama Stitch kigurumi — PijamaMania',
    meta: "Il pigiama kigurumi di Stitch con cappuccio e orecchie giganti. Flanella morbidissima, taglio largo, taglie dalla S alla XXL. Spedizione gratuita in Italia.",
    badge: 'PREZZO PIÙ BASSO DEL NEGOZIO 💙',
    sub: "Il kigurumi blu di Stitch, con cappuccio e orecchie giganti. Flanella morbida, taglio largo: ci stai comodo sul divano e fai un figurone alla festa.",
    chips: ['☁️ Flanella morbida', '👂 Orecchie giganti', '📏 Dalla S alla XXL'],
    blocchi: [
      ['img/stitch-3.jpg', '', 'Orecchie giganti, effetto garantito', "Tiri su il cappuccio e sei Stitch: orecchie grandi, faccia riconoscibile e quel blu che si vede da un chilometro. È il pigiama che fa sorridere chiunque ti passi davanti."],
      ['img/stitch-2.jpg', '', 'Flanella che non vuoi più togliere', "È in flanella morbida e calda: avvolge senza stringere e non pizzica. Lo metti la sera dopo cena e la mattina ti accorgi che ci hai anche dormito."],
      ['img/stitch-5.jpg', '', 'Taglio largo, comodo davvero', "Il modello kigurumi è ampio per costruzione: ti siedi a gambe incrociate, ti stendi, ti muovi. Scegli in base all'altezza e sei a posto."],
      ['img/stitch-4.jpg', '', 'Divano, pigiama party, carnevale', "Serata film, pigiama party con le amiche, carnevale o festa a tema: con lo stesso pigiama li copri tutti. E al prezzo di Stitch prenderne due per il bundle è un attimo."]
    ],
    tabella: { col: ['TAGLIA', 'ALTEZZA'], righe: [
      ['S', '145-155 cm'], ['M', '155-165 cm'], ['L', '165-175 cm'], ['XL', '175-185 cm'], ['XXL', '185-195 cm']] },
    notaTaglie: "Scegli in base alla tua <b>altezza</b>: il kigurumi è largo, quindi la corporatura conta poco. Se sei a cavallo fra due taglie, prendi la più grande.",
    faq: [
      ['Veste largo?', "Sì, il kigurumi è un modello ampio. Scegli la taglia in base all'altezza."],
      ['Di che materiale è?', 'Flanella morbida in 100% poliestere, calda e piacevole sulla pelle.'],
      ['Va bene per ragazzi?', 'Sì, la taglia S parte da 145 cm, quindi va bene anche per i ragazzi più alti.'],
      ['Si può lavare?', 'Sì, in lavatrice a ciclo delicato con acqua fredda. Evita candeggina e ferro da stiro.']
    ]
  },

  sdentato: {
    titolo: 'Pigiama Dragon Trainer Sdentato e Furia Chiara — PijamaMania',
    meta: "Il pigiama kigurumi di Dragon Trainer: Sdentato nero o Furia Chiara bianca, con occhi sul cappuccio, ali e coda. Flanella morbida, taglie S-XXL. Spedizione gratuita.",
    badge: 'PER CHI HA SEMPRE VOLUTO UN DRAGO 🐉',
    sub: "Il kigurumi di Dragon Trainer in due versioni: Sdentato nero con i grandi occhi verdi, o Furia Chiara bianca e azzurra. Ali, coda e cappuccio con le corna: per chi ha sempre voluto un drago — e ha deciso di diventarlo.",
    chips: ['🖤🤍 Nero o bianco', '🪽 Ali e coda', '☁️ Flanella morbida'],
    blocchi: [
      ['img/sdentato-4.jpg', '', 'Il Furia Buia più comodo di Berk', "Grandi occhi verdi, corna e orecchie sul cappuccio, ali sulle braccia e coda con la pinna rossa: il pigiama riprende tutti i dettagli che rendono Sdentato riconoscibile al primo sguardo. Tu ci metti solo la faccia soddisfatta."],
      ['img/sdentato-3.jpg', '', 'Oppure la Furia Chiara', "Preferisci il bianco? La versione Furia Chiara è bianca con pancia e ali azzurre, occhi azzurri sul cappuccio. Calda uguale, solo più luminosa — e in coppia con Sdentato è l'abbinata perfetta."],
      ['img/sdentato-2.jpg', '', 'Largo, comodo, da vivere', "Il taglio kigurumi è ampio e in flanella morbida: ti muovi, ti siedi a gambe incrociate, giochi alla play, ti addormenti sul divano. Scegli la taglia in base all'altezza e non ci pensi più."],
      ['img/sdentato-6.jpg', '', 'Serata Dragon Trainer, cosplay, feste', "Rivedere tutta la saga in una sera con gli amici, una festa a tema o il carnevale: con un drago addosso sei sempre il più fotografato della stanza. Con il bundle vestite tutto il gruppo."]
    ],
    tabella: { col: ['TAGLIA', 'ALTEZZA'], righe: [
      ['S', '145-155 cm'], ['M', '155-165 cm'], ['L', '165-175 cm'], ['XL', '175-185 cm'], ['XXL', '185-195 cm']] },
    notaTaglie: "Scegli in base alla tua <b>altezza</b>: il kigurumi è largo, quindi la corporatura conta poco. Se sei a cavallo fra due taglie, prendi la più grande.",
    faq: [
      ['Che colori ci sono?', 'Due: nero (Sdentato) e bianco con dettagli azzurri (Furia Chiara). Con 2 o 3 pigiami puoi scegliere il colore di ognuno.'],
      ['Veste largo?', "Sì, il kigurumi è un modello ampio. Scegli la taglia in base all'altezza."],
      ['Di che materiale è?', 'Flanella morbida in 100% poliestere, calda e piacevole sulla pelle.'],
      ['Si può lavare?', 'Sì, in lavatrice a ciclo delicato con acqua fredda. Evita candeggina e ferro da stiro.']
    ]
  }
};

/* domande uguali per tutti i prodotti */
const FAQ_COMUNI = [
  ['Come funziona lo sconto bundle?', `Più pezzi metti nel carrello, più risparmi su tutto: 2 pezzi -${S2}%, 3 o più -${S3}%. Vale anche mischiando prodotti diversi, per esempio uno squalo e un'anatra.`],
  ['Quanto ci mette ad arrivare?', 'Preparazione dell\'ordine in 1-2 giorni lavorativi, poi 7-12 giorni lavorativi per la consegna in Italia. Ricevi il codice di tracciamento via email appena il pacco parte.'],
  ['Resi e rimborsi', 'Il diritto di recesso si esercita entro 14 giorni dalla consegna. Le spese di restituzione sono a carico del cliente e il rimborso avviene dopo che abbiamo ricevuto e controllato il prodotto. Condizioni complete in <a href="spedizioni.html#recesso">Spedizioni e resi</a>.']
];

/* ============================================================
   PEZZI DI PAGINA
   ============================================================ */
const PM_MANCA = `<script>function pmManca(i){if(!i||i.dataset.m)return;i.dataset.m=1;i.style.display='none';var d=document.createElement('div');d.className='manca';d.innerHTML='<b>📷</b>'+(i.getAttribute('src')||'');i.parentNode.appendChild(d);}</script>`;

const ICONA = e => `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${e}</text></svg>`;

function chiaro(hex) {   // versione molto chiara del colore accento, per i badge
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = x => Math.round(x + (255 - x) * 0.88);
  return '#' + [m(r), m(g), m(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

const TOPBAR = `<div class="topbar">🚚 SPEDIZIONE GRATIS · 2 PEZZI -${S2}% · 3+ -${S3}%</div>`;

const FOOTER = `<footer>
  <div class="wrap">
    <a href="index.html">Tutti i pigiami</a>
    <a href="termini.html">Termini e condizioni</a>
    <a href="privacy.html">Privacy e cookie</a>
    <a href="spedizioni.html">Spedizioni e resi</a>
    <a href="contatti.html">Contatti</a>
    <div class="ragione">
      PijamaMania · Email: pijamamania.it@gmail.com<br>
      Prezzi IVA inclusa. I colori possono variare leggermente rispetto alle foto a causa delle impostazioni dello schermo.
    </div>
  </div>
</footer>`;

const ANALYTICS = `<!-- Vercel Web Analytics: visite e acquisti, senza cookie -->
<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
<script defer src="/_vercel/insights/script.js"></script>`;

function card(id, etichetta) {
  const p = C.prodotti[id];
  return `<a class="card" href="${p.pagina}">
      <div class="shot">${etichetta ? `<span class="etq">${etichetta}</span>` : ''}<img src="${p.foto[0]}" alt="${esc(p.nome)}" loading="lazy" onerror="pmManca(this)"></div>
      <div class="info"><span class="nm">${esc(p.nome)}</span><span class="pr">${fmt(p.prezzo)} <small>· 2 pezzi -${S2}%</small></span><span class="vai">Scegli la taglia →</span></div>
    </a>`;
}

function head({ titolo, meta, url, og, emoji, accento, tipo, prezzo }) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(meta)}">
<meta name="theme-color" content="#0b1f3d">
<link rel="canonical" href="${url}">
<link rel="icon" href="${ICONA(emoji)}">
<!-- anteprima del link su WhatsApp, Instagram, Facebook, Telegram -->
<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="PijamaMania">
<meta property="og:locale" content="it_IT">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(meta)}">
<meta property="og:image" content="${SITO}/${og}">
${prezzo ? `<meta property="product:price:amount" content="${(prezzo / 100).toFixed(2)}">
<meta property="product:price:currency" content="EUR">
` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="stile.css">
${accento ? `<style>:root{--accento:${accento};--accento-chiaro:${chiaro(accento)}}</style>\n` : ''}${PM_MANCA}
</head>`;
}

/* ---------- pagina prodotto ---------- */
function paginaProdotto(id) {
  const p = C.prodotti[id], t = T[id];
  const url = `${SITO}/${p.pagina}`;
  const faq = [...t.faq, ...FAQ_COMUNI];
  const recensioni = t.recensioni ? `
<!-- ---------- recensioni ---------- -->
<section class="rec-sez" id="recensioni">
  <div class="wrap">
    <h2>Cosa ne pensano i clienti</h2>
    <div class="recensioni">
      <div>
        <div class="voto">4,9 <small>★★★★★</small></div>
        <div class="voto-sub">Su 100+ recensioni verificate</div>
        <div class="barra">5 ★ <i style="--w:85%"></i> 85</div>
        <div class="barra">4 ★ <i style="--w:12%"></i> 12</div>
        <div class="barra">3 ★ <i style="--w:3%"></i> 3</div>
      </div>
      <div>
        <div class="rec"><div class="st">★★★★★</div><p>«Morbidissima, non credevo che fosse così comoda. Mio figlio non la toglie nemmeno la notte.»</p><div class="chi">Francesca M. · verificato</div></div>
        <div class="rec"><div class="st">★★★★★</div><p>«Perfetto come regalo. Tutti ridevano, poi se l'è messa e non l'ha più tolta per tutta la sera.»</p><div class="chi">Marco R. · verificato</div></div>
        <div class="rec"><div class="st">★★★★★</div><p>«Non graffia, non pizzica, il tessuto di qualità si vede. Consigliata, davvero.»</p><div class="chi">Elena T. · verificato</div></div>
      </div>
    </div>
  </div>
</section>
` : '';

  return `${head({ titolo: t.titolo, meta: t.meta, url, og: t.og || p.foto[0], emoji: p.emoji, accento: p.accento, tipo: 'product', prezzo: p.prezzo })}
<body data-prodotto="${id}">

${TOPBAR}

<header><a class="nav-home" href="index.html">← Pigiami</a><a href="index.html"><img src="img/logo.png" alt="PijamaMania"></a></header>

<div class="wrap">
  <section class="hero">

    <div class="gallery">
      <div class="shot principale" id="principale">
        <img id="fotoMain" src="${p.foto[0]}" alt="${esc(p.nome)}" onerror="pmManca(this)">
      </div>
      <div class="dots" id="dots"></div>
      <div class="thumbs" id="thumbs"></div>
    </div>

    <div class="info">
      <span class="badge">${t.badge}</span>
      <h1>${esc(p.nome)}</h1>
      ${t.stelle ? '<a class="stelle" href="#recensioni"><b>★★★★★</b> 4,9 · <u>100+ recensioni</u></a>' : `<div class="prezzo-top">${fmt(p.prezzo)}<small>spedizione gratuita</small></div>`}
      <p class="sub">${t.sub}</p>

      <div class="chips">
        ${t.chips.map(c => `<div class="chip">${c}</div>`).join('\n        ')}
      </div>

      <div class="etichetta">SCEGLI L'OFFERTA</div>
      <div class="offerte" id="offerte"></div>

      <div class="etichetta">SCEGLI ${p.opzioni.length > 1 ? 'LE OPZIONI' : 'LA TAGLIA'} <a href="#taglie-tabella">Guida alle taglie</a></div>
      <div id="pezzi"></div>

      <div class="natale" id="natale" hidden>🎄 <span>Ordina entro <b id="natale-data"></b> per riceverlo prima di Natale</span></div>

      <button class="cta" id="compra" type="button">Aggiungi al carrello</button>

      <div class="fiducia">
        <div><b>🚚</b>Spedizione gratuita</div>
        <div><b>💬</b>Assistenza in italiano</div>
        <div><b>🔒</b>Pagamento sicuro</div>
      </div>
      <div class="pagamenti"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>G Pay</span></div>
    </div>

  </section>
</div>

<!-- ---------- descrizione ---------- -->
<section class="desc">
  <div class="wrap">
${t.blocchi.map(([img, pos, h, testo], i) => `    <div class="blocco${i % 2 ? ' inv' : ''}">
      <div class="media"><img src="${img}"${pos ? ` style="object-position:${pos}"` : ''} alt="${esc(h)}" loading="lazy" onerror="pmManca(this)"></div>
      <div>
        <h3>${h}</h3>
        <p>${testo}</p>
      </div>
    </div>`).join('\n')}
  </div>
</section>

<!-- ---------- taglie ---------- -->
<section class="wrap" id="taglie-tabella">
  <h2>Guida alle taglie</h2>
  <table class="tabella">
    <thead><tr>${t.tabella.col.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>
${t.tabella.righe.map(r => `      <tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
  <p class="nota-taglie">${t.notaTaglie}</p>
</section>
${recensioni}
<!-- ---------- altri pigiami: spinge il bundle ---------- -->
<section class="altri">
  <div class="wrap">
    <h2>Completa il bundle: 2 pezzi -${S2}%, 3 o più -${S3}%</h2>
    <div class="griglia">
      ${C.ordine.filter(x => x !== id).map(x => card(x)).join('\n      ')}
    </div>
  </div>
</section>

<!-- ---------- faq ---------- -->
<section class="wrap">
  <h2>Domande frequenti</h2>
${faq.map(([q, a], i) => `  <details${i ? '' : ' open'}><summary>${q}</summary><p>${a}</p></details>`).join('\n')}
</section>

${FOOTER}

<div class="sticky" id="sticky">
  <div class="p" id="prezzoSticky">${fmt(p.prezzo)}<small>1 ${p.unita[0]}</small></div>
  <button class="cta" id="compra2" type="button">Aggiungi al carrello</button>
</div>

<script src="catalogo.js"></script>
<script src="carrello.js"></script>
<script src="pagina-prodotto.js"></script>
${ANALYTICS}
</body>
</html>
`;
}

/* ---------- homepage / catalogo ---------- */
function homepage() {
  const min = Math.min(...C.ordine.map(id => C.prodotti[id].prezzo));
  const etichette = { squalo: 'BEST SELLER', anatra: 'NOVITÀ', stranger: 'NOVITÀ', stitch: 'PREZZO TOP', sdentato: 'NOVITÀ' };
  return `${head({ titolo: 'PijamaMania — Pigiami e coperte indossabili che fanno ridere tutta la casa', meta: `Coperta squalo, pigiama anatra, Stranger Things, Stitch e Dragon Trainer. Pile morbidissimo, spedizione gratuita in Italia, 2 pezzi -${S2}% e 3 o più -${S3}%.`, url: SITO + '/', og: 'img/anteprima.jpg', emoji: '🦈', tipo: 'website' })}
<body>

${TOPBAR}

<header><a href="index.html"><img src="img/logo.png" alt="PijamaMania"></a></header>

<section class="home-hero">
  <div class="wrap">
    <h1>Pigiami che fanno ridere tutta la casa</h1>
    <p>Squali, anatre, draghi e mostri del Sottosopra: pile morbidissimo, taglie per tutta la famiglia e spedizione gratuita. Mettine più di uno nel carrello e risparmi su tutto.</p>
    <a class="cta" href="#pigiami">Scegli il tuo pigiama</a>
    <div class="bundle-box">
      <div><b>${fmt(min).replace(' €', '€')}</b>a partire da</div>
      <div><b>-${S2}%</b>con 2 pezzi</div>
      <div><b>-${S3}%</b>con 3 o più</div>
    </div>
  </div>
</section>

<section class="wrap" id="pigiami">
  <h2>Tutti i pigiami</h2>
  <div class="griglia cinque">
    ${C.ordine.map(id => card(id, etichette[id])).join('\n    ')}
  </div>
</section>

<section class="altri">
  <div class="wrap">
    <h2>Come funziona il bundle</h2>
    <div class="vantaggi">
      <div><span class="em">🛒</span><b>Mischia come vuoi</b>Squalo per te, Stitch per tua sorella, anatra per il coinquilino: lo sconto vale su tutto il carrello.</div>
      <div><span class="em">🎁</span><b>2 pezzi -${S2}%, 3+ -${S3}%</b>Lo sconto si applica da solo nel carrello, senza codici.</div>
      <div><span class="em">🚚</span><b>Spedizione gratuita</b>In tutta Italia, con codice di tracciamento via email.</div>
      <div><span class="em">💬</span><b>Assistenza in italiano</b>Scrivici a pijamamania.it@gmail.com, ti risponde una persona vera.</div>
    </div>
  </div>
</section>

<section class="wrap">
  <h2>Domande frequenti</h2>
${FAQ_COMUNI.map(([q, a], i) => `  <details${i ? '' : ' open'}><summary>${q}</summary><p>${a}</p></details>`).join('\n')}
  <details><summary>Come scelgo la taglia?</summary><p>Ogni pigiama ha la sua guida alle taglie nella pagina prodotto: per i pigiami si sceglie in base all'altezza, per la coperta squalo in base all'età.</p></details>
</section>

${FOOTER}

<script src="catalogo.js"></script>
<script src="carrello.js"></script>
${ANALYTICS}
</body>
</html>
`;
}

/* ---------- scrittura file ---------- */
const scritti = [];
for (const id of C.ordine) {
  const f = C.prodotti[id].pagina;
  fs.writeFileSync(path.join(RADICE, f), paginaProdotto(id));
  scritti.push(f);
}
fs.writeFileSync(path.join(RADICE, 'index.html'), homepage());
scritti.push('index.html');
console.log('Pagine generate:\n  ' + scritti.join('\n  '));
