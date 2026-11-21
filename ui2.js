/* SAS STOCK — interface (2/2) : journaux, achats, clients, rapports, réglages, événements */
'use strict';
const nomU = id => (C.user(id) || {}).nom || '—';
const nomT = id => (C.tiers(id) || {}).nom || '—';
function table(tetes, lignes) {
  return '<div class="carte" style="padding:4px 4px;overflow-x:auto"><table class="t"><thead><tr>' + tetes.map(t => '<th' + (t[1] ? ' class="d"' : '') + '>' + t[0] + '</th>').join('') + '</tr></thead><tbody>' +
    lignes.map(l => '<tr>' + l.map((c, i) => '<td class="' + (tetes[i][1] ? 'd n' : '') + '">' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
const cl = (l, v, c) => '<div class="' + (c || '') + '"><span>' + l + '</span><span class="n">' + v + '</span></div>';

/* ---------- journaux ---------- */
V.journal = function () {
  const f = S.f; f.jtab = f.jtab || 'ventes'; if (!admin() && f.jtab === 'achats') f.jtab = 'ventes';
  const b = bornes(), dans = x => x.date >= b[0] && x.date <= b[1] && (admin() || x.userId === S.user.id);
  let h = '<div class="titre"><h1>Journaux</h1><div class="rangee">' +
    (f.jtab === 'achats' ? '<button class="btn mini p" data-a="nouvelAchat">' + ic('ajout') + 'Achat</button>' : f.jtab === 'depenses' ? '<button class="btn mini p" data-a="formDepense">' + ic('ajout') + 'Dépense</button>' : '') + '</div></div>' +
    puces('jtab', [['ventes', 'Ventes']].concat(admin() ? [['achats', 'Achats']] : [], [['depenses', 'Dépenses'], ['reglements', 'Règlements']])) + barrePer();
  const resume = (n, mot, tot) => '<p class="petit doux" style="margin:0 2px 6px">' + n + ' ' + mot + (n > 1 ? 's' : '') + ', total <b class="n">' + M(tot) + '</b></p>';
  if (f.jtab === 'ventes' && window.listeVentesJ) return h + rechVentes() + '<div id="jl">' + listeVentesJ() + '</div>';
  if (f.jtab === 'ventes') {
    const L = C.db.ventes.filter(dans).reverse(), ok = L.filter(v => !v.annule);
    return h + (L.length ? resume(ok.length, 'vente', ok.reduce((s, v) => s + v.total, 0)) + '<div class="liste">' + L.slice(0, 300).map(ligneVente).join('') + '</div>' : '<div class="carte">' + vide('Aucune vente sur cette période', 'Changez la période ou enregistrez une vente à la caisse.') + '</div>');
  }
  if (f.jtab === 'achats') {
    const L = C.db.achats.filter(dans).reverse(), ok = L.filter(v => !v.annule);
    return h + (L.length ? resume(ok.length, 'achat', ok.reduce((s, v) => s + v.total, 0)) + '<div class="liste">' + L.slice(0, 300).map(a => { const du = a.total - a.paye;
      return '<button class="ligne" data-a="detailAchat" data-id="' + a.id + '"><div class="f"><b>' + esc(nomT(a.fournisseurId)) + '</b><span>' + a.num + (a.ref ? ', BL ' + esc(a.ref) : '') + ', ' + dh(a.date) + '</span></div>' +
        '<div class="d"><b class="n">' + M(a.total) + '</b><span>' + (a.annule ? '<span class="etiq ko">Annulé</span>' : du > 0 ? '<span class="etiq al">Reste ' + M(du) + '</span>' : '<span class="etiq">Payé</span>') + '</span></div></button>'; }).join('') + '</div>'
      : '<div class="carte">' + vide('Aucun achat sur cette période', 'Touchez « Achat » pour enregistrer un bon de livraison.') + '</div>');
  }
  if (f.jtab === 'depenses') {
    const L = C.db.depenses.filter(dans).reverse();
    return h + (L.length ? resume(L.length, 'dépense', L.reduce((s, d) => s + d.montant, 0)) + '<div class="liste">' + L.slice(0, 300).map(d =>
      '<' + (admin() ? 'button data-a="supprDepense" data-id="' + d.id + '"' : 'div') + ' class="ligne"><div class="f"><b>' + esc(d.libelle) + '</b><span>' + esc(d.categorie + ', ' + dh(d.date) + ', ' + nomU(d.userId)) + '</span></div><div class="d"><b class="n">' + M(d.montant) + '</b></div></' + (admin() ? 'button' : 'div') + '>').join('') + '</div>'
      : '<div class="carte">' + vide('Aucune dépense sur cette période', 'Touchez « Dépense » pour en noter une.') + '</div>');
  }
  const L = C.db.reglements.filter(dans).reverse();
  return h + (L.length ? '<div class="liste">' + L.slice(0, 300).map(r =>
    '<button class="ligne" data-a="ticketRecu" data-id="' + r.id + '"><div class="f"><b>' + esc(nomT(r.tiersId)) + '</b><span>' + esc((r.type === 'client' ? 'Reçu du client' : 'Payé au fournisseur') + ', ' + r.mode + ', ' + dh(r.date)) + '</span></div><div class="d"><b class="n ' + (r.type === 'client' ? 'vert' : 'rouge') + '">' + (r.type === 'client' ? '+' : '-') + M(r.montant) + '</b></div></button>').join('') + '</div>'
    : '<div class="carte">' + vide('Aucun règlement sur cette période', 'Les paiements des crédits clients et des dettes fournisseurs apparaîtront ici.') + '</div>');
};
function detailAchat(id) {
  const a = C.par(C.db.achats, id), d = C.depot(a.depotId);
  ouvrir('Achat ' + a.num, '<p class="doux petit" style="margin-bottom:8px">' + esc(nomT(a.fournisseurId) + ', ' + dh(a.date) + (a.ref ? ', BL ' + a.ref : '') + ', reçu dans ' + (d ? d.nom : '')) + '</p>' +
    table([['Article'], ['Qté', 1], ['Prix', 1], ['Total', 1]], a.lignes.map(l => [esc(l.nom), F(l.qte), F(l.pu), F(l.qte * l.pu)])) +
    '<div class="carte compte" style="margin-top:10px">' + cl('Total', M(a.total)) + cl('Payé', M(a.paye)) + cl('Reste dû', M(a.total - a.paye), 'tot') + '</div>' +
    (a.annule ? '<p class="centre gras rouge" style="margin-top:10px">Achat annulé</p>' : '<button class="btn d large" style="margin-top:10px" data-a="annulerAchat" data-id="' + id + '">Annuler cet achat</button>'));
}
const CATS = ['Transport', 'Loyer', 'Salaires', 'Électricité et eau', 'Téléphone et Internet', 'Entretien', 'Divers'];

/* ---------- nouvel achat ---------- */
V.achat = function () {
  const a = S.ach, tot = totalPanier(a), fs = C.db.tiers.filter(t => t.type === 'fournisseur').sort((x, y) => x.nom.localeCompare(y.nom));
  return '<div class="titre"><h1>Nouvel achat</h1><button class="btn mini" data-a="aAnnuler">Abandonner</button></div><div class="caisse2"><div>' +
    (a.lignes.length ? '<div class="liste panier" style="margin-bottom:10px">' + a.lignes.map((l, i) => { const ar = C.article(l.articleId);
      return '<div class="pl" data-i="' + i + '"><div class="nm"><span>' + esc(ar.nom) + '</span><span class="n" data-lt>' + M(l.qte * l.pu) + '</span></div><span class="st">Qté et prix d’achat</span>' +
        '<input inputmode="decimal" data-in="aq" value="' + (isNaN(l.qte) ? '' : l.qte) + '" aria-label="Quantité"><input inputmode="numeric" data-in="ap" value="' + (isNaN(l.pu) ? '' : l.pu) + '" aria-label="Prix d’achat unitaire"><button class="x" data-a="aRetire" aria-label="Retirer">×</button></div>'; }).join('') + '</div>' : '') +
    '<div class="cherche">' + ic('loupe') + '<input id="rech" data-in="arech" placeholder="Tapez le nom ou le code d’un article" autocomplete="off"></div><div id="res" style="margin-top:8px"></div>' +
    '<button class="btn" style="margin-top:8px" data-a="formArticle" data-pour="achat">' + ic('ajout') + 'Créer un nouvel article</button></div>' +
    '<div class="carte" style="margin-top:14px"><div class="compte"><div class="tot" style="border:0;margin:0"><span>Total de l’achat</span><span class="n" id="ctot">' + M(tot) + '</span></div></div>' +
    '<label class="ch" style="margin-top:8px"><span>Fournisseur</span><div class="rangee"><select class="f" data-ch="aFourn"><option value="">Choisir…</option>' + fs.map(x => '<option value="' + x.id + '"' + (a.fournisseurId === x.id ? ' selected' : '') + '>' + esc(x.nom) + '</option>').join('') + '</select>' +
    '<button type="button" class="btn mini" data-a="nouveauTiers" data-type="fournisseur" data-pour="achat">Nouveau</button></div></label>' +
    '<label class="ch"><span>Reçu dans le dépôt</span><select data-ch="aDepot">' + C.db.depots.map(d => '<option value="' + d.id + '"' + (a.depotId === d.id ? ' selected' : '') + '>' + esc(d.nom) + '</option>').join('') + '</select></label>' +
    '<label class="ch"><span>N° du bon de livraison (facultatif)</span><input data-in="aref" value="' + esc(a.ref) + '" autocomplete="off"></label>' +
    '<label class="ch"><span>Montant payé au fournisseur</span><input inputmode="numeric" data-in="apaye" id="precu" value="' + (a.paye == null ? '' : a.paye) + '" placeholder="' + F(tot) + ' (tout est payé)"></label>' +
    '<button class="btn p large" data-a="aValider">Enregistrer l’achat</button></div></div>';
};
function majAchat() {
  const a = S.ach, tot = totalPanier(a);
  document.querySelectorAll('.panier .pl').forEach(el => { const l = a.lignes[+el.dataset.i]; $('[data-lt]', el).textContent = M(l.qte > 0 && l.pu >= 0 ? l.qte * l.pu : 0); });
  $('#ctot').textContent = M(tot); $('#precu').placeholder = F(tot) + ' (tout est payé)';
}
apres.achat = function () { if (S.focusRech) { S.focusRech = false; const r = $('#rech'); if (r) try { r.focus(); } catch (e) {} } };

/* ---------- clients et fournisseurs ---------- */
V.tiers = function () {
  const f = S.f; f.ttab = admin() ? f.ttab || 'client' : 'client';
  const cli = f.ttab === 'client';
  return '<div class="titre"><h1>' + (cli ? 'Clients' : 'Fournisseurs') + '</h1><button class="btn mini p" data-a="nouveauTiers" data-type="' + f.ttab + '">' + ic('ajout') + (cli ? 'Client' : 'Fournisseur') + '</button></div>' +
    (admin() ? puces('ttab', [['client', 'Clients'], ['fournisseur', 'Fournisseurs']]) : '') +
    '<div class="cherche" style="margin-bottom:10px">' + ic('loupe') + '<input data-in="tq" value="' + esc(f.tq || '') + '" placeholder="Chercher un nom ou un numéro" autocomplete="off"></div><div id="tl">' + listeTiers() + '</div>';
};
function listeTiers() {
  const f = S.f, q = sansAccent(f.tq).trim(), cli = f.ttab === 'client';
  const L = C.db.tiers.filter(t => t.type === f.ttab && (!q || sansAccent(t.nom + ' ' + (t.tel || '')).indexOf(q) >= 0)).map(t => ({ t, du: C.solde(t.id) })).sort((a, b) => b.du - a.du || a.t.nom.localeCompare(b.t.nom));
  if (!L.length) return '<div class="carte">' + vide(cli ? 'Aucun client' : 'Aucun fournisseur', 'Ajoutez-en un avec le bouton en haut.') + '</div>';
  const tot = L.reduce((s, x) => s + Math.max(0, x.du), 0);
  return '<p class="petit doux" style="margin:0 2px 6px">' + (cli ? 'Total des crédits à encaisser : ' : 'Total des dettes à payer : ') + '<b class="n">' + M(tot) + '</b></p><div class="liste">' + L.map(x =>
    '<button class="ligne" data-a="ficheTiers" data-id="' + x.t.id + '"><div class="f"><b>' + esc(x.t.nom) + '</b><span>' + esc(x.t.tel || 'Pas de numéro') + '</span></div><div class="d">' +
    (x.du > 0 ? '<b class="n rouge">' + M(x.du) + '</b><span>' + (cli ? 'nous doit' : 'à payer') + '</span>' : '<span class="etiq">À jour</span>') + '</div></button>').join('') + '</div>';
}
function ficheTiers(id) {
  const t = C.tiers(id), cli = t.type === 'client', du = C.solde(id);
  const ops = (cli ? C.db.ventes.filter(v => v.clientId === id && !v.annule).map(v => ({ d: v.date, l: 'Vente ' + v.num, m: v.total, s: v.total > v.paye ? 'dont crédit ' + M(v.total - v.paye) : 'payée', a: 'detailVente', id: v.id }))
    : C.db.achats.filter(a => a.fournisseurId === id && !a.annule).map(a => ({ d: a.date, l: 'Achat ' + a.num, m: a.total, s: a.total > a.paye ? 'reste ' + M(a.total - a.paye) : 'payé', a: 'detailAchat', id: a.id })))
    .concat(C.db.reglements.filter(r => r.tiersId === id).map(r => ({ d: r.date, l: 'Règlement ' + r.num, m: r.montant, s: r.mode, a: 'ticketRecu', id: r.id, r: 1 })))
    .concat((t.dettes || []).map(x => ({ d: x.date, l: 'Somme due ajoutée', m: x.montant, s: x.note || 'sans motif', a: 'detailDette', id: id + '|' + x.id }))).sort((a, b) => b.d - a.d).slice(0, 40);
  ouvrir(t.nom, '<div class="chiffre fort" style="margin-bottom:12px"><span>' + (cli ? 'Ce client nous doit' : 'Nous devons à ce fournisseur') + '</span><b class="n">' + M(Math.max(0, du)) + '</b><span>' + esc(t.tel || '') + '</span></div>' +
    '<div class="rangee btns">' + (du > 0 ? '<button class="btn p f" data-a="formReglement" data-id="' + id + '">' + (cli ? 'Encaisser un paiement' : 'Payer le fournisseur') + '</button>' : '') + '<button class="btn f" data-a="formTiers" data-id="' + id + '">Modifier</button>' + (admin() ? '<button class="btn f" data-a="formDette" data-id="' + id + '">Ajouter une somme due</button>' : '') + '</div>' +
    '<div class="bloc"><h2>Historique</h2>' + (ops.length ? '<div class="liste">' + ops.map(o => '<button class="ligne" data-a="' + o.a + '" data-id="' + o.id + '"><div class="f"><b>' + esc(o.l) + '</b><span>' + esc(dh(o.d) + ', ' + o.s) + '</span></div><div class="d"><b class="n' + (o.r ? ' vert' : '') + '">' + M(o.m) + '</b></div></button>').join('') + '</div>' : '<div class="carte">' + vide('Aucune opération', '') + '</div>') + '</div>');
}
function formTiers(id, type, pour) {
  const t = id ? C.tiers(id) : { type };
  const champs = [{ n: 'nom', l: 'Nom', v: t.nom, req: 1 }, { n: 'tel', l: 'Téléphone', t: 'tel', v: t.tel }];
  if (!id && admin()) champs.push({ n: 'dette', l: t.type === 'client' ? 'Ce client nous doit déjà (facultatif)' : 'Nous devons déjà à ce fournisseur (facultatif)', t: 'nombre' });
  formulaire(id ? 'Modifier' : t.type === 'client' ? 'Nouveau client' : 'Nouveau fournisseur', champs, v => {
    const nom = v.nom.trim(); if (!nom) throw new Error('Indiquez le nom.');
    if (C.db.tiers.some(x => x.id !== id && x.type === t.type && x.nom.toLowerCase() === nom.toLowerCase())) throw new Error('Ce nom existe déjà.');
    if (id) { t.nom = nom; t.tel = v.tel.trim(); return () => ficheTiers(id); }
    const dette = v.dette ? num(v.dette) : 0; if (v.dette && !(dette >= 0)) throw new Error('Montant déjà dû incorrect.');
    const n = { id: C.uid(), type, nom, tel: v.tel.trim() }; C.db.tiers.push(n);
    if (dette > 0) C.ajouterDette({ tiersId: n.id, montant: dette, note: 'Solde de départ', userId: S.user.id });
    if (pour === 'panier') S.panier.clientId = n.id; if (pour === 'achat') S.ach.fournisseurId = n.id;
    toast(type === 'client' ? 'Client ajouté' : 'Fournisseur ajouté');
  });
}
function formReglement(id) {
  const t = C.tiers(id), du = C.solde(id);
  formulaire(t.type === 'client' ? 'Encaisser un paiement' : 'Payer le fournisseur', [{ t: 'texte', l: t.nom + ' : reste dû ' + M(du) }, { n: 'montant', l: 'Montant', t: 'nombre', v: du, req: 1 },
    { n: 'mode', l: 'Moyen de paiement', t: 'select', opts: MODES.map(x => [x, x]) }, { n: 'note', l: 'Note (facultatif)' }], v => {
    const r = C.regler({ tiersId: id, montant: num(v.montant), mode: v.mode, note: v.note.trim(), userId: S.user.id });
    return () => ticketRecu(r.id);
  }, { ok: 'Enregistrer le règlement' });
}
function ticketRecu(id) {
  const r = C.par(C.db.reglements, id), cli = r.type === 'client';
  const txt = [C.db.meta.shop.nom, 'Reçu de règlement ' + r.num + ' du ' + dh(r.date), (cli ? 'Client : ' : 'Fournisseur : ') + nomT(r.tiersId), 'Montant : ' + M(r.montant) + ' (' + r.mode + ')', 'Reste dû : ' + M(r.resteApres)].join('\n');
  ouvrir('Règlement ' + r.num, '<div class="ticket">' + enTeteTicket() + '<hr><div class="tl"><span>Reçu ' + r.num + '</span><span>' + dh(r.date) + '</span></div><div class="tl q"><span>' + esc((cli ? 'Client : ' : 'Fournisseur : ') + nomT(r.tiersId)) + '</span><span>' + esc(nomU(r.userId)) + '</span></div><hr>' +
    '<div class="tl g"><span>' + (cli ? 'Montant reçu' : 'Montant payé') + '</span><span class="n">' + M(r.montant) + '</span></div><div class="tl q"><span>Moyen</span><span>' + esc(r.mode) + '</span></div>' +
    '<div class="tl"><span>Reste dû après ce règlement</span><span class="n">' + M(r.resteApres) + '</span></div>' + (r.note ? '<p class="q">' + esc(r.note) + '</p>' : '') + '<hr><p class="ce">' + esc(C.db.meta.shop.pied || '') + '</p></div>' + boutonsTicket(txt));
}

/* ---------- rapports ---------- */
V.rapports = function () {
  const f = S.f, b = bornes(), R = C.rapport(b[0], b[1], admin() ? null : S.user.id);
  const tabs = admin() ? [['caisse', 'Point de caisse'], ['resultat', 'Bénéfice'], ['articles', 'Articles vendus'], ['clients', 'Clients'], ['caissiers', 'Caissiers'], ['fournisseurs', 'Fournisseurs'], ['impayes', 'Impayés']] : [['caisse', 'Ma caisse']];
  if (!tabs.some(t => t[0] === f.rtab)) f.rtab = 'caisse';
  let h = '<div class="titre"><h1>Rapports</h1></div>' + (tabs.length > 1 ? puces('rtab', tabs) : '') + (f.rtab === 'impayes' ? '' : barrePer()), c = '';
  const rien = '<div class="carte">' + vide('Rien sur cette période', 'Choisissez une autre période.') + '</div>';
  if (f.rtab === 'caisse') c = '<div class="deux"><div class="carte compte"><h2>Entrées d’argent</h2>' + cl('Ventes encaissées', M(R.encVentes)) + cl('Règlements des clients', M(R.reglClients)) + cl('Total des entrées', M(R.entrees), 'tot') + '</div>' +
    '<div class="carte compte" style="margin-top:0"><h2>Sorties d’argent</h2>' + cl('Dépenses', M(R.depenses)) + (admin() ? cl('Achats payés', M(R.payeAchats)) + cl('Règlements aux fournisseurs', M(R.reglFourn)) : '') + cl('Total des sorties', M(R.sorties), 'tot') + '</div></div>' +
    '<div class="chiffre fort" style="margin-top:12px"><span>Argent qui doit être en caisse pour cette période</span><b class="n">' + M(R.soldeCaisse) + '</b><span>' + R.nbVentes + ' vente' + (R.nbVentes > 1 ? 's' : '') + ', dont ' + M(R.credit) + ' à crédit</span></div>';
  else if (f.rtab === 'resultat') { const val = C.valeurStock(null);
    c = '<div class="carte compte">' + cl('Chiffre d’affaires', M(R.ca)) + cl('Coût d’achat des articles vendus', '-' + M(R.cout)) + cl('Marge sur les ventes', M(R.marge), 'gras') + cl('Dépenses', '-' + M(R.depenses)) + cl('Bénéfice', M(R.benefice), 'tot ' + (R.benefice < 0 ? 'rouge' : 'vert')) + '</div>' +
      '<div class="grille" style="margin-top:12px"><div class="chiffre"><span>Achats de la période</span><b class="n">' + M(R.achats) + '</b></div><div class="chiffre"><span>Stock actuel, au prix d’achat</span><b class="n">' + M(val.achat) + '</b></div></div>'; }
  else if (f.rtab === 'articles') c = R.parArticle.length ? table([['Article'], ['Qté', 1], ['Ventes', 1], ['Marge', 1]], R.parArticle.map(x => [esc(x.nom), F(x.qte), F(x.ca), F(x.marge)])) +
    '<div class="bloc"><h2>Par famille</h2>' + table([['Famille'], ['Qté', 1], ['Ventes', 1], ['Marge', 1]], R.parFamille.map(x => [esc(x.nom), F(x.qte), F(x.ca), F(x.marge)])) + '</div>' : rien;
  else if (f.rtab === 'clients') c = R.parClient.length ? table([['Client'], ['Ventes', 1], ['Montant', 1]], R.parClient.map(x => [esc(x.nom), x.nb, F(x.ca)])) : rien;
  else if (f.rtab === 'caissiers') c = R.parCaissier.length ? table([['Nom'], ['Ventes', 1], ['Montant', 1], ['Encaissé', 1], ['Dépenses', 1]], R.parCaissier.map(x => [esc(x.nom), x.nb, F(x.ca), F(x.enc), F(x.dep)])) : rien;
  else if (f.rtab === 'fournisseurs') c = R.parFournisseur.length ? table([['Fournisseur'], ['Achats', 1], ['Montant', 1]], R.parFournisseur.map(x => [esc(x.nom), x.nb, F(x.total)])) : rien;
  else { const ic1 = C.impayes('client'), if1 = C.impayes('fournisseur');
    const li = L => L.length ? '<div class="liste">' + L.map(x => '<button class="ligne" data-a="ficheTiers" data-id="' + x.t.id + '"><div class="f"><b>' + esc(x.t.nom) + '</b><span>' + esc(x.t.tel || '') + '</span></div><div class="d"><b class="n rouge">' + M(x.du) + '</b></div></button>').join('') + '</div>' : '<div class="carte">' + vide('Aucun impayé', '') + '</div>';
    c = '<div class="deux"><div class="bloc"><h2>Clients qui nous doivent : ' + M(ic1.reduce((s, x) => s + x.du, 0)) + '</h2>' + li(ic1) + '</div><div class="bloc"><h2>Fournisseurs à payer : ' + M(if1.reduce((s, x) => s + x.du, 0)) + '</h2>' + li(if1) + '</div></div>'; }
  return h + c;
};

/* ---------- réglages, menu ---------- */
V.reglages = function () {
  if (!admin()) return V.plus();
  const m = C.db.meta, sh = m.shop;
  const sect = (t, bouton, corps) => '<div class="bloc"><div class="rangee" style="justify-content:space-between;margin:18px 2px 8px"><h2>' + t + '</h2>' + (bouton || '') + '</div>' + corps + '</div>';
  const plus = (a, l) => '<button class="btn mini" data-a="' + a + '">' + ic('ajout') + l + '</button>';
  return '<div class="titre"><h1>Réglages</h1></div>' +
    '<button class="ligne carte" data-a="formBoutique"><div class="f"><b>' + esc(sh.nom) + '</b><span>' + esc([sh.tel, sh.adresse, sh.rccm ? 'RCCM ' + sh.rccm : ''].filter(Boolean).join(', ') || 'Ajoutez téléphone, adresse et RCCM pour vos reçus') + '</span></div><span class="etiq">Modifier</span></button>' +
    '<div class="deux">' + sect('Employés', plus('formUser', 'Ajouter un employé'), '<div class="liste">' + C.db.users.map(u => '<button class="ligne" data-a="formUser" data-id="' + u.id + '"><div class="f"><b>' + esc(u.nom) + '</b><span>' + (u.role === 'gerant' ? 'Gérant : voit tout' : 'Caisse : ne voit ni prix d’achat ni bénéfices') + '</span></div>' + (u.actif === false ? '<span class="etiq ko">Bloqué</span>' : '') + '</button>').join('') + '</div>') +
    sect('Dépôts', plus('formDepot', 'Dépôt'), '<div class="liste">' + C.db.depots.map((d, i) => '<button class="ligne" data-a="formDepot" data-id="' + d.id + '"><div class="f"><b>' + esc(d.nom) + '</b><span>' + (i === 0 ? 'Point de vente : la caisse sort les articles d’ici' : 'Réserve') + '</span></div><div class="d"><b class="n">' + M(C.valeurStock(d.id).achat) + '</b></div></button>').join('') + '</div>') +
    sect('Familles d’articles', plus('formFamille', 'Famille'), C.db.familles.length ? '<div class="liste">' + C.db.familles.map(x => '<button class="ligne" data-a="formFamille" data-id="' + x.id + '"><div class="f"><b>' + esc(x.nom) + '</b><span>' + C.db.articles.filter(a => a.familleId === x.id && a.actif !== false).length + ' article(s)</span></div></button>').join('') + '</div>' : '<div class="carte">' + vide('Aucune famille', 'Classez vos articles : matelas, tapis, lits…') + '</div>') +
    sect('Règles de vente', '', '<div class="carte"><label class="coche"><input type="checkbox" data-ch="optVSS"' + (m.opt.venteSansStock ? ' checked' : '') + '><span>Autoriser la vente d’un article même si le stock est insuffisant</span></label>' +
      '<label class="coche" style="margin:0"><input type="checkbox" data-ch="optPL"' + (m.opt.prixLibre ? ' checked' : '') + '><span>Autoriser la caisse à modifier le prix de vente</span></label></div>') + '</div>' +
    sect('Copie de sécurité', '', '<div class="carte"><p class="petit doux" style="margin-bottom:10px">Vos données sont enregistrées en ligne sur votre compte Google et sur chaque appareil connecté. Vous pouvez en plus garder une copie dans un fichier (WhatsApp, e-mail, clé USB). ' + (m.sauvegarde ? 'Dernière copie le ' + dj(m.sauvegarde) + '.' : 'Aucune copie pour l’instant.') + '</p>' +
      '<div class="rangee"><button class="btn p f" data-a="exporter">Enregistrer une copie</button><label class="btn f" style="cursor:pointer">Restaurer une copie<input type="file" accept=".json,application/json" data-ch="fichier" hidden></label></div></div>') +
    sect('Licence', '', '<button class="ligne carte" data-a="licence"><div class="f"><b>' + esc(texteLicence()) + '</b><span>' + esc(compte ? compte.email : '') + ', version ' + VERSION + '</span></div><span class="etiq">Voir</span></button>');
};
V.plus = function () {
  const L = [['tiers', 'gens', 'Clients' + (admin() ? ' et fournisseurs' : ''), 'Crédits, règlements, historique'], ['rapports', 'graph', admin() ? 'Rapports' : 'Ma caisse', admin() ? 'Point de caisse, bénéfice, articles vendus' : 'Mon point de caisse']];
  if (admin()) L.push(['reglages', 'reglage', 'Réglages', 'Boutique, employés, dépôts, copie de sécurité']);
  return '<div class="titre"><h1>Plus</h1></div><div class="liste">' + L.map(x => '<button class="ligne" data-a="aller" data-v="' + x[0] + '">' + ic(x[1]).replace('<svg', '<svg width="24" height="24"') + '<div class="f"><b>' + x[2] + '</b><span>' + x[3] + '</span></div></button>').join('') +
    '<button class="ligne" data-a="licence">' + ic('cle').replace('<svg', '<svg width="24" height="24"') + '<div class="f"><b>Compte et licence</b><span>' + esc(texteLicence()) + '</span></div></button>' +
    '<button class="ligne" data-a="deconnexion">' + ic('sortie').replace('<svg', '<svg width="24" height="24"') + '<div class="f"><b>Changer d’utilisateur</b><span>Connecté : ' + esc(S.user.nom) + '</span></div></button></div>' +
    '<p class="petit doux centre" style="margin-top:16px">SAS STOCK ' + VERSION + ', par ' + esc(REVENDEUR.nom) + '</p>';
};
function modaleLicence() {
  ouvrir('Licence', '<div class="carte"><p class="gras">' + esc(texteLicence()) + '</p><p class="petit doux" style="margin-top:10px">Code de cet appareil</p><div class="code">' + esc(lic.appareil) + '</div><button class="btn mini" data-a="copier" data-t="' + esc(lic.appareil) + '">Copier le code</button></div>' +
    (etat.aVie ? '' : '<form data-form="activer" style="margin-top:12px"><label class="ch"><span>Nouvelle clé, pour prolonger</span><textarea name="cle" rows="3" placeholder="SAS1-…" required autocomplete="off" autocapitalize="off" spellcheck="false"></textarea></label><button class="btn p large">Prolonger la licence</button></form>'));
}
function formUser(id) {
  const u = id ? C.user(id) : { role: 'caissier' };
  const ch = [{ n: 'nom', l: 'Nom', v: u.nom, req: 1 }, { n: 'role', l: 'Rôle', t: 'select', v: u.role, opts: [['caissier', 'Caissier ou vendeur'], ['gerant', 'Gérant (voit tout)']] }, { n: 'pin', l: id ? 'Nouveau code secret (vide = garder l’actuel)' : 'Code secret (4 à 6 chiffres)', t: 'pin', req: !id }];
  if (id) ch.push({ n: 'bloque', l: 'Bloquer l’accès de cette personne', t: 'coche', v: u.actif === false });
  formulaire(id ? 'Modifier ' + u.nom : 'Nouvel employé', ch, v => {
    const nom = v.nom.trim(), bloque = v.bloque === 'on'; if (!nom) throw new Error('Indiquez le nom.');
    if (v.pin && !/^\d{4,6}$/.test(v.pin)) throw new Error('Le code secret doit avoir 4 à 6 chiffres.');
    if (!id && !v.pin) throw new Error('Choisissez un code secret.');
    if (id && !C.db.users.some(x => (x.id === id ? v.role === 'gerant' && !bloque : x.role === 'gerant' && x.actif !== false))) throw new Error('Il faut garder au moins un gérant actif.');
    const cible = id ? u : { id: C.uid() };
    cible.nom = nom; cible.role = v.role; cible.actif = !bloque;
    if (v.pin) { cible.pin = hachPin(cible.id, v.pin); cible.pinLen = v.pin.length; }
    if (!id) C.db.users.push(cible);
    if (S.user.id === cible.id) S.user = cible;
    toast(id ? 'Employé modifié' : 'Employé ajouté');
  });
}
function formNom(titre, liste, id, label) {
  const x = id ? C.par(liste, id) : {};
  formulaire(titre, [{ n: 'nom', l: label, v: x.nom, req: 1 }], v => {
    const nom = v.nom.trim(); if (!nom) throw new Error('Indiquez un nom.');
    if (liste.some(y => y.id !== id && y.nom.toLowerCase() === nom.toLowerCase())) throw new Error('Ce nom existe déjà.');
    if (id) x.nom = nom; else liste.push({ id: C.uid(), nom });
  });
}
function exporter() {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'SAS STOCK', v: 1, date: Date.now(), db: C.db })], { type: 'application/json' }));
    a.download = 'sas-stock-copie-' + iso(Date.now()) + '.json'; document.body.appendChild(a); a.click(); a.remove();
    C.db.meta.sauvegarde = Date.now(); sauver(); toast('Copie enregistrée dans vos téléchargements');
  } catch (e) { toast('Impossible d’enregistrer la copie sur cet appareil.', true); }
}

/* ---------- actions ---------- */
function rendre() {
  const app = $('#app');
  if (!etat.ok) { app.innerHTML = vueActivation(); return; }
  if (!C.db.users.length) { app.innerHTML = vuePremiere(); return; }
  if (!S.user) { app.innerHTML = vueConnexion(); return; }
  if (S.vue === 'achat' && (!S.ach || !admin())) S.vue = 'journal';
  app.innerHTML = coque((V[S.vue] || V.accueil)());
  if (apres[S.vue]) apres[S.vue]();
}
function aller(v) { S.vue = v; rendre(); window.scrollTo(0, 0); }
function entrer(u) { S.user = u; S.pin = ''; const t = $('#toast'); if (t) t.hidden = true; S.vue = 'accueil'; try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} }
function ajouteLigne(p, id, pu) { const l = p.lignes.find(x => x.articleId === id); if (l) l.qte = (l.qte > 0 ? l.qte : 0) + 1; else p.lignes.push({ articleId: id, qte: 1, pu }); S.focusRech = true; rendre(); }
const A = {
  aller: d => aller(d.v), fermer, okConf: () => { const cb = confCb; fermer(); if (cb) cb(); },
  copier: d => { try { navigator.clipboard.writeText(d.t).then(() => toast('Code copié'), () => toast('Copie impossible : notez le code à la main.', true)); } catch (e) { toast('Copie impossible : notez le code à la main.', true); } },
  per: d => { S.per.k = d.k; rendre(); }, onglet: d => { S.f[d.c] = d.k; rendre(); },
  deconnexion: () => confirmer('Changer d’utilisateur', 'Vous allez revenir à l’écran du code secret.', 'Se déconnecter', () => { S.user = null; S.pinU = null; S.pin = ''; rendre(); }),
  licence: modaleLicence, exporter,
  choisirU: d => { S.pinU = d.id; S.pin = ''; rendre(); }, retourU: () => { S.pinU = null; S.pin = ''; rendre(); }, efface: () => { S.pin = S.pin.slice(0, -1); rendre(); },
  touche: d => { const u = C.user(S.pinU); if (!u) return; S.pin += d.d;
    if (S.pin.length >= u.pinLen) { if (hachPin(u.id, S.pin) === u.pin) entrer(u); else { S.pin = ''; toast('Code secret incorrect', true); } } rendre(); },
  voirAlertes: () => { S.f.stab = 'alertes'; aller('stock'); },
  ficheArticle: d => ficheArticle(d.id), formArticle: d => { if (admin()) formArticle(d.id, d.pour); }, histoArticle: d => ouvrir('Historique : ' + C.article(d.id).nom, listeMouvements(d.id)),
  retirerArticle: d => confirmer('Retirer l’article', 'L’article disparaît des listes et de la caisse. Son historique reste dans les rapports.', 'Retirer', () => { C.article(d.id).actif = false; sauver(); rendre(); toast('Article retiré'); }, true),
  formTransfert: d => { const ops = C.db.depots.map(x => [x.id, x.nom + ' (' + F(C.qte(d.id, x.id)) + ')']);
    const de = (C.db.depots.find(x => C.qte(d.id, x.id) > 0) || C.db.depots[0]).id, autre = id => (C.db.depots.find(x => x.id !== id) || C.db.depots[0]).id;
    formulaire('Transférer ' + C.article(d.id).nom, [{ n: 'de', l: 'Depuis', t: 'select', opts: ops, v: de }, { n: 'vers', l: 'Vers', t: 'select', opts: ops, v: autre(de) }, { n: 'qte', l: 'Quantité', t: 'nombre', req: 1 }],
      v => { C.transferer(d.id, v.de, v.vers, num(v.qte), S.user.id); toast('Transfert enregistré : ' + F(num(v.qte)) + ' vers ' + C.depot(v.vers).nom); }, { ok: 'Transférer' });
    const sDe = $('#modale [name=de]'), sVers = $('#modale [name=vers]');
    if (sDe && sVers) { sDe.addEventListener('change', () => { if (sVers.value === sDe.value) sVers.value = autre(sDe.value); }); sVers.addEventListener('change', () => { if (sVers.value === sDe.value) sDe.value = autre(sVers.value); }); } },
  formAjuster: d => { const ops = C.db.depots.map(x => [x.id, x.nom + ' (' + F(C.qte(d.id, x.id)) + ')']);
    formulaire('Corriger le stock', [{ t: 'texte', l: 'Comptez l’article dans le dépôt et saisissez la quantité réelle.' }, { n: 'depot', l: 'Dépôt', t: 'select', opts: ops }, { n: 'qte', l: 'Quantité comptée', t: 'nombre', req: 1 }, { n: 'motif', l: 'Motif', v: 'Inventaire' }],
      v => { C.ajuster(d.id, v.depot, num(v.qte), v.motif.trim(), S.user.id); toast('Stock corrigé'); }); },
  detailVente: d => ticketVente(d.id), ticketRecu: d => ticketRecu(d.id), detailAchat: d => { if (admin()) detailAchat(d.id); },
  annulerVente: d => confirmer('Annuler la vente', 'Les articles reviennent en stock et la vente sort des rapports.', 'Annuler la vente', () => { if (agir(() => C.annulerVente(d.id, S.user.id))) { rendre(); toast('Vente annulée'); } }, true),
  annulerAchat: d => confirmer('Annuler l’achat', 'Les quantités reçues sont retirées du stock.', 'Annuler l’achat', () => { if (agir(() => C.annulerAchat(d.id, S.user.id))) { rendre(); toast('Achat annulé'); } }, true),
  imprimer: () => { try { window.print(); } catch (e) { toast('Impression indisponible ici.', true); } },
  pAjoute: d => ajouteLigne(S.panier, d.id, C.article(d.id).pv),
  pLibre: () => { const q = ($('#rech') || {}).value || ''; if (!q.trim()) return; S.panier.lignes.push({ articleId: '', libre: true, nom: q.trim(), qte: 1, pu: NaN }); rendre(); const ins = document.querySelectorAll('.panier [data-in=pp]'); const i = ins[ins.length - 1]; if (i) try { i.focus(); } catch (e) {} },
  corrigerVente: d => { const v = C.par(C.db.ventes, d.id); if (!v || v.annule || !admin()) return;
    confirmer('Corriger la facture ' + v.num, 'Tous les articles de cette facture vont revenir dans la caisse. Changez seulement ce qui est faux, puis validez : l’ancienne facture sera annulée et remplacée. Si vous abandonnez, rien ne change.' + (S.panier.lignes.length && !S.panier.remplace ? ' Le panier en cours sera vidé.' : ''), 'Corriger', () => {
      S.panier = { lignes: v.lignes.map(l => l.libre ? { articleId: '', libre: true, nom: l.nom, qte: l.qte, pu: l.pu } : { articleId: l.articleId, qte: l.qte, pu: l.pu, lot: l.lot }), clientId: v.clientId || '', recu: v.paye < v.total ? v.paye : null, remplace: v.id, remplaceNum: v.num, mode: v.mode || 'Espèces', remise: v.remise > 0 ? { t: v.remiseP ? 'p' : 'f', v: v.remiseP || v.remise } : { t: 'f', v: 0 } };
      aller('caisse'); }); },
  pAbandon: () => { S.panier = panierVide(); rendre(); toast('Correction abandonnée : la facture n’a pas changé'); },
  pRetire: (d, el) => { S.panier.lignes.splice(+el.closest('.pl').dataset.i, 1); rendre(); },
  pVider: () => confirmer('Vider le panier', 'Tous les articles du panier seront retirés.', 'Vider', () => { S.panier = panierVide(); rendre(); }, true),
  pValider: () => { const p = S.panier;
    const v = agir(() => (p.remplace ? o => C.remplacerVente(p.remplace, o) : C.creerVente)({ lignes: p.lignes.map(l => ({ articleId: l.articleId, libre: l.libre, nom: l.nom, qte: l.qte, pu: l.pu })), clientId: p.clientId, recu: p.recu, userId: S.user.id, depotId: depotVente().id }));
    if (v) { S.panier = panierVide(); rendre(); ticketVente(v.id, true); if (v.remplace) toast('Facture ' + v.num + ' émise : elle remplace ' + v.remplace); } },
  nouveauTiers: d => formTiers(null, d.type, d.pour), formTiers: d => formTiers(d.id), ficheTiers: d => ficheTiers(d.id), formReglement: d => formReglement(d.id),
  nouvelAchat: () => { S.ach = S.ach || { lignes: [], fournisseurId: '', depotId: C.db.depots[0].id, ref: '', paye: null }; aller('achat'); },
  aAjoute: d => ajouteLigne(S.ach, d.id, C.article(d.id).pa || 0),
  aRetire: (d, el) => { S.ach.lignes.splice(+el.closest('.pl').dataset.i, 1); rendre(); },
  aAnnuler: () => { S.ach = null; aller('journal'); },
  aValider: () => { const a = S.ach;
    const r = agir(() => C.creerAchat({ lignes: a.lignes.map(l => ({ articleId: l.articleId, qte: l.qte, pu: l.pu })), fournisseurId: a.fournisseurId, depotId: a.depotId, ref: a.ref.trim(), paye: a.paye, userId: S.user.id }));
    if (r) { S.ach = null; S.f.jtab = 'achats'; aller('journal'); toast('Achat ' + r.num + ' enregistré, stock mis à jour'); } },
  formDepense: () => formulaire('Nouvelle dépense', [{ n: 'libelle', l: 'Motif', req: 1 }, { n: 'categorie', l: 'Catégorie', t: 'select', opts: CATS.map(x => [x, x]), v: 'Divers' }, { n: 'montant', l: 'Montant', t: 'nombre', req: 1 }],
    v => { C.depenser({ libelle: v.libelle.trim(), categorie: v.categorie, montant: num(v.montant), userId: S.user.id }); toast('Dépense enregistrée'); }),
  supprDepense: d => confirmer('Supprimer la dépense', 'Cette dépense sera retirée de la caisse et des rapports.', 'Supprimer', () => { C.db.depenses = C.db.depenses.filter(x => x.id !== d.id); sauver(); rendre(); }, true),
  formBoutique: () => { const sh = C.db.meta.shop; formulaire('Ma boutique', [{ n: 'nom', l: 'Nom de la boutique', v: sh.nom, req: 1 }, { n: 'activite', l: 'Activité (ex. : vente de matelas et tapis)', v: sh.activite }, { n: 'tel', l: 'Téléphone', t: 'tel', v: sh.tel }, { n: 'tel2', l: 'Deuxième téléphone ou WhatsApp', t: 'tel', v: sh.tel2 }, { n: 'email', l: 'E-mail', v: sh.email }, { n: 'adresse', l: 'Adresse (quartier, rue, repère)', v: sh.adresse }, { n: 'ville', l: 'Ville', v: sh.ville }, { n: 'rccm', l: 'N° RCCM', v: sh.rccm }, { n: 'ncc', l: 'N° de compte contribuable (NCC)', v: sh.ncc }, { n: 'pied', l: 'Message en bas des reçus', v: sh.pied }],
    v => { if (!v.nom.trim()) throw new Error('Indiquez le nom de la boutique.'); ['nom', 'activite', 'tel', 'tel2', 'email', 'adresse', 'ville', 'rccm', 'ncc', 'pied'].forEach(k => { sh[k] = (v[k] || '').trim(); }); }); },
  formUser: d => formUser(d.id), formDepot: d => formNom(d.id ? 'Renommer le dépôt' : 'Nouveau dépôt', C.db.depots, d.id, 'Nom du dépôt'), formFamille: d => formNom(d.id ? 'Renommer la famille' : 'Nouvelle famille', C.db.familles, d.id, 'Nom de la famille')
};
const ligneDe = el => +el.closest('.pl').dataset.i;
const I = {
  rech: majRes, pq: (v, el) => { S.panier.lignes[ligneDe(el)].qte = num(v); majCaisse(); }, pp: (v, el) => { S.panier.lignes[ligneDe(el)].pu = num(v); majCaisse(); },
  precu: v => { S.panier.recu = v.trim() === '' ? null : num(v); majCaisse(); },
  sq: v => { S.f.sq = v; $('#sl').innerHTML = listeStock(); }, tq: v => { S.f.tq = v; $('#tl').innerHTML = listeTiers(); },
  arech: () => { const q = $('#rech').value, L = chercheArticles(q), box = $('#res');
    box.innerHTML = !q.trim() ? '' : L.length ? '<div class="liste">' + L.map(a => '<button class="ligne" data-a="aAjoute" data-id="' + a.id + '"><div class="f"><b>' + esc(a.nom) + '</b><span>' + esc(a.code || '') + ' En stock : ' + F(C.qteTot(a.id)) + '</span></div><div class="d"><span>Achat</span><b class="n">' + M(a.pa) + '</b></div></button>').join('') + '</div>' : '<div class="carte">' + vide('Aucun article trouvé', 'Créez-le avec le bouton ci-dessous.') + '</div>'; },
  aq: (v, el) => { S.ach.lignes[ligneDe(el)].qte = num(v); majAchat(); }, ap: (v, el) => { S.ach.lignes[ligneDe(el)].pu = num(v); majAchat(); },
  apaye: v => { S.ach.paye = v.trim() === '' ? null : num(v); }, aref: v => { S.ach.ref = v; }
};
const CH = {
  perDe: v => { S.per.de = v; rendre(); }, perA: v => { S.per.a = v; rendre(); }, pClient: v => { S.panier.clientId = v; },
  sfam: v => { S.f.sfam = v; $('#sl').innerHTML = listeStock(); }, sdep: v => { S.f.sdep = v; $('#sl').innerHTML = listeStock(); },
  aFourn: v => { S.ach.fournisseurId = v; }, aDepot: v => { S.ach.depotId = v; },
  optVSS: (v, el) => { C.db.meta.opt.venteSansStock = el.checked; sauver(); }, optPL: (v, el) => { C.db.meta.opt.prixLibre = el.checked; sauver(); },
  fichier: (v, el) => { const fi = el.files && el.files[0]; if (!fi) return;
    fi.text().then(t => { let d; try { d = JSON.parse(t); } catch (e) { d = null; }
      if (!d || !d.db || !Array.isArray(d.db.articles) || !Array.isArray(d.db.users) || !d.db.meta) return toast('Ce fichier n’est pas une copie SAS STOCK.', true);
      confirmer('Restaurer la copie', 'Les données actuelles seront remplacées par la copie du ' + dj(d.date || Date.now()) + ' (' + d.db.articles.length + ' articles, ' + d.db.ventes.length + ' ventes). Le changement s’appliquera aussi à vos autres appareils.', 'Restaurer', () => { C.db = d.db; sauver(true); S.user = null; S.pinU = null; S.panier = panierVide(); S.ach = null; rendre(); toast('Copie restaurée'); }, true);
    }); }
};
const FORMS = {
  gen: v => { if (!formCb) return; let suite;
    try { suite = formCb(v); } catch (e) { if (!e.metier && !(e instanceof Error)) console.error(e); toast(e.message || 'Erreur inattendue.', true); return; }
    fermer(); sauver(); rendre(); if (typeof suite === 'function') suite(); },
  activer: v => { try { activer(v.cle); } catch (e) { toast(e.message, true); return; } fermer(); rendre(); toast(texteLicence()); },
  premiere: v => {
    if (!/^\d{4,6}$/.test(v.pin)) return toast('Le code secret doit avoir 4 à 6 chiffres.', true);
    if (v.pin !== v.pin2) return toast('Les deux codes secrets sont différents.', true);
    if (!v.boutique.trim() || !v.nom.trim()) return toast('Remplissez le nom de la boutique et celui du gérant.', true);
    const db = C.db = C.vide(), u = { id: C.uid(), nom: v.nom.trim(), role: 'gerant', actif: true, pinLen: v.pin.length };
    u.pin = hachPin(u.id, v.pin); db.users.push(u); db.meta.shop.nom = v.boutique.trim(); db.meta.shop.tel = v.tel.trim(); db.meta.shop.adresse = (v.adresse || '').trim(); db.meta.shop.rccm = (v.rccm || '').trim();
    db.depots.push({ id: C.uid(), nom: 'Magasin' }); sauver(true); entrer(u); rendre();
  }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el) { if (el.disabled) return; const fn = A[el.dataset.a]; if (fn) { if (el.tagName !== 'A') e.preventDefault(); fn(el.dataset, el); } return; }
  if (e.target.id === 'modale') fermer();
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.in; if (k && I[k]) I[k](e.target.value, e.target); });
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.ch; if (k && CH[k]) CH[k](e.target.value, e.target); });
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); const v = {}; new FormData(f).forEach((val, key) => { v[key] = typeof val === 'string' ? val : ''; }); FORMS[f.dataset.form](v, f); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modale').hidden) return fermer();
  if (etat.ok && !S.user && S.pinU && $('#modale').hidden) { if (/^\d$/.test(e.key)) A.touche({ d: e.key }); else if (e.key === 'Backspace') A.efface(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (C.db) sauver(true); } else { const avant = etat.ok; verifierLicence(); if (avant !== etat.ok) rendre(); } });
window.addEventListener('pagehide', () => { if (C.db) sauver(true); });

/* ---------- démarrage ---------- */
async function demarrer() {
  await Store.open();
  lic = (await Store.get('lic')) || {};
  if (!lic.appareil) {
    let b = null; try { b = localStorage.getItem('sas_appareil'); } catch (e) {}
    lic.appareil = LIC.normCode(b) || LIC.newDeviceCode(); await Store.set('lic', lic);
  }
  try { localStorage.setItem('sas_appareil', lic.appareil); } catch (e) {}
  C.db = (await Store.get('db')) || C.vide();
  verifierLicence(); rendre();
  const l = $('#lance'); if (l) setTimeout(() => { l.style.opacity = 0; setTimeout(() => l.remove(), 380); }, 750);
  setInterval(() => { const avant = etat.ok; verifierLicence(); if (avant !== etat.ok) rendre(); }, 6e5);
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
