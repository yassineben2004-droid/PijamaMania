/* ============================================================
   TRACCIAMENTO PIJAMAMANIA
   Un unico punto per misurare il sito. Le pagine chiamano solo
   PM.track('evento', articoli) e qui si decide dove mandarlo.

   Eventi (nomi standard GA4):
     view_item        apre la pagina di un prodotto
     add_to_cart      "Aggiungi al carrello"
     remove_from_cart toglie un pezzo dal carrello
     view_cart        apre il pannello carrello
     begin_checkout   arriva sulla pagina di pagamento
     add_payment_info clicca "Paga"
     purchase         arriva su grazie.html con pagamento riuscito

   Dove vanno:
     1) Vercel Web Analytics  → sempre, senza cookie (visitatori per pagina,
        sorgenti, paesi; gli eventi personalizzati richiedono Vercel Pro)
     2) Google Analytics 4    → solo se GA4_ID è compilato E il cliente accetta
     3) Meta Pixel            → solo se META_PIXEL_ID è compilato E il cliente accetta

   Se i due ID sono vuoti non parte nessun cookie e non compare nessun banner.
   Serve catalogo.js caricato prima.
   ============================================================ */
(function () {

/* ⚠️ COMPILA QUESTI DUE CAMPI (sono ID pubblici, possono stare nel codice).
   GA4_ID:        analytics.google.com → Amministrazione → Flussi di dati → ID misurazione (G-XXXXXXXXXX)
   META_PIXEL_ID: Meta Business → Gestione eventi → Pixel → ID del set di dati (15-16 cifre) */
const CONFIG = {
  GA4_ID: '',
  META_PIXEL_ID: ''
};

const C = window.CATALOGO;
const VALUTA = 'EUR';
const CHIAVE_CONSENSO = 'pm_consenso_v1';   // 'si' | 'no'
const attivo = !!(CONFIG.GA4_ID || CONFIG.META_PIXEL_ID);

/* ---------- consenso (salvato nel browser) ---------- */
let consensoMemoria = null;
function leggiConsenso() {
  try { return localStorage.getItem(CHIAVE_CONSENSO) || consensoMemoria; } catch (e) { return consensoMemoria; }
}
function salvaConsenso(v) {
  consensoMemoria = v;
  try { localStorage.setItem(CHIAVE_CONSENSO, v); } catch (e) {}
}

/* ---------- da articoli del carrello a "items" ---------- */
function items(articoli) {
  const tot = C && C.totale(articoli || []);
  if (!tot) return { items: [], valore: 0 };
  return {
    items: tot.righe.map(r => ({
      item_id: r.p, item_name: r.nome, item_variant: r.dettagli,
      item_category: 'Pigiami', price: r.prezzo / 100, quantity: 1
    })),
    valore: tot.importo / 100        // già con lo sconto bundle
  };
}

/* ---------- Vercel Web Analytics (senza cookie) ---------- */
const NOMI_VA = {
  view_item: 'visualizza_prodotto', add_to_cart: 'aggiungi_carrello', remove_from_cart: 'rimuovi_carrello',
  view_cart: 'apri_carrello', begin_checkout: 'inizio_checkout', add_payment_info: 'clic_paga', purchase: 'acquisto'
};
function inviaVercel(evento, d) {
  try {
    if (!window.va || !NOMI_VA[evento]) return;
    window.va('event', { name: NOMI_VA[evento], data: {
      prodotto: d.items.map(i => i.item_id).join(','),
      pezzi: d.items.length,
      valore: d.valore
    } });
  } catch (e) {}
}

/* ---------- Google Analytics 4 e Meta Pixel (solo con consenso) ---------- */
let caricati = false;
const coda = [];     // eventi di questa pagina, rimandati quando arriva il consenso

function caricaTerzi() {
  if (caricati) return; caricati = true;
  if (CONFIG.GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.GA4_ID);
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.GA4_ID);
    document.head.appendChild(s);
  }
  if (CONFIG.META_PIXEL_ID) {
    /* snippet standard Meta Pixel */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  coda.splice(0).forEach(x => inviaTerzi(x.evento, x.d, x.extra));
}

const MAPPA_META = {
  view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout',
  add_payment_info: 'AddPaymentInfo', purchase: 'Purchase'
};
function inviaTerzi(evento, d, extra) {
  extra = extra || {};
  try {
    if (CONFIG.GA4_ID && window.gtag) {
      const p = { currency: VALUTA, value: d.valore, items: d.items };
      if (evento === 'purchase') { p.transaction_id = extra.id; p.shipping = 0; }
      window.gtag('event', evento, p);
    }
    if (CONFIG.META_PIXEL_ID && window.fbq && MAPPA_META[evento]) {
      const p = { content_type: 'product', content_ids: d.items.map(i => i.item_id),
                  contents: d.items.map(i => ({ id: i.item_id, quantity: 1, item_price: i.price })),
                  num_items: d.items.length, value: d.valore, currency: VALUTA };
      // eventID = stesso id per browser e (in futuro) server, così Meta non conta doppio
      if (extra.id) window.fbq('track', MAPPA_META[evento], p, { eventID: extra.id });
      else window.fbq('track', MAPPA_META[evento], p);
    }
  } catch (e) {}
}

/* ---------- API pubblica ---------- */
// PM.track('add_to_cart', articoli, { valore: 44.9, id: 'pi_…' })
function track(evento, articoli, extra) {
  extra = extra || {};
  const d = items(articoli);
  if (extra.valore != null) d.valore = extra.valore;      // es. importo vero pagato
  inviaVercel(evento, d);
  if (!attivo) return;
  if (leggiConsenso() === 'si') { caricaTerzi(); inviaTerzi(evento, d, extra); }
  else if (leggiConsenso() === null) coda.push({ evento, d, extra });
}

// purchase una volta sola per ordine (se il cliente ricarica grazie.html non si conta due volte)
function acquisto(id, articoli, valore) {
  const k = 'pm_acq_' + id;
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) {}
  track('purchase', articoli, { id, valore });
}

/* ---------- banner consenso ---------- */
function banner() {
  if (document.getElementById('pmCookie')) return;
  const st = document.createElement('style');
  st.textContent = `#pmCookie{position:fixed;left:12px;right:12px;bottom:12px;z-index:120;max-width:560px;margin:0 auto;background:#fff;color:#17243a;border:1px solid #e7dfd2;border-radius:16px;box-shadow:0 12px 40px rgba(11,31,61,.22);padding:16px 18px;font:14px/1.5 'Helvetica Neue',Helvetica,Arial,sans-serif}
#pmCookie b{display:block;font-size:15px;margin-bottom:4px;color:#0b1f3d}
#pmCookie a{color:#0b1f3d}
#pmCookie .az{display:flex;gap:10px;margin-top:12px}
#pmCookie button{flex:1;border-radius:11px;padding:12px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;border:2px solid #0b1f3d;background:#fff;color:#0b1f3d}
#pmCookie button.si{background:#0b1f3d;color:#fff}`;
  document.head.appendChild(st);
  const b = document.createElement('div'); b.id = 'pmCookie'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookie');
  b.innerHTML = `<b>🍪 Ci aiuti a migliorare il sito?</b>
    Con il tuo consenso usiamo cookie di statistica e marketing (Google Analytics e Meta) per capire quali pagine funzionano e mostrarti pubblicità pertinente. Il sito funziona uguale anche se rifiuti. <a href="privacy.html#cookie">Dettagli</a>
    <div class="az"><button type="button" class="no">Rifiuta</button><button type="button" class="si">Accetta</button></div>`;
  document.body.appendChild(b);
  b.querySelector('.si').onclick = () => { salvaConsenso('si'); b.remove(); caricaTerzi(); };
  b.querySelector('.no').onclick = () => { salvaConsenso('no'); coda.length = 0; b.remove(); };
}

function riapriConsenso(e) { if (e) e.preventDefault(); const c = document.getElementById('pmCookie'); if (c) c.remove(); banner(); }

function avvia() {
  if (!attivo) return;
  const c = leggiConsenso();
  if (c === 'si') caricaTerzi();
  else if (c === null) banner();
  // link "Impostazioni cookie" accanto alla privacy nel footer
  const lp = document.querySelector('footer a[href="privacy.html"]');
  if (lp && !document.getElementById('pmCookieLink')) {
    const a = document.createElement('a'); a.href = '#'; a.id = 'pmCookieLink'; a.textContent = 'Impostazioni cookie';
    a.onclick = riapriConsenso; lp.insertAdjacentElement('afterend', a);
  }
}

window.PM = { track, acquisto, items, config: CONFIG };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
