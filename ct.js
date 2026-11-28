/* CENTRALE — script di misura unico per tutti gli store.
   Si mette in fondo a ogni pagina:
     <script defer src="https://pijamamania.it/ct.js" data-store="pijamamania"></script>
   Misura da solo: visite, prodotti visti, aggiunte al carrello, apertura carrello,
   checkout, clic su "Paga" e acquisti riusciti. Nessun cookie, nessun dato personale:
   solo un codice casuale anonimo salvato nel browser per contare i visitatori unici. */
(function () {
  var me = document.currentScript;
  var STORE = me && me.getAttribute('data-store');
  if (!STORE || navigator.webdriver) return;
  var URL_EV = new URL(me.src).origin + '/api/c-evento';

  var mem = {};
  function get(t, k) { try { return window[t].getItem(k); } catch (e) { return mem[t + k] || null; } }
  function set(t, k, v) { mem[t + k] = v; try { window[t].setItem(k, v); } catch (e) {} }
  function nuovoId() { return (Math.random().toString(36).slice(2, 12) + Date.now().toString(36)).replace(/[^a-z0-9]/g, ''); }

  var vid = get('localStorage', 'ct_v') || nuovoId(); set('localStorage', 'ct_v', vid);
  var sid = get('sessionStorage', 'ct_s');
  if (!sid) {
    sid = nuovoId(); set('sessionStorage', 'ct_s', sid);
    var qs = new URLSearchParams(location.search);
    set('sessionStorage', 'ct_r', (document.referrer || '').slice(0, 300));
    set('sessionStorage', 'ct_u', (qs.get('utm_source') || (qs.get('ttclid') ? 'tiktok' : '')).slice(0, 60));
  }

  function invia(ev, extra) {
    var d = { s: STORE, e: ev, v: vid, ss: sid, p: location.pathname,
              r: get('sessionStorage', 'ct_r') || '', u: get('sessionStorage', 'ct_u') || '' };
    for (var k in extra) d[k] = extra[k];
    var corpo = JSON.stringify(d);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(URL_EV, new Blob([corpo], { type: 'text/plain' }))) return;
    } catch (e) {}
    try { fetch(URL_EV, { method: 'POST', body: corpo, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  // articoli del carrello → nomi prodotto (uguali a quelli di Stripe), valore in centesimi
  function riassunto(articoli) {
    var C = window.CATALOGO, nomi = [], val = 0;
    try {
      (articoli || []).forEach(function (a) { var p = C && C.prodotti[a.p]; if (p && nomi.indexOf(p.nome) < 0) nomi.push(p.nome); });
      var t = C && C.totale && C.totale(articoli || []);
      if (t) val = t.importo;
    } catch (e) {}
    return { pr: nomi.join('|'), val: val, q: (articoli || []).length };
  }
  function carrello() { try { return window.Carrello ? window.Carrello.leggi() : []; } catch (e) { return []; } }

  function avvia() {
    var path = location.pathname.replace(/^\/+/, '') || 'index.html';
    var ult = path.split('/').pop() || 'index.html';
    var qs = new URLSearchParams(location.search);
    invia('page_view', {});

    // pagina prodotto
    var C = window.CATALOGO;
    if (C && C.prodotti) for (var id in C.prodotti) {
      var pg = C.prodotti[id].pagina || '';
      if (pg && (ult === pg || ult + '.html' === pg)) { invia('view_item', { pr: C.prodotti[id].nome, val: C.prodotti[id].prezzo }); break; }
    }

    // carrello: aggiunte e apertura
    var K = window.Carrello;
    if (K && K.aggiungi && !K.__ct) {
      K.__ct = 1;
      var agg = K.aggiungi, apri = K.apri;
      K.aggiungi = function (articoli) {
        var messi = agg.apply(this, arguments);
        try { if (messi) invia('add_to_cart', riassunto((articoli || []).slice(0, typeof messi === 'number' ? messi : undefined))); } catch (e) {}
        return messi;
      };
      if (apri) K.apri = function () { try { invia('view_cart', riassunto(carrello())); } catch (e) {} return apri.apply(this, arguments); };
    }

    // checkout e clic su "Paga"
    if (/checkout/.test(path)) {
      invia('begin_checkout', riassunto(carrello()));
      document.addEventListener('submit', function () { invia('add_payment_info', riassunto(carrello())); }, true);
    }

    // ritorno da Stripe con pagamento riuscito (una volta sola per ordine)
    var pi = qs.get('payment_intent');
    if (pi && qs.get('redirect_status') === 'succeeded' && !get('localStorage', 'ct_pi_' + pi)) {
      set('localStorage', 'ct_pi_' + pi, '1');
      invia('purchase', { pi: pi });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
