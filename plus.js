/* SAS STOCK — caisse rapide, moyens de paiement, rappels, recherche de factures, PDF, import d'articles, codes-barres */
'use strict';
const MODES = ['Espèces', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Wave', 'Carte ou virement', 'Chèque'];
panierVide = () => ({ lignes: [], clientId: '', recu: null, mode: 'Espèces' });
if (S.panier && !S.panier.mode) S.panier.mode = 'Espèces';
const IC_SCAN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>';

/* ---------- caisse ---------- */
function stockVisible(a, dv, p) { // pendant une correction, les articles de l'ancienne facture comptent comme disponibles
  let q = C.qte(a.id, dv.id);
  if (p.remplace) { const v = C.par(C.db.ventes, p.remplace); if (v && !v.annule && v.depotId === dv.id) v.lignes.forEach(l => { if (l.articleId === a.id) q += l.qte; }); }
  return q;
}
function favoris() {
  const depuis = Date.now() - 60 * 864e5, n = {};
  C.db.ventes.forEach(v => { if (v.annule || v.date < depuis) return; v.lignes.forEach(l => { if (l.articleId) n[l.articleId] = (n[l.articleId] || 0) + l.qte; }); });
  return Object.keys(n).map(C.article).filter(a => a && a.actif !== false).sort((x, y) => n[y.id] - n[x.id]).slice(0, 8);
}
function blocFavoris() {
  const L = favoris(); if (!L.length) return '';
  return '<p class="petit doux gras" style="margin:4px 2px 6px">Les plus vendus</p><div class="favs">' + L.map(a => '<button data-a="pAjoute" data-id="' + a.id + '"><b>' + esc(a.nom) + '</b><span class="n">' + M(a.pv) + '</span></button>').join('') + '</div>';
}
V.caisse = function () {
  const p = S.panier, dv = depotVente(), libre = admin() || C.db.meta.opt.prixLibre, tot = totalPanier(p);
  const clients = C.db.tiers.filter(t => t.type === 'client').sort((a, b) => a.nom.localeCompare(b.nom));
  const scan = scanDispo() ? '<button class="scan" data-a="scanner" aria-label="Scanner un code-barres">' + IC_SCAN + '</button>' : '';
  return (p.remplace ? '<div class="bandeau" style="border-radius:12px;margin-bottom:10px"><span>Correction de la facture <b>' + esc(p.remplaceNum) + '</b> : modifiez ce qui est faux, puis validez.</span><button data-a="pAbandon">Abandonner</button></div>' : '') +
    '<div class="titre"><h1>Caisse</h1>' + (p.lignes.length ? '<button class="btn mini d" data-a="pVider">Vider le panier</button>' : '') + '</div>' +
    (C.db.depots.length > 1 ? '<label class="ch depv"><span>Vendre depuis le dépôt</span><select data-ch="pDepot"' + (p.remplace ? ' disabled' : '') + '>' + C.db.depots.map(d => '<option value="' + d.id + '"' + (d.id === dv.id ? ' selected' : '') + '>' + esc(d.nom) + '</option>').join('') + '</select></label>' : '') +
    '<div class="caisse2"><div>' +
    (p.lignes.length ? '<div class="liste panier" style="margin-bottom:10px">' + p.lignes.map((l, i) => { const a = l.libre ? { nom: l.nom } : C.article(l.articleId);
      return '<div class="pl" data-i="' + i + '"><div class="nm"><span>' + esc(a.nom) + '</span><span class="n" data-lt>' + M(l.qte > 0 && l.pu >= 0 ? l.qte * l.pu : 0) + '</span></div>' +
        '<span class="st">' + (l.libre ? 'Hors stock' : 'En stock : ' + F(stockVisible(a, dv, p)) + (stockVisible(a, dv, p) < l.qte && stockAilleurs(a, dv) ? ' · ailleurs : ' + esc(stockAilleurs(a, dv)) : '')) + '</span>' +
        '<div class="qg"><button data-a="pMoins" aria-label="Enlever 1 ' + esc(a.nom) + '">−</button><input inputmode="decimal" data-in="pq" value="' + (isNaN(l.qte) ? '' : l.qte) + '" aria-label="Quantité de ' + esc(a.nom) + '"><button data-a="pPlus" aria-label="Ajouter 1 ' + esc(a.nom) + '">+</button></div>' +
        '<input inputmode="numeric" data-in="pp" value="' + (isNaN(l.pu) ? '' : l.pu) + '" aria-label="Prix unitaire de ' + esc(a.nom) + '"' + (l.libre ? ' placeholder="Prix"' : '') + (libre || l.libre ? '' : ' readonly') + '>' +
        '<button class="x" data-a="pRetire" aria-label="Retirer ' + esc(a.nom) + '">×</button></div>'; }).join('') + '</div>' : '') +
    '<div class="cherche' + (scan ? ' avec-scan' : '') + '">' + ic('loupe') + '<input id="rech" data-in="rech" placeholder="' + (scan ? 'Nom ou code de l’article' : 'Tapez le nom ou le code d’un article') + '" autocomplete="off" enterkeyhint="search">' + scan + '</div><div id="res" style="margin-top:8px">' + blocFavoris() + '</div>' +
    (!C.db.articles.length ? '<div class="carte" style="margin-top:10px">' + vide('Aucun article enregistré', admin() ? 'Créez vos articles dans Stock, puis revenez vendre.' : 'Demandez au gérant d’ajouter les articles.') + '</div>' : '') +
    '</div><div class="encaisse" style="margin-top:14px"' + (p.lignes.length ? '' : ' hidden') + '><div class="tt"><span>Total à payer</span><b class="n" id="ctot">' + M(tot) + '</b></div>' +
    '<label class="ch" style="margin-top:10px"><span>Client</span><div class="rangee"><select class="f" data-ch="pClient"><option value="">Client de passage</option>' + clients.map(c => '<option value="' + c.id + '"' + (p.clientId === c.id ? ' selected' : '') + '>' + esc(c.nom) + '</option>').join('') + '</select>' +
    '<button type="button" class="btn mini" data-a="nouveauTiers" data-type="client" data-pour="panier">Nouveau</button></div></label>' +
    '<label class="ch"><span>Montant reçu</span><input inputmode="numeric" data-in="precu" id="precu" value="' + (p.recu == null ? '' : p.recu) + '" placeholder="' + F(tot) + ' (tout est payé)"></label>' +
    '<label class="ch"><span>Moyen de paiement</span><select data-ch="pMode">' + MODES.map(m => '<option' + ((p.mode || 'Espèces') === m ? ' selected' : '') + '>' + esc(m) + '</option>').join('') + '</select></label>' +
    '<p class="info" id="cinfo"></p><button class="btn m large" data-a="pValider" id="cval">' + (p.remplace ? 'Valider la facture corrigée' : 'Valider la vente') + '</button></div></div>' +
    (p.lignes.length ? '<div class="barreC"><div><span>Total à payer</span><b class="n" id="btot">' + M(tot) + '</b></div><button class="btn m" data-a="pValider">' + (p.remplace ? 'Valider la correction' : 'Valider la vente') + '</button></div><div class="espaceC"></div>' : '');
};
const majCaisseBase = majCaisse;
majCaisse = function () { majCaisseBase(); const b = $('#btot'); if (b) b.textContent = M(totalPanier(S.panier)); };
majRes = function () {
  const r = $('#rech'), box = $('#res'); if (!r || !box) return;
  const q = r.value, L = chercheArticles(q), dv = depotVente();
  if (!q.trim()) { box.innerHTML = blocFavoris(); return; }
  box.innerHTML = '<div class="liste">' + L.map(a => { const s = stockVisible(a, dv, S.panier);
    return '<button class="ligne" data-a="pAjoute" data-id="' + a.id + '"><div class="f"><b>' + esc(a.nom) + '</b><span>' + esc(a.code || '') + ' En stock : ' + F(s) + ' ' + etiqStock(a, s) + (stockAilleurs(a, dv) ? ' <span class="aill">· ' + esc(stockAilleurs(a, dv)) + '</span>' : '') + '</span></div><div class="d"><b class="n">' + M(a.pv) + '</b></div></button>'; }).join('') +
    '<button class="ligne" data-a="pLibre"><div class="f"><b>Ajouter « ' + esc(q.trim()) + ' » (hors stock)</b><span>Saisir la quantité et le prix</span></div><div class="d"><b class="n">+</b></div></button></div>';
};
I.rech = () => majRes();
CH.pDepot = v => { S.depotV = v; try { localStorage.setItem(cleDepotV(), v); } catch (e) {} rendre(); toast('Ventes depuis : ' + C.depot(v).nom); };
A.pAjoute = (d, el) => {
  const a = C.article(d.id); if (!a) return;
  const p = S.panier, l = p.lignes.find(x => x.articleId === d.id && !x.libre);
  if (l) l.qte = (l.qte > 0 ? l.qte : 0) + 1; else p.lignes.push({ articleId: d.id, qte: 1, pu: a.pv });
  S.focusRech = !!el && !el.closest('.favs'); rendre();
};
function pasQte(el, k) {
  const pl = el.closest('.pl'), l = S.panier.lignes[+pl.dataset.i]; if (!l) return;
  const q0 = l.qte > 0 ? l.qte : 0; if (k < 0 && q0 <= 1) return;
  l.qte = Math.round((q0 + k) * 1000) / 1000; $('[data-in=pq]', pl).value = l.qte; majCaisse();
}
A.pPlus = (d, el) => pasQte(el, 1);
A.pMoins = (d, el) => pasQte(el, -1);
CH.pMode = v => { S.panier.mode = v; };
A.pValider = () => {
  const p = S.panier;
  const o = { lignes: p.lignes.map(l => ({ articleId: l.articleId, libre: l.libre, nom: l.nom, qte: l.qte, pu: l.pu })), clientId: p.clientId, recu: p.recu, mode: p.mode || 'Espèces', userId: S.user.id, depotId: depotVente().id };
  const v = agir(() => p.remplace ? C.remplacerVente(p.remplace, o) : C.creerVente(o));
  if (v) { S.panier = panierVide(); rendre(); ticketVente(v.id, true); if (v.remplace) toast('Facture ' + v.num + ' émise : elle remplace ' + v.remplace); }
};

/* ---------- rapport : entrées par moyen de paiement ---------- */
const rapportsBase = V.rapports;
V.rapports = function () {
  let h = rapportsBase();
  if (S.f.rtab === 'caisse') {
    const b = bornes(), R = C.rapport(b[0], b[1], admin() ? null : S.user.id);
    if (R.parMode.length) h += '<div class="carte compte" style="margin-top:12px"><h2>Entrées par moyen de paiement</h2>' + R.parMode.map(x => cl(esc(x.nom), M(x.montant))).join('') + cl('Total', M(R.entrees), 'tot') + '</div>';
  }
  return h;
};

/* ---------- rappel de crédit par WhatsApp ---------- */
function numeroWA(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) d = '225' + d; else if (d.length === 8) d = '225' + d;
  return d.length >= 11 ? d : '';
}
const ficheTiersBase = ficheTiers;
ficheTiers = function (id) {
  ficheTiersBase(id);
  const t = C.tiers(id); if (!t || t.type !== 'client') return;
  const du = C.solde(id); if (!(du > 0)) return;
  const sh = C.db.meta.shop, msg = 'Bonjour ' + t.nom + ', sauf erreur de notre part, vous restez devoir ' + M(du) + ' à ' + sh.nom + '. Merci de passer régler dès que possible.' + (sh.tel ? ' Contact : ' + sh.tel + '.' : '');
  const r = $('#modale .rangee');
  if (r) r.insertAdjacentHTML('beforeend', '<a class="btn f" target="_blank" rel="noopener" href="https://wa.me/' + numeroWA(t.tel) + '?text=' + encodeURIComponent(msg) + '">' + ic('envoi') + 'Rappel WhatsApp</a>');
};

/* ---------- recherche de factures (Journaux) ---------- */
function venteCorrespond(v, q) {
  const c = v.clientId && C.tiers(v.clientId);
  const txt = sansAccent([v.num, v.numAvant || '', c ? c.nom : 'client de passage', c ? c.tel || '' : '', String(v.total)].join(' '));
  return q.split(/\s+/).every(m => txt.indexOf(m) >= 0);
}
function rechVentes() { return '<div class="cherche" style="margin-bottom:10px">' + ic('loupe') + '<input data-in="jq" value="' + esc(S.f.jq || '') + '" placeholder="Chercher une facture : n°, client ou montant" autocomplete="off" enterkeyhint="search"></div>'; }
window.listeVentesJ = function () {
  const q = sansAccent(S.f.jq || '').trim(), b = bornes(), mien = v => admin() || v.userId === S.user.id;
  const L = C.db.ventes.filter(v => mien(v) && (q ? venteCorrespond(v, q) : v.date >= b[0] && v.date <= b[1])).reverse(), ok = L.filter(v => !v.annule);
  if (!L.length) return '<div class="carte">' + (q ? vide('Aucune facture trouvée', 'Cherchez par numéro (ex. V-00012), nom du client ou montant.') : vide('Aucune vente sur cette période', 'Changez la période ou enregistrez une vente à la caisse.')) + '</div>';
  return '<p class="petit doux" style="margin:0 2px 6px">' + (q ? L.length + ' facture' + (L.length > 1 ? 's trouvées' : ' trouvée') + ', toutes dates' : ok.length + ' vente' + (ok.length > 1 ? 's' : '') + ', total <b class="n">' + M(ok.reduce((s, v) => s + v.total, 0)) + '</b>') + '</p>' +
    '<div class="liste">' + L.slice(0, 300).map(ligneVente).join('') + '</div>';
};
I.jq = v => { S.f.jq = v; const el = $('#jl'); if (el) el.innerHTML = listeVentesJ(); };

/* ---------- facture en PDF ---------- */
const WIN = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F, 0x2212: 0x2D };
function winAnsi(s) { let o = ''; for (const ch of String(s == null ? '' : s)) { let c = ch.codePointAt(0); if (c === 0x202F || c === 0xA0) c = 32; else if (c > 255) c = WIN[c] || 63; else if (c < 32) c = 32; o += String.fromCharCode(c); } return o; }
const pdfEsc = s => winAnsi(s).replace(/[\\()]/g, '\\$&');
let ctxMesure = null;
function largeur(s, taille, gras) {
  if (!ctxMesure) ctxMesure = document.createElement('canvas').getContext('2d');
  ctxMesure.font = (gras ? 'bold ' : '') + '100px Helvetica, Arial, "Liberation Sans", sans-serif';
  return ctxMesure.measureText(winAnsi(s)).width * taille / 100;
}
function couper(s, taille, max) {
  const L = []; let cur = '';
  String(s).split(/\s+/).forEach(m => { const t = cur ? cur + ' ' + m : m; if (!cur || largeur(t, taille) <= max) cur = t; else { L.push(cur); cur = m; } });
  if (cur) L.push(cur);
  return L.flatMap(l => { if (largeur(l, taille) <= max) return [l]; const o = []; let c = ''; for (const ch of l) { if (c && largeur(c + ch, taille) > max) { o.push(c); c = ch; } else c += ch; } if (c) o.push(c); return o; });
}
function infoJpeg(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7) || m === 0xFF) { i++; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8], c: b[i + 9] };
    i += 2 + (b[i + 2] << 8 | b[i + 3]);
  }
  return null;
}
function pdfFacture(v) {
  const sh = C.db.meta.shop, c = v.clientId && C.tiers(v.clientId), du = v.total - v.paye;
  const W = 595.28, H = 841.89, mg = 40, LT = 515, bas = 60, pages = [];
  let ops, y;
  const page = () => { ops = []; pages.push(ops); y = H - mg; };
  const f2 = n => n.toFixed(2);
  const txt = (s, x, yy, t, g, al, coul) => { s = String(s == null ? '' : s); let xx = x; if (al === 'd') xx = x - largeur(s, t, g); else if (al === 'c') xx = x - largeur(s, t, g) / 2; ops.push((coul || '0 0 0') + ' rg BT /' + (g ? 'F2' : 'F1') + ' ' + t + ' Tf ' + f2(xx) + ' ' + f2(yy) + ' Td (' + pdfEsc(s) + ') Tj ET'); };
  const rect = (x, yy, w, h, fond, trait) => ops.push((fond ? fond + ' rg ' : '') + '0.6 w 0 0 0 RG ' + f2(x) + ' ' + f2(yy) + ' ' + f2(w) + ' ' + f2(h) + ' re ' + (fond && trait ? 'B' : fond ? 'f' : 'S'));
  const trait = (x1, y1, x2, y2, ep) => ops.push((ep || 0.6) + ' w 0 0 0 RG ' + f2(x1) + ' ' + f2(y1) + ' m ' + f2(x2) + ' ' + f2(y2) + ' l S');
  page();
  let logo = null;
  if (sh.logo && /^data:image\/jpeg;base64,/.test(sh.logo)) { try { const bin = atob(sh.logo.split(',')[1]), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); const inf = infoJpeg(b); if (inf && inf.w && inf.h) logo = Object.assign({ b }, inf); } catch (e) {} }
  let xT = mg, hLogo = 0;
  if (logo) { let hh = 64, ww = logo.w * hh / logo.h; if (ww > 130) { ww = 130; hh = logo.h * ww / logo.w; } ops.push('q ' + f2(ww) + ' 0 0 ' + f2(hh) + ' ' + mg + ' ' + f2(y - hh) + ' cm /Im1 Do Q'); xT = mg + ww + 14; hLogo = hh; }
  let yT = y - 15; txt(sh.nom, xT, yT, 15, 1); lignesBoutique().forEach(l => { yT -= 12; txt(l, xT, yT, 9); });
  y = Math.min(yT - 8, y - hLogo) - 18;
  const infos = [['Date d’émission', dj(v.date)], ['Émis par', (C.user(v.userId) || {}).nom || ''], ['Mode de paiement', (du > 0 ? (v.paye > 0 ? 'Acompte, reste à crédit' : 'À crédit') : 'Comptant') + (v.paye > 0 && v.mode ? ' (' + v.mode + ')' : '')]]
    .concat(v.numAvant ? [['N° provisoire', v.numAvant]] : [], v.remplace ? [['Remplace la facture', v.remplace]] : [], v.remplaceePar ? [['Remplacée par', v.remplaceePar]] : []);
  const hI = infos.length * 14 + 8;
  rect(mg, y - hI, 285, hI, '0.93 0.94 0.93');
  infos.forEach((r, i) => { const yy = y - 15 - i * 14; txt(r[0], mg + 108, yy, 9, 0, 'd', '0.32 0.36 0.34'); txt(r[1], mg + 116, yy, 9); });
  txt('Destinataire', 350, y - 12, 10, 1); (c ? [c.nom, c.tel] : ['Client de passage']).filter(Boolean).forEach((l, i) => txt(l, 350, y - 26 - i * 12, 9));
  y -= hI + 28;
  txt('Facture n° ' + v.num + (v.annule ? ' (annulée)' : ''), W - mg, y, 15, 1, 'd'); y -= 12;
  const cols = [[226, 'Désignation des produits', 'g'], [60, 'Quantité', 'c'], [54, 'Unité', 'c'], [85, 'Prix unitaire', 'd'], [90, 'Total', 'd']], xs = [];
  let xc = mg; cols.forEach(k => { xs.push(xc); xc += k[0]; });
  let haut;
  const entete = () => { rect(mg, y - 20, LT, 20, '0.78 0.85 0.95', 1); cols.forEach((k, i) => { if (i) trait(xs[i], y, xs[i], y - 20); txt(k[1], xs[i] + k[0] / 2, y - 13.5, 9, 1, 'c'); }); y -= 20; haut = y; };
  const fin = () => { xs.forEach((x, i) => { if (i) trait(x, haut, x, y); }); trait(mg, haut, mg, y); trait(mg + LT, haut, mg + LT, y); trait(mg, y, mg + LT, y); };
  const cel = (s, i, yy) => { const k = cols[i]; if (k[2] === 'c') txt(s, xs[i] + k[0] / 2, yy, 9, 0, 'c'); else if (k[2] === 'd') txt(s, xs[i] + k[0] - 5, yy, 9, 0, 'd'); else txt(s, xs[i] + 5, yy, 9); };
  entete();
  const traits = !!(C.db.meta.opt && C.db.meta.opt.traitsFact);
  v.lignes.forEach(l => {
    const a = C.article(l.articleId) || {}, T = couper(l.nom, 9, cols[0][0] - 10), h = 7 + T.length * 11;
    if (y - h < bas) { fin(); page(); entete(); }
    T.forEach((t, k) => txt(t, xs[0] + 5, y - 12 - k * 11, 9));
    cel(F(l.qte), 1, y - 12); cel(a.unite || 'pièce', 2, y - 12); cel(M(l.pu), 3, y - 12); cel(M(l.qte * l.pu), 4, y - 12);
    y -= h; if (traits) trait(mg, y, mg + LT, y, 0.5);
  });
  if (v.lignes.length < 8) y -= 60;
  fin();
  const tots = [['Montant payé', M(v.paye)]].concat(v.monnaie > 0 ? [['Monnaie rendue', M(v.monnaie)]] : [], du > 0 ? [['Reste à payer', M(du)]] : []);
  if (y - (tots.length * 16 + 90) < bas) page();
  y -= 20; const xL = W - mg - 230;
  tots.forEach(t => { txt(t[0], xL, y, 10); txt(t[1], W - mg, y, 10, 0, 'd'); y -= 16; });
  trait(xL - 4, y + 10, W - mg, y + 10, 0.9); y -= 6;
  txt('Total', xL, y, 13, 1); txt(M(v.total), W - mg, y, 13, 1, 'd');
  y -= 42; txt(sh.pied || '', mg, y, 9); txt('Signature', W - mg - 70, y, 9);
  pages.forEach((p, i) => { ops = p; txt('Page ' + (i + 1) + ' / ' + pages.length, W / 2, 24, 8, 0, 'c', '0.4 0.4 0.4'); });
  return assemblerPdf(pages, W, H, logo);
}
function assemblerPdf(pages, W, H, logo) {
  const objs = [], add = o => { objs.push(o); return objs.length; };
  const cat = add(null), pg = add(null);
  const f1 = add(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']), f2 = add(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
  const im = logo ? add(['<< /Type /XObject /Subtype /Image /Width ' + logo.w + ' /Height ' + logo.h + ' /ColorSpace /' + (logo.c === 1 ? 'DeviceGray' : logo.c === 4 ? 'DeviceCMYK' : 'DeviceRGB') + ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + logo.b.length + ' >>\nstream\n', logo.b, '\nendstream']) : 0;
  const kids = pages.map(p => {
    const flux = p.join('\n'), c = add(['<< /Length ' + flux.length + ' >>\nstream\n' + flux + '\nendstream']);
    return add(['<< /Type /Page /Parent ' + pg + ' 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >>' + (im ? ' /XObject << /Im1 ' + im + ' 0 R >>' : '') + ' >> /Contents ' + c + ' 0 R >>']);
  });
  objs[cat - 1] = ['<< /Type /Catalog /Pages ' + pg + ' 0 R >>'];
  objs[pg - 1] = ['<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>'];
  const parts = [], offs = []; let pos = 0;
  const push = x => { const b = typeof x === 'string' ? Uint8Array.from(x, ch => ch.charCodeAt(0) & 255) : x; parts.push(b); pos += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objs.forEach((o, i) => { offs.push(pos); push((i + 1) + ' 0 obj\n'); o.forEach(push); push('\nendobj\n'); });
  const xref = pos;
  push('xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}
function telecharger(blob, nom) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
A.pdfVente = async d => {
  const v = C.par(C.db.ventes, d.id); if (!v) return;
  let blob; try { blob = pdfFacture(v); } catch (e) { console.error(e); return toast('Impossible de créer le PDF.', true); }
  const nom = 'Facture-' + v.num + '.pdf', fi = new File([blob], nom, { type: 'application/pdf' });
  try { if (navigator.canShare && navigator.canShare({ files: [fi] })) { await navigator.share({ files: [fi], title: 'Facture ' + v.num }); return; } }
  catch (e) { if (e && e.name === 'AbortError') return; }
  telecharger(blob, nom); toast('PDF enregistré dans vos téléchargements');
};
const ticketVenteBase = ticketVente;
ticketVente = function (id, nouveau) {
  ticketVenteBase(id, nouveau);
  const r = $('#modale .rangee.nonimp'); if (!r || !r.firstElementChild) return;
  r.firstElementChild.insertAdjacentHTML('afterend', '<button class="btn f" data-a="pdfVente" data-id="' + id + '">' + ic('envoi') + 'Envoyer le PDF</button>');
  const w = r.querySelector('a.btn'); if (w) w.lastChild.textContent = 'WhatsApp (texte)';
};

/* ---------- import d'articles (Excel ou CSV) ---------- */
const stockBase = V.stock;
V.stock = function () {
  const h = stockBase();
  return admin() ? h.replace('<button class="btn mini p" data-a="formArticle">', '<button class="btn mini" data-a="importer">Importer</button><button class="btn mini p" data-a="formArticle">') : h;
};
A.importer = () => {
  if (!admin()) return; S.import = null;
  ouvrir('Importer des articles', '<p style="margin-bottom:10px">Ajoutez d’un coup tous vos articles depuis un fichier <b>Excel</b> (.xlsx) ou <b>CSV</b>, une ligne par article.</p>' +
    '<div class="carte petit" style="margin-bottom:12px"><b>Colonnes obligatoires :</b> Nom, Prix de vente.<br><b>Facultatives :</b> Code, Famille, Prix d’achat, Quantité (stock de départ), Seuil, Unité.<br>La première ligne du fichier doit contenir ces titres. Le plus simple : téléchargez le modèle, remplissez-le dans Excel, puis choisissez-le ici.</div>' +
    '<div class="rangee"><button class="btn f" data-a="modeleImport">Télécharger le modèle</button><label class="btn p f" style="cursor:pointer">Choisir le fichier<input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-ch="fichierImport" hidden></label></div><div id="apercuImport"></div>');
};
A.modeleImport = () => {
  const t = '﻿Nom;Code;Famille;Prix d’achat;Prix de vente;Quantité;Seuil;Unité\r\nPneu avant 2.75-17;P275;Pneus;8000;12000;10;2;pièce\r\nHuile moteur 4T 1 L;;Huiles;2200;3000;24;5;litre\r\n';
  telecharger(new Blob([t], { type: 'text/csv;charset=utf-8' }), 'modele-articles-sas-stock.csv'); toast('Modèle enregistré dans vos téléchargements');
};
async function lireXlsx(buf) {
  const b = new Uint8Array(buf), dv = new DataView(buf); let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Ce fichier Excel est illisible.');
  const n = dv.getUint16(e + 10, true), F_ = {}; let p = dv.getUint32(e + 16, true);
  for (let k = 0; k < n; k++) {
    const ln = dv.getUint16(p + 28, true), lx = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true);
    F_[new TextDecoder().decode(b.subarray(p + 46, p + 46 + ln))] = { meth: dv.getUint16(p + 10, true), tc: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
    p += 46 + ln + lx + lc;
  }
  const lire = async nom => {
    const f = F_[nom]; if (!f) return null;
    const d0 = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = b.subarray(d0, d0 + f.tc);
    if (f.meth === 0) return new TextDecoder().decode(data);
    if (f.meth !== 8 || typeof DecompressionStream === 'undefined') throw new Error('Ce fichier Excel ne peut pas être lu sur cet appareil. Enregistrez-le en CSV dans Excel.');
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
  const xml = t => new DOMParser().parseFromString(t, 'application/xml');
  const ss = [], tss = await lire('xl/sharedStrings.xml');
  if (tss) [...xml(tss).getElementsByTagName('si')].forEach(si => ss.push([...si.getElementsByTagName('t')].map(t => t.textContent).join('')));
  let chemin = Object.keys(F_).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b2) => parseInt(a.match(/\d+/), 10) - parseInt(b2.match(/\d+/), 10))[0];
  try {
    const wb = xml(await lire('xl/workbook.xml')), rels = xml(await lire('xl/_rels/workbook.xml.rels')), s1 = wb.getElementsByTagName('sheet')[0];
    const rid = s1.getAttribute('r:id'), rel = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid);
    if (rel) { const t = rel.getAttribute('Target').replace(/^\//, '').replace(/^xl\//, ''); if (F_['xl/' + t]) chemin = 'xl/' + t; }
  } catch (e2) {}
  if (!chemin) throw new Error('Aucune feuille trouvée dans ce fichier.');
  const lignes = [];
  [...xml(await lire(chemin)).getElementsByTagName('row')].forEach(r => {
    const L = [];
    [...r.getElementsByTagName('c')].forEach(c => {
      const col = (c.getAttribute('r') || '').replace(/\d+/g, ''); let ci = 0; for (const ch of col) ci = ci * 26 + ch.charCodeAt(0) - 64;
      const t = c.getAttribute('t'), vEl = c.getElementsByTagName('v')[0];
      const val = t === 's' ? ss[+(vEl ? vEl.textContent : 0)] || '' : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : vEl ? vEl.textContent : '';
      L[ci ? ci - 1 : L.length] = val;
    });
    const ri = parseInt(r.getAttribute('r'), 10); lignes[ri ? ri - 1 : lignes.length] = L;
  });
  return lignes.filter(Boolean).map(L => Array.from(L, x => x == null ? '' : String(x)));
}
function lireCsv(buf) {
  let t = new TextDecoder('utf-8').decode(buf); if (t.indexOf('�') >= 0) t = new TextDecoder('windows-1252').decode(buf);
  t = t.replace(/^﻿/, '');
  const prem = t.split(/\r?\n/)[0], sep = [';', '\t', ','].map(s => [s, prem.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const lignes = []; let L = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { L.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; L.push(c); lignes.push(L); L = []; c = ''; }
    else c += ch;
  }
  if (c || L.length) { L.push(c); lignes.push(L); }
  return lignes;
}
const CHAMPS = { nom: ['nom', 'designation', 'article', 'produit', 'libelle', 'nom de l article', 'designation des produits'], code: ['code', 'reference', 'ref', 'code barre', 'code barres', 'codebarre'], famille: ['famille', 'categorie', 'rayon'],
  pa: ['prix d achat', 'prix achat', 'achat', 'pa', 'cout'], pv: ['prix de vente', 'prix vente', 'vente', 'pv', 'prix', 'prix unitaire'], qte: ['quantite', 'stock', 'qte', 'qty', 'stock de depart'], seuil: ['seuil', 'alerte', 'seuil d alerte', 'stock minimum'], unite: ['unite', 'unite de vente'] };
const cleCol = s => sansAccent(s).replace(/[^a-z0-9]+/g, ' ').trim();
function analyserImport(lignes) {
  lignes = lignes.filter(L => L.some(x => String(x).trim()));
  if (lignes.length < 2) throw new Error('Le fichier ne contient aucun article.');
  const tete = lignes[0].map(cleCol), used = new Set(), idx = {};
  for (const k in CHAMPS) { const i = tete.findIndex((h, j) => !used.has(j) && CHAMPS[k].includes(h)); if (i >= 0) { idx[k] = i; used.add(i); } }
  for (const k in CHAMPS) if (!(k in idx)) { const i = tete.findIndex((h, j) => !used.has(j) && CHAMPS[k].some(m => m.length > 3 && h.indexOf(m) >= 0)); if (i >= 0) { idx[k] = i; used.add(i); } }
  if (!('nom' in idx) || !('pv' in idx)) throw new Error('Colonnes « Nom » et « Prix de vente » introuvables sur la première ligne. Utilisez le modèle.');
  const nb = s => { s = String(s).replace(/\s*(f\s*cfa|fcfa|cfa|f)$/i, '').trim(); return s === '' ? null : num(s); };
  const plan = { nouveaux: [], maj: [], erreurs: [] }, vus = new Set();
  lignes.slice(1).forEach((L, k) => {
    const n = k + 2, g = c => idx[c] == null ? '' : String(L[idx[c]] == null ? '' : L[idx[c]]).trim(), nom = g('nom');
    if (!nom) return plan.erreurs.push('Ligne ' + n + ' : nom manquant');
    const pv = nb(g('pv')), pa = nb(g('pa')), qte = nb(g('qte')), seuil = nb(g('seuil'));
    if (pv == null || !(pv >= 0)) return plan.erreurs.push('Ligne ' + n + ' (' + nom + ') : prix de vente manquant ou invalide');
    if ((pa != null && !(pa >= 0)) || (qte != null && !(qte >= 0)) || (seuil != null && !(seuil >= 0))) return plan.erreurs.push('Ligne ' + n + ' (' + nom + ') : nombre invalide');
    const cle = sansAccent(nom); if (vus.has(cle)) return plan.erreurs.push('Ligne ' + n + ' (' + nom + ') : en double dans le fichier');
    vus.add(cle);
    const code = g('code'), u = sansAccent(g('unite'));
    const ex = C.db.articles.find(a => a.actif !== false && ((code && a.code && a.code.toLowerCase() === code.toLowerCase()) || sansAccent(a.nom) === cle));
    (ex ? plan.maj : plan.nouveaux).push({ nom, code, famille: g('famille'), pa, pv, qte, seuil, unite: UNITES.find(x => sansAccent(x) === u) || 'pièce', uniteDonnee: !!u, ex });
  });
  return plan;
}
CH.fichierImport = async (v, el) => {
  const fi = el.files && el.files[0], box = $('#apercuImport'); if (!fi || !box) return;
  box.innerHTML = '<p class="petit doux" style="margin-top:12px">Lecture du fichier…</p>';
  let plan;
  try {
    const buf = await fi.arrayBuffer(), u = new Uint8Array(buf);
    const lignes = (u[0] === 0x50 && u[1] === 0x4B) ? await lireXlsx(buf) : /\.xls$/i.test(fi.name) ? (() => { throw new Error('Ancien format Excel (.xls) : dans Excel, faites « Enregistrer sous » au format .xlsx ou CSV.'); })() : lireCsv(buf);
    plan = analyserImport(lignes);
  } catch (e) { box.innerHTML = '<div class="carte" style="margin-top:12px"><p class="rouge gras">' + esc(e.message || 'Fichier illisible.') + '</p></div>'; return; }
  S.import = plan;
  const total = plan.nouveaux.length + plan.maj.length;
  box.innerHTML = '<div class="carte" style="margin-top:12px"><p><b>' + plan.nouveaux.length + '</b> ' + (plan.nouveaux.length > 1 ? 'nouveaux articles' : 'nouvel article') + ' à créer.</p>' +
    (plan.maj.length ? '<p style="margin-top:4px"><b>' + plan.maj.length + '</b> article' + (plan.maj.length > 1 ? 's' : '') + ' déjà présent' + (plan.maj.length > 1 ? 's' : '') + ' : nom, prix et famille mis à jour, stock inchangé.</p>' : '') +
    (plan.erreurs.length ? '<p class="rouge" style="margin-top:8px"><b>' + plan.erreurs.length + ' ligne' + (plan.erreurs.length > 1 ? 's ignorées' : ' ignorée') + ' :</b></p><ul class="petit" style="margin:4px 0 0 18px">' + plan.erreurs.slice(0, 8).map(x => '<li>' + esc(x) + '</li>').join('') + (plan.erreurs.length > 8 ? '<li>…</li>' : '') + '</ul>' : '') +
    (plan.nouveaux.length ? '<p class="petit doux" style="margin-top:10px">Exemples : ' + esc(plan.nouveaux.slice(0, 3).map(o => o.nom + ' (' + M(o.pv) + (o.qte ? ', stock ' + F(o.qte) : '') + ')').join(' ; ')) + '</p>' : '') + '</div>' +
    (total ? '<button class="btn p large" style="margin-top:12px" data-a="validerImport">Importer ' + total + ' article' + (total > 1 ? 's' : '') + '</button>' : '');
};
function appliquerImport(plan) {
  const dep = C.db.depots[0].id;
  const fam = nom => { if (!nom) return ''; const k = sansAccent(nom); let f = C.db.familles.find(x => sansAccent(x.nom) === k); if (!f) { f = { id: C.uid(), nom: nom.trim() }; C.db.familles.push(f); } return f.id; };
  plan.nouveaux.forEach(o => {
    const a = { id: C.uid(), nom: o.nom, code: o.code, familleId: fam(o.famille), pa: o.pa || 0, pv: o.pv, seuil: o.seuil || 0, unite: o.unite, actif: true };
    C.db.articles.push(a);
    if (o.qte > 0) C.ajuster(a.id, dep, o.qte, 'Import (stock de départ)', S.user.id);
  });
  plan.maj.forEach(o => { const a = o.ex; a.nom = o.nom; if (o.code) a.code = o.code; if (o.famille) a.familleId = fam(o.famille); if (o.pa != null) a.pa = o.pa; a.pv = o.pv; if (o.seuil != null) a.seuil = o.seuil; if (o.uniteDonnee) a.unite = o.unite; });
}
A.validerImport = () => {
  const plan = S.import; if (!plan || !admin()) return;
  if (agir(() => appliquerImport(plan))) {
    S.import = null; fermer(); S.f.stab = 'articles'; aller('stock');
    toast(plan.nouveaux.length + ' article' + (plan.nouveaux.length > 1 ? 's créés' : ' créé') + (plan.maj.length ? ', ' + plan.maj.length + ' mis à jour' : ''));
  }
};

/* ---------- lecture des codes-barres avec la caméra ---------- */
const scanDispo = () => 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
let scanFlux = null, scanCb = null, scanTour = 0;
function arreterScan() { if (scanFlux) scanFlux.getTracks().forEach(t => t.stop()); scanFlux = null; const b = $('#scanbox'); if (b) b.remove(); }
async function scanner(cb) {
  arreterScan(); scanCb = cb; const tour = ++scanTour;
  document.body.insertAdjacentHTML('beforeend', '<div id="scanbox" role="dialog" aria-label="Scanner un code-barres"><video id="scanVid" playsinline muted autoplay></video><i class="cadre"></i><p>Placez le code-barres dans le cadre</p><button class="btn large" data-a="scanFin">Annuler</button></div>');
  try { scanFlux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
  catch (e) { arreterScan(); return toast('Caméra indisponible : autorisez l’accès à la caméra pour SAS STOCK.', true); }
  if (tour !== scanTour || !$('#scanbox')) return arreterScan();
  const vid = $('#scanVid'); vid.srcObject = scanFlux; try { await vid.play(); } catch (e) {}
  let det; try { det = new BarcodeDetector(); } catch (e) { arreterScan(); return toast('Lecture des codes-barres indisponible sur cet appareil.', true); }
  const boucle = async () => {
    if (tour !== scanTour || !scanFlux) return;
    try { const r = await det.detect(vid); if (r && r.length && r[0].rawValue) { const f = scanCb; arreterScan(); try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {} f(String(r[0].rawValue).trim()); return; } } catch (e) {}
    setTimeout(boucle, 200);
  };
  boucle();
}
A.scanFin = () => { scanTour++; arreterScan(); };
const articleParCode = code => { const k = String(code).toLowerCase(); return C.db.articles.find(a => a.actif !== false && a.code && a.code.toLowerCase() === k); };
A.scanner = () => scanner(code => {
  const a = articleParCode(code);
  if (a) { A.pAjoute({ id: a.id }, null); toast(a.nom + ' ajouté'); return; }
  toast('Aucun article avec le code ' + code + '.', true);
  const r = $('#rech'); if (r) { r.value = code; majRes(); }
});
const formArticleBase = formArticle;
formArticle = function (id, pour) {
  formArticleBase(id, pour);
  if (!scanDispo()) return;
  const inp = $('#modale [name=code]'); if (!inp) return;
  inp.closest('label').insertAdjacentHTML('afterend', '<button type="button" class="btn mini" style="margin:-4px 0 12px" data-a="scanCode">' + IC_SCAN.replace('<svg', '<svg width="18" height="18"') + 'Scanner le code-barres</button>');
};
A.scanCode = () => scanner(code => {
  const inp = $('#modale [name=code]'); if (inp) inp.value = code;
  const autre = articleParCode(code); if (autre) toast('Attention : ce code est déjà utilisé par ' + autre.nom + '.', true);
});

/* ---------- nombre de factures en attente d'envoi dans la bulle En ligne / Hors ligne ---------- */
let attente = { n: 0, v: 0 }, tAttente = null;
function compterAttente() {
  if (!compte || !sy || !sy.init) { attente = { n: 0, v: 0 }; return; }
  let n = 0, v = 0; const ent = entites();
  ent.forEach((j, k) => { if (sy.h[k] !== hache(j)) { n++; if (k.startsWith('v_')) v++; } });
  Object.keys(sy.h).forEach(k => { if (!ent.has(k)) n++; });
  attente = { n, v };
}
function texteAttente(court) {
  if (!attente.n) return '';
  return attente.v ? attente.v + (court ? '' : ' facture' + (attente.v > 1 ? 's' : '')) : attente.n + (court ? '' : ' modif.');
}
pastille = function () {
  const h = navigator.onLine === false || syncEtat === 'horsligne', k = syncEtat === 'erreur', t = attente.n ? texteAttente() : '';
  return '<span id="reseau" class="reseau' + (h ? ' off' : k ? ' ko' : '') + '"' + (t ? ' title="' + t + ' en attente d’envoi"' : '') + '>' + (h ? 'Hors ligne' : k ? 'En pause' : 'En ligne') +
    (t ? '<span class="na"> · ' + texteAttente(true) + '</span><span class="nl">' + t.replace(/^\d+/, '') + '</span>' : '') + '</span>';
};
function majAttente() {
  compterAttente();
  const r = $('#reseau'); if (r) r.outerHTML = pastille();
  const e = $('#etatSync');
  if (e) e.textContent = attente.n && syncEtat !== 'envoi' ? (attente.v ? texteAttente() + ' à envoyer' : 'Modifications à envoyer') : TXT[syncEtat];
}
const majSyncBase = majSync;
majSync = function (e) { majSyncBase(e); majAttente(); };
const sauverBase = sauver;
sauver = function (tout) { const r = sauverBase(tout); clearTimeout(tAttente); tAttente = setTimeout(majAttente, 250); return r; };

/* ---------- sommes dues ajoutées à la main (2.9.6) ---------- */
A.formDette = d => {
  const t = C.tiers(d.id), cli = t.type === 'client';
  formulaire('Ajouter une somme due', [{ t: 'texte', l: cli ? t.nom + ' nous doit en plus :' : 'Nous devons en plus à ' + t.nom + ' :' }, { n: 'montant', l: 'Montant', t: 'nombre', req: 1 }, { n: 'note', l: 'Motif (facultatif)', ph: 'Ex. dette d’avant SAS STOCK, marchandise prise à crédit…' }], v => {
    C.ajouterDette({ tiersId: t.id, montant: num(v.montant), note: v.note.trim(), userId: S.user.id });
    toast('Somme ajoutée : ' + M(num(v.montant))); return () => ficheTiers(t.id);
  }, { ok: 'Ajouter' });
};
A.detailDette = d => {
  const [tid, did] = d.id.split('|'), t = C.tiers(tid), x = t && (t.dettes || []).find(y => y.id === did); if (!x) return;
  ouvrir('Somme due ajoutée', '<div class="chiffre fort" style="margin-bottom:12px"><span>' + esc(t.nom) + '</span><b class="n">' + M(x.montant) + '</b><span>' + esc(dh(x.date)) + '</span></div>' +
    '<div class="carte"><p><b>Motif :</b> ' + esc(x.note || 'sans motif') + '</p><p class="petit doux">Ajoutée par ' + esc(nomU(x.userId)) + '</p></div>' +
    '<div class="rangee" style="margin-top:12px"><button class="btn f" data-a="ficheTiers" data-id="' + tid + '">Retour</button>' + (admin() ? '<button class="btn d f" data-a="retirerDette" data-id="' + d.id + '">Supprimer (erreur de saisie)</button>' : '') + '</div>');
};
A.retirerDette = d => {
  const [tid, did] = d.id.split('|');
  confirmer('Supprimer cette somme due', 'Le reste dû sera diminué de ce montant.', 'Supprimer', () => {
    try { C.retirerDette(tid, did); sauver(); toast('Somme supprimée'); ficheTiers(tid); rendre(); } catch (e) { toast(e.message); }
  }, true);
};
