// CENTRALE — accesso alla dashboard con password (cookie valido 30 giorni).

const C = require('../lib/centrale.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'cz=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).end();
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b); } catch (e) { b = {}; }
  // piccola attesa: rende inutili i tentativi a raffica
  await new Promise(r => setTimeout(r, 400));
  if (!C.passwordGiusta((b || {}).password)) return res.status(401).json({ errore: 'Password sbagliata' });
  res.setHeader('Set-Cookie', C.cookieAccesso());
  return res.status(200).json({ ok: true });
};
