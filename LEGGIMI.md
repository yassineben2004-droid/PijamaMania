# PijamaMania — Coperta Squalo Indossabile

Sito a prodotto singolo con checkout **sul tuo dominio** (Stripe Payment Element).
Il cliente non viene mai mandato su una pagina Stripe.

## File

```
index.html                      pagina prodotto (4 taglie, sconto quantità, descrizione, FAQ)
checkout.html                   checkout personalizzato (form tuo + Payment Element)
grazie.html                     conferma ordine
api/create-payment-intent.js    funzione serverless: calcola il prezzo e parla con Stripe
package.json                    dipendenza stripe
img/                            ← metti qui le foto
```

## Immagini da mettere in `img/`

Prendile dal listing del tuo fornitore, non dalla CDN di un altro store
(se lui le sostituisce o blocca l'hotlink, la tua pagina si rompe).

| File | Cosa serve |
|---|---|
| `squalo-1.jpg` … `squalo-6.jpg` | galleria prodotto (la 1 è la principale) |
| `desc-1.jpg` | persona avvolta sul divano |
| `desc-2.gif` | si infila dentro la coda |
| `desc-3.gif` | reazione / gruppo che ride |
| `desc-4.jpg` | dettaglio tessuto o lavaggio |

I riquadri vuoti mostrano già il nome del file che si aspettano, quindi
capisci a colpo d'occhio cosa manca.

## Prima di pubblicare

1. **Chiavi Stripe** da dashboard.stripe.com → Sviluppatori → Chiavi API
2. **Dati aziendali** nel footer di `index.html`: ragione sociale, P.IVA, indirizzo, email
3. Le pagine legali: `termini.html`, `privacy.html`, `spedizioni.html`, `contatti.html`
   (i link nel footer ci sono già, i file no)

## Deploy su Vercel (gratis)

```bash
npm i -g vercel
vercel
```

Poi nelle impostazioni del progetto Vercel → **Environment Variables**:

```
STRIPE_SECRET_KEY = sk_test_xxxxx      (poi sk_live_xxxxx quando vai online)
```

⚠️ La chiave segreta (`sk_`) va SOLO lì, mai nei file HTML.
La chiave pubblicabile (`pk_`) va scritta a mano in due punti:
- `checkout.html` → `const STRIPE_PUBLIC_KEY = ...`
- `grazie.html` → stessa riga

## Testare senza soldi veri

Con le chiavi `pk_test_` / `sk_test_`:

| Esito | Numero carta |
|---|---|
| Pagamento riuscito | 4242 4242 4242 4242 |
| Richiede 3D Secure | 4000 0025 0000 3155 |
| Carta rifiutata | 4000 0000 0000 9995 |

Scadenza: una data futura qualsiasi. CVC: tre cifre qualsiasi.

## Prezzi e offerte

| Offerta | Prezzo | Margine (costo 16 €/pz + Stripe, prima della pubblicità) |
|---|---|---|
| 1 coperta | 39,90 € | 23,05 € |
| 2 coperte | 69,90 € | 36,60 € |
| 3 coperte | 94,90 € | 45,23 € |

Ogni coperta dell'offerta ha la sua taglia (Bimbo 2-5, Bambino 6-10, Ragazzo 11-15, Adulto 16+).

Per cambiare i prezzi servono **due** punti, da tenere allineati:
- `api/create-payment-intent.js` → `OFFERTE` e `PREZZO_SINGOLO`, in centesimi ← **quello che il cliente paga davvero**
- `index.html` → `OFFERTE` e `PREZZO` nello script (solo quello che si vede a schermo)

Scadenza Natale: in `index.html` cerca `scadenza` (ora 2 dicembre 2026, calcolata su 2 giorni di preparazione + 12 di consegna).

Statistiche: su Vercel → progetto → **Analytics** → Enable. Le visite a `grazie.html` sono gli acquisti.

## Tre cose da sistemare prima di andare live

1. **Prezzo barrato.** In Italia il prezzo sbarrato deve essere il prezzo più basso
   realmente applicato nei 30 giorni precedenti (direttiva Omnibus). I valori `prima:`
   in `index.html` (69,90 €) sono segnaposto: mettici cifre che puoi dimostrare.

2. **Recensioni.** La sezione "Cosa ne pensano i clienti" è SEGNAPOSTO con 4 stelle e 100 clienti fittizi.
   Non puoi pubblicare queste fake review: è una pratica commerciale scorretta e sanzionata.
   **Opzioni:** (a) togliamo la sezione per ora e la rimettiamo quando hai clienti veri;
   (b) la riscriviamo con una sola frase tipo "Attendi le prime recensioni dei clienti veri"
   senza numeri inventati. Dimmi quale preferisci.

3. **Tempi di consegna.** Le FAQ dicono "5-9 giorni lavorativi" per la consegna.
   Tu mi hai detto "7-12 giorni lavorativi": cambia il numero nella FAQ perché corrisponda
   a quello che fa davvero il fornitore, altrimenti arrivano chargeback e Stripe blocca i fondi.

## Ricevere gli ordini

Per ora i pagamenti li vedi nella dashboard Stripe: ogni transazione porta con sé
taglia, quantità, sconto applicato e indirizzo di spedizione. Per avere una email
automatica a ogni ordine serve un webhook Stripe: te lo aggiungo quando il test gira.
