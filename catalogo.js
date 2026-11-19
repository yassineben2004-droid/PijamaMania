/* ============================================================
   CATALOGO PIJAMAMANIA — unica fonte di verità
   Lo usa il SERVER (api/create-payment-intent.js) per calcolare
   quanto paga davvero il cliente, e il SITO per mostrare i prezzi.
   Prezzi in CENTESIMI (3990 = 39,90 €).

   Per cambiare un prezzo: modifica qui, poi `node strumenti/genera-pagine.js`
   per rigenerare le pagine prodotto. Fine.
   ============================================================ */
(function (root) {

const CATALOGO = {

  // sconto bundle sul totale del carrello, in base a QUANTI pezzi ci sono
  // (qualsiasi combinazione di prodotti). La chiave più alta vale "o più".
  sconti: { 2: 10, 3: 15 },        // 2 pezzi -10%, 3 o più -15%
  maxPezzi: 10,                      // pezzi massimi per ordine

  ordine: ['squalo', 'anatra', 'stranger', 'stitch', 'sdentato'],

  prodotti: {

    squalo: {
      nome: 'Coperta Squalo Indossabile',
      breve: 'Coperta Squalo',
      pagina: 'coperta-squalo.html',
      prezzo: 3990,
      emoji: '🦈',
      accento: '#3b8fd6',
      unita: ['coperta', 'coperte'],
      foto: [1, 2, 3, 4, 5, 6].map(n => 'img/squalo-' + n + '.jpg'),
      opzioni: [
        { id: 'taglia', nome: 'Taglia', valori: [
          { id: 'baby',   nome: 'Bimbo',   sub: '2-5 anni' },
          { id: 'junior', nome: 'Bambino', sub: '6-10 anni' },
          { id: 'teen',   nome: 'Ragazzo', sub: '11-15 anni' },
          { id: 'mega',   nome: 'Adulto',  sub: '16+ anni' }
        ], predef: 'mega' }
      ]
    },

    anatra: {
      nome: 'Pigiama Anatra',
      breve: 'Pigiama Anatra',
      pagina: 'pigiama-anatra.html',
      prezzo: 4490,
      emoji: '🦆',
      accento: '#e8a400',
      unita: ['pigiama', 'pigiami'],
      foto: [1, 2, 3, 4, 5, 6].map(n => 'img/anatra-' + n + '.jpg'),
      opzioni: [
        { id: 'colore', nome: 'Colore', valori: [
          { id: 'bianco', nome: 'Bianco' },
          { id: 'nero',   nome: 'Nero' }
        ], predef: 'bianco' },
        { id: 'taglia', nome: 'Taglia', valori: [
          { id: 'S',   nome: 'S',   sub: 'fino a 152 cm' },
          { id: 'M',   nome: 'M',   sub: '152-160 cm' },
          { id: 'L',   nome: 'L',   sub: '160-165 cm' },
          { id: 'XL',  nome: 'XL',  sub: '165-172 cm' },
          { id: 'XXL', nome: 'XXL', sub: '172-185 cm' }
        ], predef: 'L' },
        // ⚠️ taglie ciabatte PROVVISORIE: da confermare col fornitore
        { id: 'ciabatte', nome: 'Ciabatte anatra abbinate', valori: [
          { id: 'no',    nome: 'No grazie', sub: 'solo pigiama' },
          { id: '36-38', nome: '36-38', sub: '+5,00 €', piu: 500 },
          { id: '39-41', nome: '39-41', sub: '+5,00 €', piu: 500 },
          { id: '42-44', nome: '42-44', sub: '+5,00 €', piu: 500 }
        ], predef: 'no' }
      ]
    },

    stranger: {
      nome: 'Pigiama Stranger Things Demogorgone',
      breve: 'Pigiama Demogorgone',
      pagina: 'pigiama-stranger-things.html',
      prezzo: 4490,
      emoji: '👹',
      accento: '#c8102e',
      unita: ['pigiama', 'pigiami'],
      foto: [1, 2, 3, 4, 5].map(n => 'img/stranger-' + n + '.jpg'),
      opzioni: [
        { id: 'taglia', nome: 'Taglia', valori: [
          { id: 'KS',  nome: 'Bimbo S',  sub: '110-120 cm' },
          { id: 'KM',  nome: 'Bimbo M',  sub: '120-130 cm' },
          { id: 'KL',  nome: 'Bimbo L',  sub: '130-140 cm' },
          { id: 'KXL', nome: 'Bimbo XL', sub: '140-155 cm' },
          { id: 'S',   nome: 'Adulto S', sub: '156-170 cm' },
          { id: 'M',   nome: 'Adulto M', sub: '170-180 cm' },
          { id: 'L',   nome: 'Adulto L', sub: '180-190 cm' }
        ], predef: 'M' }
      ]
    },

    stitch: {
      nome: 'Pigiama Stitch',
      breve: 'Pigiama Stitch',
      pagina: 'pigiama-stitch.html',
      prezzo: 2990,
      emoji: '💙',
      accento: '#2f7fd8',
      unita: ['pigiama', 'pigiami'],
      foto: [1, 2, 3, 4, 5].map(n => 'img/stitch-' + n + '.jpg'),
      opzioni: [
        { id: 'taglia', nome: 'Taglia', valori: [
          { id: 'S',   nome: 'S',   sub: '145-155 cm' },
          { id: 'M',   nome: 'M',   sub: '155-165 cm' },
          { id: 'L',   nome: 'L',   sub: '165-175 cm' },
          { id: 'XL',  nome: 'XL',  sub: '175-185 cm' },
          { id: 'XXL', nome: 'XXL', sub: '185-195 cm' }
        ], predef: 'L' }
      ]
    },

    sdentato: {
      nome: 'Pigiama Dragon Trainer',
      breve: 'Pigiama Dragon Trainer',
      pagina: 'pigiama-dragon-trainer.html',
      prezzo: 4490,
      emoji: '🐉',
      accento: '#5c9a3c',
      unita: ['pigiama', 'pigiami'],
      foto: [1, 2, 3, 4, 5, 6].map(n => 'img/sdentato-' + n + '.jpg'),
      opzioni: [
        { id: 'colore', nome: 'Colore', valori: [
          { id: 'nero',   nome: 'Nero',   sub: 'Sdentato' },
          { id: 'bianco', nome: 'Bianco', sub: 'Furia Chiara' }
        ], predef: 'nero' },
        { id: 'taglia', nome: 'Taglia', valori: [
          { id: 'S',   nome: 'S',   sub: '145-155 cm' },
          { id: 'M',   nome: 'M',   sub: '155-165 cm' },
          { id: 'L',   nome: 'L',   sub: '165-175 cm' },
          { id: 'XL',  nome: 'XL',  sub: '175-185 cm' },
          { id: 'XXL', nome: 'XXL', sub: '185-195 cm' }
        ], predef: 'L' }
      ]
    }
  }
};

/* ---------- funzioni comuni (uguali per sito e server) ---------- */

// percentuale di sconto per N pezzi
CATALOGO.scontoPer = function (n) {
  let pct = 0;
  Object.keys(CATALOGO.sconti).map(Number).sort((a, b) => a - b)
    .forEach(k => { if (n >= k) pct = CATALOGO.sconti[k]; });
  return pct;
};

// controlla un articolo {p, colore, taglia, ...} e ne restituisce prezzo e descrizione.
// Restituisce null se qualcosa non torna (prodotto o opzione inesistente).
CATALOGO.valuta = function (art) {
  const prod = art && CATALOGO.prodotti[art.p];
  if (!prod) return null;
  let prezzo = prod.prezzo;
  const parti = [];
  const scelte = {};
  for (const o of prod.opzioni) {
    const v = o.valori.find(x => x.id === String(art[o.id] == null ? o.predef : art[o.id]));
    if (!v) return null;
    scelte[o.id] = v.id;
    prezzo += v.piu || 0;
    if (o.id === 'ciabatte') { if (v.id !== 'no') parti.push('+ ciabatte ' + v.nome); }
    else if (o.id === 'taglia') parti.push('taglia ' + v.nome);
    else parti.push(v.nome.toLowerCase());
  }
  return { p: art.p, scelte, prezzo, nome: prod.nome, breve: prod.breve, dettagli: parti.join(', ') };
};

// totale di un carrello: [{p, ...opzioni}, ...]
CATALOGO.totale = function (articoli) {
  const righe = articoli.map(CATALOGO.valuta);
  if (righe.some(r => !r)) return null;
  const pieno = righe.reduce((s, r) => s + r.prezzo, 0);
  const pct = CATALOGO.scontoPer(righe.length);
  const importo = Math.round(pieno * (100 - pct) / 100);
  return { righe, pieno, pct, importo, sconto: pieno - importo };
};

if (typeof module !== 'undefined' && module.exports) module.exports = CATALOGO;
else root.CATALOGO = CATALOGO;

})(typeof window !== 'undefined' ? window : this);
