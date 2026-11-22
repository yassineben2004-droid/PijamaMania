/* Logica comune delle pagine prodotto (offerte 1/2/3, opzioni, galleria, carrello).
   Il prodotto lo dice <body data-prodotto="...">. I prezzi arrivano da catalogo.js. */
(function () {
const C = window.CATALOGO;
const ID = document.body.dataset.prodotto;
const P = C.prodotti[ID];
const fmt = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
const [uno, tanti] = P.unita;

const prezzoN = n => Math.round(P.prezzo * n * (100 - C.scontoPer(n)) / 100);
const OFFERTE = [
  { n: 1, titolo: '1 ' + uno,   sotto: 'Per te' },
  { n: 2, titolo: '2 ' + tanti, sotto: 'Una per te, una da regalare · opzioni a scelta', tag: 'LA PIÙ SCELTA' },
  { n: 3, titolo: '3 ' + tanti, sotto: 'Family pack · opzioni a scelta', tag: 'FAMILY PACK', blu: true }
];

let off = OFFERTE[0];
const predef = () => Object.fromEntries(P.opzioni.map(o => [o.id, o.predef]));
let scelte = [predef(), predef(), predef()];

/* ---------- offerte ---------- */
const boxOff = document.getElementById('offerte');
boxOff.innerHTML = OFFERTE.map((o, i) => {
  const prezzo = prezzoN(o.n), risp = P.prezzo * o.n - prezzo;
  return `<button type="button" class="offerta${i ? '' : ' on'}" data-i="${i}">
    ${o.tag ? `<span class="tag${o.blu ? ' blu' : ''}">${o.tag}</span>` : ''}
    <span class="radio"></span>
    <span class="cosa">
      <span class="t">${o.titolo}</span>
      <span class="s" style="display:block">${o.sotto}</span>
      ${risp > 0 ? `<span class="risp">-${C.scontoPer(o.n)}% · risparmi ${fmt(risp)}</span>` : ''}
    </span>
    <span class="prezzi">
      <span class="p" style="display:block">${fmt(prezzo)}</span>
      ${o.n > 1 ? `<span class="cad">${fmt(prezzo / o.n)} cad.</span>` : '<span class="cad">Spedizione gratuita</span>'}
    </span>
  </button>`;
}).join('');

/* ---------- opzioni di ogni pezzo ---------- */
function disegnaPezzi() {
  document.getElementById('pezzi').innerHTML = Array.from({ length: off.n }, (_, k) => `
    <div class="pezzo">
      ${off.n > 1 ? `<div class="n">${uno.charAt(0).toUpperCase() + uno.slice(1)} ${k + 1}</div>` : ''}
      ${P.opzioni.map(o => `
        <div class="opz">
          ${P.opzioni.length > 1 || off.n > 1 ? `<div class="l">${o.nome}</div>` : ''}
          <div class="pillole">
            ${o.valori.map(v => `<button type="button" class="pill${scelte[k][o.id] === v.id ? ' on' : ''}" data-k="${k}" data-o="${o.id}" data-v="${v.id}"><b>${v.nome}</b>${v.sub ? `<span>${v.sub}</span>` : ''}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function totaleScelto() {
  return C.totale(scelte.slice(0, off.n).map(s => ({ p: ID, ...s })));
}

function aggiorna() {
  document.querySelectorAll('.offerta').forEach((b, i) => b.classList.toggle('on', OFFERTE[i] === off));
  disegnaPezzi();
  const t = totaleScelto();
  document.getElementById('compra').textContent = 'Aggiungi al carrello — ' + fmt(t.importo);
  document.getElementById('prezzoSticky').innerHTML = fmt(t.importo) + '<small>' + off.titolo + '</small>';
}

boxOff.addEventListener('click', e => {
  const b = e.target.closest('.offerta'); if (!b) return;
  off = OFFERTE[+b.dataset.i]; aggiorna();
});
document.getElementById('pezzi').addEventListener('click', e => {
  const b = e.target.closest('.pill'); if (!b) return;
  scelte[+b.dataset.k][b.dataset.o] = b.dataset.v; aggiorna();
});

function compra() {
  const pezzi = scelte.slice(0, off.n).map(s => ({ p: ID, ...s }));
  const messi = Carrello.aggiungi(pezzi);
  if (messi < pezzi.length) alertCarrelloPieno();
  Carrello.apri();
  if (messi) PM.track('add_to_cart', pezzi.slice(0, messi));
}
function alertCarrelloPieno() {
  const box = document.getElementById('cartCorpo');
  setTimeout(() => box && box.insertAdjacentHTML('afterbegin',
    `<div class="cart-bundle">Puoi mettere al massimo ${C.maxPezzi} pezzi per ordine. Per ordini più grandi scrivici a pijamamania.it@gmail.com</div>`), 30);
}
document.getElementById('compra').onclick = compra;
document.getElementById('compra2').onclick = compra;

const sticky = document.getElementById('sticky');
new IntersectionObserver(([e]) => sticky.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0),
  { rootMargin: '-60px 0px 0px 0px' }).observe(document.getElementById('compra'));

aggiorna();
PM.track('view_item', [{ p: ID }]);   // visita della pagina prodotto

/* ---------- Natale: 2 giorni di preparazione + 12 di consegna (caso peggiore) entro il 23/12 ---------- */
(function () {
  const scadenza = new Date(2026, 11, 2, 23, 59);          // 2 dicembre 2026
  const oggi = new Date();
  if (oggi <= scadenza && oggi >= new Date(2026, 9, 15)) {
    document.getElementById('natale-data').textContent = 'mercoledì 2 dicembre';
    document.getElementById('natale').hidden = false;
  }
})();

/* ---------- galleria: tocca una miniatura o scorri la foto ---------- */
(function () {
  const foto = P.foto;
  const main = document.getElementById('fotoMain');
  const tb = document.getElementById('thumbs');
  tb.innerHTML = foto.map((f, i) => `<button type="button" class="shot${i ? '' : ' on'}" data-i="${i}" aria-label="Foto ${i + 1}"><img src="${f}" alt="" loading="lazy" onerror="pmManca(this)"></button>`).join('');
  const thumbs = [...tb.children];
  const dots = document.getElementById('dots');
  dots.innerHTML = foto.map((_, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('');
  let cur = 0;
  function mostra(i) {
    cur = (i + foto.length) % foto.length;
    const box = document.getElementById('principale');
    const vecchio = box.querySelector('.manca'); if (vecchio) vecchio.remove();
    const img = box.querySelector('img') || (() => { const n = document.createElement('img'); n.id = 'fotoMain'; box.appendChild(n); return n; })();
    img.style.display = ''; delete img.dataset.m;
    img.onerror = () => pmManca(img);
    img.style.opacity = .35;
    const nuova = new Image();
    nuova.onload = () => { img.src = foto[cur]; img.style.opacity = 1; };
    nuova.onerror = () => { img.src = foto[cur]; img.style.opacity = 1; };
    nuova.src = foto[cur];
    thumbs.forEach((t, k) => t.classList.toggle('on', k === cur));
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === cur));
  }
  thumbs.forEach(t => t.addEventListener('click', () => mostra(+t.dataset.i)));
  let x0 = null;
  const box = document.getElementById('principale');
  box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) mostra(cur + (dx < 0 ? 1 : -1));
  });
  foto.slice(1).forEach(src => { const im = new Image(); im.src = src; });
})();
})();
