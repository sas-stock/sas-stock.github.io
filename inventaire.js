/* SAS STOCK — inventaires (2.8.0)
   Un inventaire = un comptage physique d'un dépôt (toutes familles ou une seule).
   Brouillon : les quantités comptées sont gardées (et synchronisées) jusqu'à la validation.
   Validation (gérant) : le stock de chaque article compté devient la quantité comptée ;
   l'écart passe par un mouvement « ajustement » (réf. « Inventaire I-00001 »). Les articles non comptés ne changent pas. */
{
const invs = () => { const d = C.db; if (!d) return []; if (!d.inventaires) d.inventaires = []; if (d.meta && d.meta.seq && d.meta.seq.I == null) d.meta.seq.I = 0; return d.inventaires; };
LISTES.i = 'inventaires';
const videInvBase = C.vide;
C.vide = function () { const d = videInvBase(); d.inventaires = []; d.meta.seq.I = 0; return d; };
const entitesInvBase = entites;
entites = function () { invs(); return entitesInvBase(); };
const appliquerInvBase = appliquer;
appliquer = function (docs) {
  invs(); const r = appliquerInvBase(docs);
  if (r) C.db.inventaires.forEach(x => { const n = parseInt(String(x.num).split('-')[1], 10); if (n > C.db.meta.seq.I) C.db.meta.seq.I = n; });
  return r;
};

const nbr = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'); if (s === '') return null; const n = Number(s); return isFinite(n) && n >= 0 ? n : NaN; };
const inv = id => invs().find(x => x.id === id);
const nomDepot = id => (C.depot(id) || {}).nom || 'Dépôt';
const portee = x => nomDepot(x.depotId) + ' · ' + (x.familleId ? ((C.famille(x.familleId) || {}).nom || 'Famille') : 'Toutes familles');
// articles concernés : calculés à l'affichage, donc un article créé après le début de l'inventaire y apparaît aussi
const articlesInv = x => C.db.articles.filter(a => a.actif !== false && (!x.familleId || a.familleId === x.familleId)).sort((a, b) => a.nom.localeCompare(b.nom));
const nbComptes = x => articlesInv(x).filter(a => x.comptes[a.id] != null).length;
const pa = a => +a.pa || 0;

/* ---------- onglet Stock > Inventaires ---------- */
const stockInvBase = V.stock;
const puceInv = () => '<button class="puce' + (S.f.stab === 'inventaires' ? ' on' : '') + '" data-a="onglet" data-c="stab" data-k="inventaires">Inventaires</button>';
function contenuInv() {
  const L = invs().slice().sort((a, b) => b.date - a.date), enCours = L.filter(x => x.statut !== 'valide'), finis = L.filter(x => x.statut === 'valide'), adm = admin();
  let h = adm ? '<button class="btn p large" style="margin-bottom:12px" data-a="invNouveau">' + ic('ajout') + 'Nouvel inventaire</button>' : '';
  if (!L.length) return h + '<div class="carte">' + vide('Aucun inventaire', adm ? 'Un inventaire, c’est compter ce qui est vraiment dans le dépôt. L’application compare avec le stock et corrige les écarts en une fois.' : 'Le gérant lance l’inventaire ; vous pourrez ensuite saisir les quantités comptées ici.') + '</div>';
  if (enCours.length) h += '<p class="petit doux gras" style="margin:2px 2px 6px">En cours</p><div class="liste">' + enCours.map(x => { const n = articlesInv(x).length, c = nbComptes(x);
    return '<button class="ligne" data-a="invOuvrir" data-id="' + x.id + '"><div class="f"><b>' + esc(x.num) + ' · ' + esc(portee(x)) + '</b><span>Commencé le ' + dj(x.date) + ' par ' + esc((C.user(x.userId) || {}).nom || '') + '</span></div><div class="d"><b class="n">' + F(c) + ' / ' + F(n) + '</b><span>comptés</span></div></button>'; }).join('') + '</div>';
  if (finis.length) h += '<p class="petit doux gras" style="margin:16px 2px 6px">Terminés</p><div class="liste">' + finis.map(x => { const t = totaux(x);
    return '<button class="ligne" data-a="invRapport" data-id="' + x.id + '"><div class="f"><b>' + esc(x.num) + ' · ' + esc(portee(x)) + '</b><span>Validé le ' + dj(x.valideLe) + ' · ' + F(x.lignes.length) + ' article' + (x.lignes.length > 1 ? 's' : '') + ' compté' + (x.lignes.length > 1 ? 's' : '') + '</span></div><div class="d">' +
      (t.nb ? '<b class="n">' + (adm ? (t.net > 0 ? '+' : '') + M(t.net) : F(t.nb) + ' écart' + (t.nb > 1 ? 's' : '')) + '</b><span>' + (adm ? F(t.nb) + ' écart' + (t.nb > 1 ? 's' : '') : '') + '</span>' : '<b class="n">0</b><span>aucun écart</span>') + '</div></button>'; }).join('') + '</div>';
  return h;
}
V.stock = function () {
  invs();
  const h = stockInvBase().replace(/<button class="puce( on)?" data-a="onglet" data-c="stab" data-k="mouvements">/, m => puceInv() + m);
  if (S.f.stab !== 'inventaires') return h;
  const i = h.indexOf('</div>', h.indexOf('<div class="puces">')) + 6;
  return h.slice(0, i) + '<div id="invt">' + contenuInv() + '</div>';
};

/* ---------- créer ---------- */
A.invNouveau = () => {
  if (!admin()) return;
  formulaire('Nouvel inventaire', [
    { t: 'texte', l: 'Choisissez ce que vous allez compter. Vous pourrez saisir les quantités en plusieurs fois, sur un ou plusieurs appareils, puis valider à la fin.' },
    { n: 'depot', l: 'Dépôt', t: 'select', opts: C.db.depots.map(d => [d.id, d.nom]), v: (C.db.depots[0] || {}).id },
    { n: 'fam', l: 'Articles à compter', t: 'select', opts: [['', 'Tous les articles']].concat(C.db.familles.map(f => [f.id, 'Famille : ' + f.nom])) }],
  v => {
    const ouvert = invs().find(x => x.statut !== 'valide' && x.depotId === v.depot && (x.familleId || '') === (v.fam || ''));
    if (ouvert) { const e = new Error('Un inventaire de ce dépôt est déjà en cours (' + ouvert.num + '). Terminez-le ou supprimez-le d’abord.'); e.metier = true; throw e; }
    const x = { id: C.uid(), num: C.numero('I'), date: Date.now(), depotId: v.depot, familleId: v.fam || '', userId: S.user.id, statut: 'brouillon', comptes: {} };
    invs().push(x); S.inv = { id: x.id, f: 'tous', q: '' };
    return () => ecranComptage();
  }, { ok: 'Commencer le comptage' });
};

/* ---------- compter ---------- */
let tInv = null;
const enregistrer = () => { clearTimeout(tInv); tInv = setTimeout(() => { const x = S.inv && inv(S.inv.id); if (x) x.maj = Date.now(); sauver(); }, 500); };
function lignesComptage(x) {
  const adm = admin(), f = S.inv.f, mots = sansAccent(S.inv.q).trim().split(/\s+/).filter(Boolean);
  let L = articlesInv(x).filter(a => mots.every(m => sansAccent(a.nom + ' ' + (a.code || '')).indexOf(m) >= 0));
  if (f === 'reste') L = L.filter(a => x.comptes[a.id] == null);
  if (f === 'faits') L = L.filter(a => x.comptes[a.id] != null);
  if (f === 'ecarts') L = L.filter(a => x.comptes[a.id] != null && x.comptes[a.id] !== C.qte(a.id, x.depotId));
  if (!L.length) return '<div class="carte">' + vide(mots.length ? 'Aucun article trouvé' : f === 'reste' ? 'Tout est compté' : 'Rien à afficher', f === 'reste' && !mots.length ? (adm ? 'Vous pouvez valider l’inventaire.' : 'Prévenez le gérant pour qu’il valide l’inventaire.') : '') + '</div>';
  return '<div class="liste">' + L.slice(0, 300).map(a => {
    const c = x.comptes[a.id], prevu = C.qte(a.id, x.depotId), e = c == null ? 0 : c - prevu;
    return '<div class="ligne invl"><div class="f"><b>' + esc(a.nom) + '</b><span>' + esc([a.code, a.unite || 'pièce'].filter(Boolean).join(' · ')) + (adm ? ' · prévu ' + F(prevu) : '') + '</span>' +
      (adm ? '<span class="invE" data-e="' + a.id + '">' + badge(c, e) + '</span>' : '') + '</div>' +
      '<input class="invQ" inputmode="decimal" data-in="invq" data-id="' + a.id + '" value="' + (c == null ? '' : c) + '" placeholder="Compté" aria-label="Quantité comptée de ' + esc(a.nom) + '"></div>';
  }).join('') + '</div>' + (L.length > 300 ? '<p class="petit doux" style="margin-top:8px">300 premiers articles affichés : cherchez un nom pour trouver les autres.</p>' : '');
}
const badge = (c, e) => c == null ? '' : e === 0 ? '<span class="etiq">juste</span>' : '<span class="etiq ' + (e < 0 ? 'ko' : 'al') + '">' + (e > 0 ? '+' : '') + F(e) + '</span>';
function progres(x) { const n = articlesInv(x).length, c = nbComptes(x); return '<div class="invP"><div style="width:' + (n ? Math.round(c / n * 100) : 0) + '%"></div></div><p class="petit doux" style="margin:6px 0 10px"><b>' + F(c) + ' / ' + F(n) + '</b> articles comptés</p>'; }
function ecranComptage() {
  const x = S.inv && inv(S.inv.id); if (!x) return fermer();
  const adm = admin(), F2 = [['tous', 'Tous'], ['reste', 'À compter'], ['faits', 'Comptés']].concat(adm ? [['ecarts', 'Écarts']] : []);
  ouvrir('Inventaire ' + x.num, '<p class="petit doux" style="margin-bottom:8px">' + esc(portee(x)) + ' · commencé le ' + dj(x.date) + '</p><div id="invp">' + progres(x) + '</div>' +
    '<div class="cherche">' + ic('loupe') + '<input id="invr" data-in="invr" value="' + esc(S.inv.q) + '" placeholder="Nom ou code de l’article" autocomplete="off" enterkeyhint="search"></div>' +
    '<div class="puces" style="margin:8px 0">' + F2.map(p => '<button class="puce' + (S.inv.f === p[0] ? ' on' : '') + '" data-a="invFiltre" data-k="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' +
    '<div id="invl">' + lignesComptage(x) + '</div>' +
    '<div class="rangee" style="margin-top:14px"><button class="btn f" data-a="invFeuille">' + ic('imprime') + 'Feuille de comptage</button>' + (adm ? '<button class="btn f d" data-a="invSupprimer">Supprimer</button>' : '') + '</div>' +
    (adm ? '<button class="btn p large" style="margin-top:8px" data-a="invVerifier">Vérifier et valider</button>' : '<p class="petit doux" style="margin-top:10px">Vos quantités sont enregistrées au fur et à mesure. Le gérant validera l’inventaire.</p>') +
    '<p class="petit doux" style="margin-top:10px">Comptez ce qui est vraiment dans le dépôt. Laissez vide un article pas encore compté : son stock ne changera pas.</p>');
}
A.invOuvrir = d => { S.inv = { id: d.id, f: 'tous', q: '' }; ecranComptage(); };
A.invFiltre = d => { S.inv.f = d.k; document.querySelectorAll('#modale .puces .puce').forEach(b => b.classList.toggle('on', b.dataset.k === d.k)); const x = inv(S.inv.id), el = $('#invl'); if (x && el) el.innerHTML = lignesComptage(x); };
I.invr = v => { S.inv.q = v; const x = inv(S.inv.id), el = $('#invl'); if (x && el) el.innerHTML = lignesComptage(x); };
I.invq = (v, el) => {
  const x = S.inv && inv(S.inv.id); if (!x || x.statut === 'valide') return;
  const id = el.dataset.id, n = nbr(v);
  if (Number.isNaN(n)) { el.classList.add('err'); return; } el.classList.remove('err');
  if (n == null) delete x.comptes[id]; else x.comptes[id] = n;
  const b = document.querySelector('[data-e="' + id + '"]'); if (b) b.innerHTML = badge(n, n == null ? 0 : n - C.qte(id, x.depotId));
  const p = $('#invp'); if (p) p.innerHTML = progres(x);
  enregistrer();
};
// lecteur de code-barres / touche Entrée : code exact → on va directement à la case de l'article
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target) return;
  if (e.target.id === 'invr') {
    const x = inv(S.inv.id), q = sansAccent(e.target.value).trim(); if (!x || !q) return; e.preventDefault();
    const a = articlesInv(x).find(y => sansAccent(y.code || '') === q) || (articlesInv(x).filter(y => sansAccent(y.nom + ' ' + (y.code || '')).indexOf(q) >= 0).length === 1 ? articlesInv(x).find(y => sansAccent(y.nom + ' ' + (y.code || '')).indexOf(q) >= 0) : null);
    if (!a) return toast('Aucun article avec ce code', true);
    S.inv.q = a.code || a.nom; e.target.value = S.inv.q; $('#invl').innerHTML = lignesComptage(x);
    const i = document.querySelector('.invQ[data-id="' + a.id + '"]'); if (i) { i.focus(); i.select(); }
  } else if (e.target.classList && e.target.classList.contains('invQ')) {
    e.preventDefault(); const r = $('#invr'); if (r) { r.value = ''; S.inv.q = ''; const x = inv(S.inv.id); if (x) $('#invl').innerHTML = lignesComptage(x); r.focus(); }
  }
});

/* ---------- feuille de comptage (papier) ---------- */
A.invFeuille = () => {
  const x = inv(S.inv.id); if (!x) return; const sh = C.db.meta.shop;
  ouvrir('Feuille de comptage', '<div class="facture"><p class="gras" style="font-size:1.05rem">' + esc(sh.nom) + '</p><p>Inventaire ' + esc(x.num) + ' · ' + esc(portee(x)) + '</p><p class="petit doux" style="margin-bottom:10px">Imprimé le ' + dj(Date.now()) + '</p>' +
    '<table class="f-tab traitsL"><thead><tr><th>Article</th><th>Code</th><th>Unité</th><th style="width:28%">Quantité comptée</th></tr></thead><tbody>' +
    articlesInv(x).map(a => '<tr><td>' + esc(a.nom) + '</td><td>' + esc(a.code || '') + '</td><td class="c">' + esc(a.unite || 'pièce') + '</td><td></td></tr>').join('') + '</tbody></table>' +
    '<p style="margin-top:16px">Compté par : ............................................ &nbsp; Date : ....................</p><p style="margin-top:10px">Signature :</p></div>' +
    '<div class="rangee nonimp" style="margin-top:14px"><button class="btn f" data-a="invRetour">Retour</button><button class="btn p" data-a="imprimer">' + ic('imprime') + 'Imprimer</button></div>');
};
A.invRetour = () => ecranComptage();

/* ---------- supprimer un brouillon ---------- */
A.invSupprimer = () => {
  const x = inv(S.inv.id); if (!x || !admin()) return;
  confirmer('Supprimer l’inventaire ' + x.num, 'Les quantités déjà comptées seront perdues. Le stock ne change pas.', 'Supprimer', () => {
    C.db.inventaires = invs().filter(y => y.id !== x.id); S.inv = null; sauver(); fermer(); rendre(); toast('Inventaire ' + x.num + ' supprimé');
  }, true);
};

/* ---------- vérifier puis valider ---------- */
function ecarts(x) {
  return articlesInv(x).filter(a => x.comptes[a.id] != null).map(a => { const t = C.qte(a.id, x.depotId), c = x.comptes[a.id]; return { a: a.id, nom: a.nom, theo: t, c, e: c - t, pa: pa(a) }; });
}
function totaux(x) {
  const L = x.statut === 'valide' ? x.lignes : ecarts(x), E = L.filter(l => l.e !== 0);
  const moins = E.filter(l => l.e < 0).reduce((s, l) => s + l.e * l.pa, 0), plus = E.filter(l => l.e > 0).reduce((s, l) => s + l.e * l.pa, 0);
  return { nb: E.length, moins: Math.round(moins), plus: Math.round(plus), net: Math.round(moins + plus), E };
}
function tableEcarts(E, adm) {
  if (!E.length) return '<div class="carte">' + vide('Aucun écart', 'Le stock compté correspond au stock enregistré.') + '</div>';
  return '<table class="f-tab traitsL"><thead><tr><th>Article</th><th>Prévu</th><th>Compté</th><th>Écart</th>' + (adm ? '<th>Valeur (achat)</th>' : '') + '</tr></thead><tbody>' +
    E.slice().sort((a, b) => a.e * a.pa - b.e * b.pa).map(l => '<tr><td>' + esc(l.nom) + '</td><td class="c n">' + F(l.theo) + '</td><td class="c n">' + F(l.c) + '</td><td class="c n gras">' + (l.e > 0 ? '+' : '') + F(l.e) + '</td>' + (adm ? '<td class="d n">' + (l.e > 0 ? '+' : '') + M(Math.round(l.e * l.pa)) + '</td>' : '') + '</tr>').join('') + '</tbody></table>';
}
function blocTotaux(t, nbC, nbN) {
  return '<div class="grille" style="margin-bottom:12px"><div class="chiffre"><span>Articles comptés</span><b class="n">' + F(nbC) + '</b>' + (nbN ? '<span>' + F(nbN) + ' non compté' + (nbN > 1 ? 's' : '') + ' (inchangé' + (nbN > 1 ? 's' : '') + ')</span>' : '') + '</div>' +
    '<div class="chiffre"><span>Manquants (valeur d’achat)</span><b class="n">' + M(-t.moins) + '</b></div><div class="chiffre"><span>En trop (valeur d’achat)</span><b class="n">' + M(t.plus) + '</b></div>' +
    '<div class="chiffre fort"><span>Écart net</span><b class="n">' + (t.net > 0 ? '+' : '') + M(t.net) + '</b></div></div>';
}
A.invVerifier = () => {
  const x = inv(S.inv.id); if (!x || !admin()) return;
  const nbC = nbComptes(x), nbN = articlesInv(x).length - nbC;
  if (!nbC) return toast('Saisissez au moins une quantité comptée.', true);
  const t = totaux(x);
  ouvrir('Valider l’inventaire ' + x.num, '<p class="petit doux" style="margin-bottom:10px">' + esc(portee(x)) + '</p>' + blocTotaux(t, nbC, nbN) +
    '<p class="petit doux gras" style="margin:4px 2px 6px">' + (t.nb ? F(t.nb) + ' article' + (t.nb > 1 ? 's' : '') + ' avec un écart' : 'Écarts') + '</p>' + tableEcarts(t.E, true) +
    '<p class="petit doux" style="margin-top:12px">En validant, le stock de chaque article compté devient la quantité comptée. Chaque correction apparaît dans Stock > Mouvements sous « Inventaire ' + esc(x.num) + ' ». Cette action ne s’annule pas.</p>' +
    '<div class="rangee" style="margin-top:12px"><button class="btn f" data-a="invRetour">Continuer le comptage</button><button class="btn f p" data-a="invValider">Valider l’inventaire</button></div>');
};
A.invValider = () => {
  const x = inv(S.inv.id); if (!x || !admin() || x.statut === 'valide') return;
  const ok = agir(() => {
    const L = ecarts(x), ref = 'Inventaire ' + x.num;
    L.forEach(l => { if (l.e !== 0) C.ajuster(l.a, x.depotId, l.c, ref, S.user.id); });
    x.lignes = L; x.statut = 'valide'; x.valideLe = Date.now(); x.valideePar = S.user.id; x.nonComptes = articlesInv(x).length - L.length; x.comptes = {};
  });
  if (!ok) return;
  S.f.stab = 'inventaires'; rendre(); A.invRapport({ id: x.id }); toast('Inventaire ' + x.num + ' validé : stock corrigé');
};

/* ---------- rapport d'un inventaire terminé ---------- */
A.invRapport = d => {
  const x = inv(d.id); if (!x) return; const adm = admin(), t = totaux(x), sh = C.db.meta.shop;
  ouvrir('Inventaire ' + x.num, '<div class="facture"><p class="gras" style="font-size:1.05rem">' + esc(sh.nom) + '</p><p>Inventaire ' + esc(x.num) + ' · ' + esc(portee(x)) + '</p>' +
    '<p class="petit doux" style="margin-bottom:12px">Commencé le ' + dj(x.date) + ' · validé le ' + dj(x.valideLe) + ' par ' + esc((C.user(x.valideePar) || {}).nom || '') + '</p>' +
    (adm ? blocTotaux(t, x.lignes.length, x.nonComptes || 0) : '') + '<p class="gras" style="margin:6px 0">' + (t.nb ? F(t.nb) + ' écart' + (t.nb > 1 ? 's' : '') : 'Écarts') + '</p>' + tableEcarts(t.E, adm) +
    (x.lignes.length > t.nb ? '<details style="margin-top:12px"><summary class="petit">Voir les ' + F(x.lignes.length - t.nb) + ' articles sans écart</summary><p class="petit doux" style="margin-top:6px">' + x.lignes.filter(l => l.e === 0).map(l => esc(l.nom) + ' (' + F(l.c) + ')').join(', ') + '</p></details>' : '') +
    '<p style="margin-top:18px">Signature :</p></div><div class="rangee nonimp" style="margin-top:14px"><button class="btn f" data-a="imprimer">' + ic('imprime') + 'Imprimer</button></div>');
};
}
