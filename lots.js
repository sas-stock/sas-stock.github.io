/* SAS STOCK — suivi du stock par arrivage (lots), calculé à partir des achats et des mouvements */
'use strict';
let cacheLots = null;
const jourCourt = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const jourLong = d => { const s = new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
/* Chaque ligne d'achat est un lot ; chaque ajout manuel (stock de départ, import, inventaire en plus) aussi.
   Les sorties (ventes, inventaires en moins) puisent d'abord dans le lot choisi à la caisse, sinon dans le plus ancien. */
function tousLesLots() {
  const D = C.db, cle = D.mouvements.length + '|' + D.achats.length + '|' + D.ventes.length + '|' + (D.mouvements.length ? D.mouvements[D.mouvements.length - 1].id : '') + '|' + D.achats.filter(a => a.annule).length + '|' + D.ventes.filter(v => v.annule).length;
  if (cacheLots && cacheLots.cle === cle) return cacheLots.parArticle;
  const P = {}, art = id => P[id] || (P[id] = { lots: [], conso: 0, choisi: {} });
  D.achats.forEach(ac => {
    if (ac.annule) return;
    const vus = {};
    ac.lignes.forEach(l => {
      const x = art(l.articleId); let lot = vus[l.articleId];
      if (!lot) { lot = vus[l.articleId] = { cle: ac.id, type: 'achat', achatId: ac.id, date: ac.date, ref: ac.num, bon: ac.ref || '', fournisseurId: ac.fournisseurId, qte: 0, pa: l.pu, sortis: 0 }; x.lots.push(lot); }
      lot.qte += l.qte;
    });
  });
  D.mouvements.forEach(m => {
    const x = art(m.articleId);
    if (m.type === 'ajustement' && m.qte > 0) x.lots.push({ cle: m.id, type: 'ajout', date: m.date, ref: m.ref || 'Ajout de stock', qte: m.qte, pa: (C.article(m.articleId) || {}).pa || 0, sortis: 0 });
    else if (m.type === 'vente' || (m.type === 'ajustement' && m.qte < 0)) x.conso -= m.qte;
    else if (m.type === 'annulation' && m.qte > 0) x.conso -= m.qte; // vente annulée : les articles reviennent
  });
  D.ventes.forEach(v => { if (v.annule) return; v.lignes.forEach(l => { if (l.lot && l.articleId) { const x = art(l.articleId); x.choisi[l.lot] = (x.choisi[l.lot] || 0) + l.qte; } }); });
  Object.keys(P).forEach(id => {
    const x = P[id]; x.lots.sort((a, b) => a.date - b.date || (a.cle < b.cle ? -1 : 1));
    let reste = Math.max(0, x.conso);
    x.lots.forEach(l => { const c = Math.min(x.choisi[l.cle] || 0, l.qte, reste); l.sortis += c; reste -= c; });
    x.lots.forEach(l => { const c = Math.min(l.qte - l.sortis, reste); if (c > 0) { l.sortis += c; reste -= c; } });
    if (reste > 0 && x.lots.length) x.lots[x.lots.length - 1].sortis += reste; // vente sans stock : reste négatif sur le dernier lot
    x.lots.forEach(l => { l.reste = Math.round((l.qte - l.sortis) * 1000) / 1000; });
  });
  cacheLots = { cle, parArticle: P };
  return P;
}
const lotsArticle = id => (tousLesLots()[id] || { lots: [] }).lots;
const nomLot = l => l.type === 'achat' ? jourCourt(l.date) + ' · ' + l.ref : jourCourt(l.date) + ' · ' + l.ref;

/* ---------- liste des arrivages (Stock > Arrivages) ---------- */
function arrivages() {
  const P = tousLesLots(), A = {};
  Object.keys(P).forEach(aid => P[aid].lots.forEach(l => {
    const k = l.type === 'achat' ? l.achatId : 'aj-' + new Date(l.date).toDateString();
    const g = A[k] || (A[k] = { cle: k, type: l.type, date: l.date, ref: l.type === 'achat' ? l.ref : 'Ajouts manuels', bon: l.bon || '', fournisseurId: l.fournisseurId, lignes: [] });
    g.lignes.push(Object.assign({ articleId: aid }, l)); if (l.date < g.date) g.date = l.date;
  }));
  return Object.values(A).sort((a, b) => b.date - a.date);
}
const totArr = g => g.lignes.reduce((s, l) => { s.q += l.qte; s.r += Math.max(0, l.reste); s.v += Math.max(0, l.reste) * (l.pa || 0); return s; }, { q: 0, r: 0, v: 0 });
function carteArrivage(g) {
  const t = totArr(g), pc = t.q ? Math.round(100 * t.r / t.q) : 0, f = g.fournisseurId && C.tiers(g.fournisseurId);
  return '<button class="ligne arr" data-a="ficheArrivage" data-id="' + esc(g.cle) + '"><div class="f"><b>' + esc(jourLong(g.date)) + '</b>' +
    '<span>' + esc([g.ref, f ? f.nom : '', g.bon ? 'Bon ' + g.bon : ''].filter(Boolean).join(' · ')) + '</span>' +
    '<i class="jauge"><i style="width:' + pc + '%"></i></i></div>' +
    '<div class="d"><b class="n">' + F(t.r) + ' / ' + F(t.q) + '</b><span>' + (t.r > 0 ? 'restants' : 'tout est sorti') + '</span></div></button>';
}
const stockArrBase = V.stock;
function puceArr() { return '<button class="puce' + (S.f.stab === 'arrivages' ? ' on' : '') + '" data-a="onglet" data-c="stab" data-k="arrivages">Arrivages</button>'; }
const ongletsArr = h => h.replace(/<button class="puce( on)?" data-a="onglet" data-c="stab" data-k="mouvements">/, m => puceArr() + m);
function contenuArr() {
  const q = sansAccent(S.f.arrq || '').trim();
  const L = arrivages().filter(g => !q || sansAccent([jourLong(g.date), jourCourt(g.date), g.ref, g.bon, (C.tiers(g.fournisseurId) || {}).nom || ''].concat(g.lignes.map(l => (C.article(l.articleId) || {}).nom || '')).join(' ')).indexOf(q) >= 0);
  const enStock = L.filter(g => totArr(g).r > 0), vides = L.filter(g => !(totArr(g).r > 0));
  if (!L.length) return '<div class="carte">' + (q ? vide('Aucun arrivage trouvé', 'Cherchez par jour (lundi), date, fournisseur ou article.') : vide('Aucun arrivage', 'Chaque achat enregistré dans Journaux > Achats devient un arrivage, avec sa date et son fournisseur.')) + '</div>';
  return (enStock.length ? '<p class="petit doux gras" style="margin:2px 2px 6px">Encore en stock</p><div class="liste">' + enStock.map(carteArrivage).join('') + '</div>' : '') +
    (vides.length ? '<p class="petit doux gras" style="margin:16px 2px 6px">Entièrement vendus</p><div class="liste">' + vides.slice(0, 60).map(carteArrivage).join('') + '</div>' : '');
}
V.stock = function () {
  const h = ongletsArr(stockArrBase());
  if (S.f.stab !== 'arrivages') return h;
  const i = h.indexOf('</div>', h.indexOf('<div class="puces">')) + 6;
  return h.slice(0, i) + '<div class="cherche" style="margin-bottom:10px">' + ic('loupe') + '<input data-in="arrq" value="' + esc(S.f.arrq || '') + '" placeholder="Chercher : lundi, date, fournisseur, article…" autocomplete="off"></div><div id="arrl">' + contenuArr() + '</div>';
};
I.arrq = v => { S.f.arrq = v; const el = $('#arrl'); if (el) el.innerHTML = contenuArr(); };
A.ficheArrivage = d => {
  const g = arrivages().find(x => x.cle === d.id); if (!g) return;
  const t = totArr(g), f = g.fournisseurId && C.tiers(g.fournisseurId), adm = admin();
  ouvrir(jourLong(g.date), '<p class="petit doux" style="margin-bottom:10px">' + esc([g.ref, f ? f.nom : '', g.bon ? 'Bon ' + g.bon : '', new Date(g.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')) + '</p>' +
    '<div class="grille" style="margin-bottom:12px"><div class="chiffre"><span>Reçus</span><b class="n">' + F(t.q) + '</b></div><div class="chiffre"><span>Encore en stock</span><b class="n">' + F(t.r) + '</b></div>' +
    (adm ? '<div class="chiffre"><span>Valeur restante (achat)</span><b class="n">' + M(Math.round(t.v)) + '</b></div>' : '') + '</div>' +
    '<div class="liste">' + g.lignes.slice().sort((a, b) => b.reste - a.reste).map(l => { const a = C.article(l.articleId) || { nom: '?' };
      return '<button class="ligne" data-a="ficheArticle" data-id="' + l.articleId + '"><div class="f"><b>' + esc(a.nom) + '</b><span>Reçus ' + F(l.qte) + ' · sortis ' + F(l.sortis) + (adm ? ' · acheté ' + M(l.pa) : '') + '</span></div><div class="d"><b class="n' + (l.reste > 0 ? '' : ' doux') + '">' + F(l.reste) + '</b><span>restant' + (Math.abs(l.reste) > 1 ? 's' : '') + '</span></div></button>'; }).join('') + '</div>' +
    (g.type === 'achat' && adm ? '<button class="btn f large" style="margin-top:12px" data-a="detailAchat" data-id="' + g.cle + '">Voir le bon d’achat</button>' : '') +
    '<p class="petit doux" style="margin-top:12px">Les ventes puisent d’abord dans l’arrivage le plus ancien, sauf si un autre arrivage est choisi à la caisse.</p>');
};

/* ---------- fiche article : stock par arrivage ---------- */
const ficheArticleArrBase = ficheArticle;
ficheArticle = function (id) {
  ficheArticleArrBase(id);
  const L = lotsArticle(id), restants = L.filter(l => l.reste > 0).reverse(); if (!L.length) return;
  const liste = $('#modale .liste'); if (!liste) return;
  liste.insertAdjacentHTML('afterend', '<p class="petit doux gras" style="margin:14px 2px 6px">Par arrivage</p><div class="liste">' +
    (restants.length ? restants.map(l => '<button class="ligne" data-a="ficheArrivage" data-id="' + esc(l.type === 'achat' ? l.achatId : 'aj-' + new Date(l.date).toDateString()) + '"><div class="f"><b>' + esc(jourLong(l.date)) + '</b><span>' + esc(l.type === 'achat' ? l.ref + ((C.tiers(l.fournisseurId) || {}).nom ? ' · ' + C.tiers(l.fournisseurId).nom : '') : l.ref) + '</span></div><div class="d"><b class="n">' + F(l.reste) + '</b><span>sur ' + F(l.qte) + '</span></div></button>').join('')
      : '<div class="ligne"><div class="f"><span>Aucun arrivage en stock</span></div></div>') + '</div>');
};

/* ---------- caisse : choisir l'arrivage (option) ---------- */
const lotsEnStock = aid => lotsArticle(aid).filter(l => l.reste > 0);
const caisseArrBase = V.caisse;
V.caisse = function () {
  let h = caisseArrBase();
  if (!C.db.meta.opt.choixLot) return h;
  S.panier.lignes.forEach((l, i) => {
    if (l.libre) return;
    const L = lotsEnStock(l.articleId); if (L.length < 2 && !l.lot) return;
    const sel = '<label class="lotc"><span>Arrivage</span><select data-ch="pLot" data-i="' + i + '"><option value="">Le plus ancien (automatique)</option>' +
      L.map(x => '<option value="' + esc(x.cle) + '"' + (l.lot === x.cle ? ' selected' : '') + '>' + esc(nomLot(x)) + ' (' + F(x.reste) + ' restants)</option>').join('') + '</select></label>';
    h = h.replace(new RegExp('(<div class="pl" data-i="' + i + '">[\\s\\S]*?<span class="st">[^<]*</span>)'), '$1' + sel);
  });
  return h;
};
CH.pLot = (v, el) => { const l = S.panier.lignes[+el.dataset.i]; if (l) l.lot = v || undefined; };
const pValiderArrBase = A.pValider;
A.pValider = () => {
  const p = S.panier, lots = p.lignes.map(l => l.lot);
  const avant = C.creerVente, avantR = C.remplacerVente;
  C.creerVente = function (o) { o.lignes.forEach((l, i) => { if (lots[i]) l.lot = lots[i]; }); return avant.call(this, o); };
  try { pValiderArrBase(); } finally { C.creerVente = avant; C.remplacerVente = avantR; }
};

/* ---------- réglage ---------- */
const reglagesArrBase = V.reglages;
V.reglages = function () {
  return reglagesArrBase().replace('<span>Autoriser la caisse à modifier le prix de vente</span></label>', '<span>Autoriser la caisse à modifier le prix de vente</span></label>' +
    '<label class="coche" style="margin:12px 0 0"><input type="checkbox" data-ch="optLot"' + (C.db.meta.opt.choixLot ? ' checked' : '') + '><span>À la caisse, permettre de choisir l’arrivage (lundi, vendredi…) d’où sort l’article</span></label>');
};
CH.optLot = (v, el) => { C.db.meta.opt.choixLot = el.checked; sauver(); toast(el.checked ? 'Choix de l’arrivage activé à la caisse' : 'Choix de l’arrivage désactivé'); };

/* ---------- option : un trait entre chaque article sur la facture (2.7.1) ---------- */
{
const majTraits = () => document.body.classList.toggle('traits-fact', !!(C.db && C.db.meta.opt && C.db.meta.opt.traitsFact));
const ouvrirTraitsBase = ouvrir;
ouvrir = function (t, h) { majTraits(); return ouvrirTraitsBase(t, h); };
const reglagesTraitsBase = V.reglages;
V.reglages = function () {
  const h = reglagesTraitsBase(), k = '<span>Autoriser la caisse à modifier le prix de vente</span></label>';
  const o = '<label class="coche" style="margin:12px 0 0"><input type="checkbox" data-ch="optTraits"' + (C.db.meta.opt.traitsFact ? ' checked' : '') + '><span>Sur les factures, tracer un trait entre chaque article</span></label>';
  return h.includes(k) ? h.replace(k, k + o) : h;
};
CH.optTraits = (v, el) => { C.db.meta.opt.traitsFact = el.checked; sauver(); majTraits(); toast(el.checked ? 'Les factures auront un trait entre chaque article' : 'Factures sans trait entre les articles'); };
}
