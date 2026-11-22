/* ============================================================
   CARRELLO PIJAMAMANIA
   Salvato nel browser del cliente (localStorage). I prezzi mostrati
   qui sono solo indicativi: quelli veri li calcola il server.
   Serve catalogo.js caricato prima.
   ============================================================ */
(function () {
const C = window.CATALOGO;
const CHIAVE = 'pm_carrello_v1';
const fmt = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let memoria = [];   // se localStorage non è disponibile (navigazione privata su alcuni browser)

function leggi() {
  try {
    const a = JSON.parse(localStorage.getItem(CHIAVE) || '[]');
    return Array.isArray(a) ? a.filter(x => C.valuta(x)) : [];
  } catch (e) { return memoria.slice(); }
}
function salva(a) {
  memoria = a.slice();
  try { localStorage.setItem(CHIAVE, JSON.stringify(a)); } catch (e) {}
  aggiornaBadge();
  try { window.dispatchEvent(new Event('pm-carrello')); } catch (e) {}
}

/* ---------- stile del pannello ---------- */
const css = `
.cart-btn{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer;padding:6px 8px;line-height:1}
.cart-btn .n{position:absolute;top:-2px;right:-3px;min-width:19px;height:19px;border-radius:10px;background:#ff6a3d;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
.cart-btn .n[hidden]{display:none}
.cart-velo{position:fixed;inset:0;background:rgba(11,31,61,.45);z-index:90;opacity:0;pointer-events:none;transition:.2s}
.cart-velo.on{opacity:1;pointer-events:auto}
.cart-pan{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);background:#fbf7f1;z-index:91;transform:translateX(105%);transition:.25s;display:flex;flex-direction:column;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#17243a}
.cart-pan.on{transform:none;box-shadow:-10px 0 40px rgba(11,31,61,.18)}
.cart-testa{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;background:#0b1f3d;color:#fff}
.cart-testa b{font-size:16px;letter-spacing:.2px}
.cart-testa button{background:none;border:0;color:#fff;font-size:26px;cursor:pointer;line-height:1}
.cart-corpo{flex:1;overflow:auto;padding:14px 16px}
.cart-bundle{background:#fff4ec;border:1px solid #ffd9c6;color:#7a3416;border-radius:12px;padding:11px 13px;font-size:13.5px;margin-bottom:12px;line-height:1.4}
.cart-bundle.ok{background:#e6f6ee;border-color:#bfe6d2;color:#145c3f}
.cart-riga{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #e7dfd2;border-radius:13px;padding:10px;margin-bottom:9px}
.cart-riga .mini{width:58px;height:58px;flex:0 0 58px;border-radius:10px;overflow:hidden;background:#f3ece1;display:flex;align-items:center;justify-content:center;font-size:24px}
.cart-riga .mini img{width:100%;height:100%;object-fit:cover}
.cart-riga .cosa{flex:1;min-width:0}
.cart-riga .nm{font-weight:800;font-size:14px;color:#0b1f3d}
.cart-riga .dt{font-size:12.5px;color:#5e6b80;margin-top:1px}
.cart-riga .pr{font-weight:800;font-size:14px;white-space:nowrap}
.cart-riga .via{background:none;border:0;color:#9aa5b5;font-size:20px;cursor:pointer;padding:2px 4px;line-height:1}
.cart-vuoto{text-align:center;color:#5e6b80;padding:30px 10px;font-size:15px}
.cart-sugg h4{font-size:12px;letter-spacing:.8px;color:#5e6b80;margin:18px 0 9px}
.cart-sugg .lista{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.cart-sugg a{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid #e7dfd2;border-radius:11px;padding:8px;text-decoration:none;color:#0b1f3d;font-size:12.5px;font-weight:700;line-height:1.25}
.cart-sugg a .mini{width:38px;height:38px;flex:0 0 38px;border-radius:8px;overflow:hidden;background:#f3ece1;display:flex;align-items:center;justify-content:center;font-size:18px}
.cart-sugg a .mini img{width:100%;height:100%;object-fit:cover}
.cart-sugg a small{display:block;font-weight:600;color:#5e6b80}
.cart-piede{border-top:1px solid #e7dfd2;background:#fff;padding:14px 18px calc(14px + env(safe-area-inset-bottom))}
.cart-t{display:flex;justify-content:space-between;font-size:14px;color:#5e6b80;margin-bottom:6px}
.cart-t.sc span:last-child{color:#1f9d6b;font-weight:700}
.cart-t.fin{font-size:18px;font-weight:800;color:#0b1f3d;margin:8px 0 12px}
.cart-vai{display:block;width:100%;background:#ff6a3d;color:#fff;border:0;border-radius:13px;padding:17px;font-size:16px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;font-family:inherit}
.cart-vai[aria-disabled=true]{opacity:.5;pointer-events:none}
.cart-nota{font-size:11.5px;color:#5e6b80;text-align:center;margin-top:8px}
`;

function monta() {
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const velo = document.createElement('div'); velo.className = 'cart-velo'; velo.id = 'cartVelo';
  const pan = document.createElement('aside'); pan.className = 'cart-pan'; pan.id = 'cartPan';
  pan.setAttribute('aria-label', 'Carrello');
  pan.innerHTML = `
    <div class="cart-testa"><b>Il tuo carrello</b><button type="button" aria-label="Chiudi" id="cartChiudi">×</button></div>
    <div class="cart-corpo" id="cartCorpo"></div>
    <div class="cart-piede" id="cartPiede"></div>`;
  document.body.appendChild(velo); document.body.appendChild(pan);
  velo.onclick = chiudi;
  pan.querySelector('#cartChiudi').onclick = chiudi;
  pan.addEventListener('click', e => {
    const b = e.target.closest('[data-via]'); if (!b) return;
    const a = leggi(); const tolto = a.splice(+b.dataset.via, 1); salva(a); disegna();
    if (window.PM && tolto.length) PM.track('remove_from_cart', tolto);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudi(); });

  // bottone carrello nell'header
  const h = document.querySelector('header');
  if (h && !document.body.hasAttribute('data-no-cart')) {
    h.style.position = h.style.position || 'sticky';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cart-btn'; b.setAttribute('aria-label', 'Apri il carrello');
    b.innerHTML = '🛒<span class="n" id="cartN" hidden>0</span>';
    b.onclick = apri;
    h.appendChild(b);
  }
  aggiornaBadge();
}

function aggiornaBadge() {
  const n = document.getElementById('cartN'); if (!n) return;
  const q = leggi().length;
  n.textContent = q; n.hidden = q === 0;
}

function messaggioBundle(q) {
  const soglie = Object.keys(C.sconti).map(Number).sort((a, b) => a - b);
  const prossima = soglie.find(s => s > q);
  const attuale = C.scontoPer(q);
  if (prossima) {
    const manca = prossima - q;
    return `<div class="cart-bundle">🎁 Aggiungi <b>${manca} ${manca === 1 ? 'altro pezzo' : 'altri pezzi'}</b> (anche diversi) e hai <b>-${C.sconti[prossima]}% su tutto</b>${attuale ? ` invece del ${attuale}%` : ''}.</div>`;
  }
  return `<div class="cart-bundle ok">✅ Sconto bundle massimo sbloccato: <b>-${attuale}% su tutto il carrello</b>.</div>`;
}

function miniFoto(prod) {
  return `<img src="${prod.foto[0]}" alt="" onerror="this.remove()">${prod.emoji}`;
}

function disegna() {
  const a = leggi();
  const corpo = document.getElementById('cartCorpo');
  const piede = document.getElementById('cartPiede');
  const tot = C.totale(a);
  if (!a.length) {
    corpo.innerHTML = `<div class="cart-vuoto">Il carrello è vuoto.<br>Scegli il tuo pigiama 👇</div>` + suggerimenti([]);
    piede.innerHTML = `<a class="cart-vai" aria-disabled="true">Vai al pagamento</a>`;
    return;
  }
  corpo.innerHTML = messaggioBundle(a.length) + tot.righe.map((r, i) => {
    const prod = C.prodotti[r.p];
    return `<div class="cart-riga">
      <div class="mini">${miniFoto(prod)}</div>
      <div class="cosa"><div class="nm">${esc(prod.breve)}</div><div class="dt">${esc(r.dettagli)}</div></div>
      <div class="pr">${fmt(r.prezzo)}</div>
      <button type="button" class="via" data-via="${i}" aria-label="Rimuovi">×</button>
    </div>`;
  }).join('') + suggerimenti(a.map(x => x.p));
  piede.innerHTML = `
    <div class="cart-t"><span>Subtotale</span><span>${fmt(tot.pieno)}</span></div>
    ${tot.sconto ? `<div class="cart-t sc"><span>Sconto bundle -${tot.pct}%</span><span>− ${fmt(tot.sconto)}</span></div>` : ''}
    <div class="cart-t"><span>Spedizione</span><span style="color:#1f9d6b;font-weight:700">Gratuita</span></div>
    <div class="cart-t fin"><span>Totale</span><span>${fmt(tot.importo)}</span></div>
    <a class="cart-vai" href="checkout.html">Vai al pagamento →</a>
    <div class="cart-nota">🔒 Pagamento sicuro · carta, Apple Pay, Google Pay</div>`;
}

function suggerimenti(presenti) {
  const altri = C.ordine.filter(id => !presenti.includes(id)).slice(0, 4);
  if (!altri.length) return '';
  return `<div class="cart-sugg"><h4>${presenti.length ? 'COMPLETA IL BUNDLE' : 'I NOSTRI PIGIAMI'}</h4><div class="lista">` +
    altri.map(id => { const p = C.prodotti[id];
      return `<a href="${p.pagina}"><span class="mini">${miniFoto(p)}</span><span>${esc(p.breve)}<small>${fmt(p.prezzo)}</small></span></a>`; }).join('') +
    `</div></div>`;
}

function apri() { if (window.PM) PM.track('view_cart', leggi()); disegna(); document.getElementById('cartVelo').classList.add('on'); document.getElementById('cartPan').classList.add('on'); }
function chiudi() { document.getElementById('cartVelo').classList.remove('on'); document.getElementById('cartPan').classList.remove('on'); }

function aggiungi(articoli) {
  const a = leggi();
  let messi = 0;
  for (const x of articoli) { if (a.length >= C.maxPezzi) break; if (C.valuta(x)) { a.push(x); messi++; } }
  salva(a);
  return messi;
}

window.Carrello = { leggi, salva, aggiungi, apri, chiudi, svuota: () => salva([]), fmt };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
})();
