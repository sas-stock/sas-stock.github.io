/* SAS STOCK — remises personnalisées à la caisse, retours de marchandise et remboursements */
'use strict';

/* ---------- remise sur le total de la vente ---------- */
const remiseOk = () => admin() || !!(C.db.meta.opt && C.db.meta.opt.remiseCaisse);
function texteRemise(p) {
  const r = remisePanier(p);
  if (!(r > 0)) return '';
  return 'Sous-total ' + M(brutPanier(p)) + ' − remise ' + M(r) + (p.remise && p.remise.t === 'p' ? ' (' + F(p.remise.v) + ' %)' : '');
}
const caisseRemBase = V.caisse;
V.caisse = function () {
  let h = caisseRemBase();
  if (!remiseOk()) return h;
  const p = S.panier, r = p.remise || { t: 'f', v: '' }, val = r.v === '' || r.v == null || isNaN(r.v) || r.v === 0 ? '' : r.v;
  const champ = '<label class="ch"><span>Remise sur le total</span><div class="rangee rem"><input inputmode="numeric" data-in="pRemV" id="premv" value="' + val + '" placeholder="0" aria-label="Montant de la remise">' +
    '<select data-ch="pRemT" aria-label="Remise en francs ou en pourcentage">' + [['f', 'F CFA'], ['p', '%']].map(x => '<option value="' + x[0] + '"' + (r.t === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div></label>';
  h = h.replace('<label class="ch"><span>Moyen de paiement</span>', champ + '<label class="ch"><span>Moyen de paiement</span>');
  h = h.replace('<label class="ch" style="margin-top:10px"><span>Client</span>', '<p class="petit doux" id="crem" style="margin:4px 2px 0">' + esc(texteRemise(p)) + '</p><label class="ch" style="margin-top:10px"><span>Client</span>');
  return h;
};
const majCaisseRemBase = majCaisse;
majCaisse = function () { majCaisseRemBase(); const e = $('#crem'); if (e) e.textContent = texteRemise(S.panier); };
I.pRemV = v => { const p = S.panier; p.remise = { t: (p.remise && p.remise.t) || 'f', v: v.trim() === '' ? 0 : num(v) }; majCaisse(); };
CH.pRemT = v => { const p = S.panier; p.remise = { t: v, v: (p.remise && p.remise.v) || 0 }; majCaisse(); };
const panierVideRemBase = panierVide;
panierVide = () => Object.assign(panierVideRemBase(), { remise: { t: 'f', v: 0 } });

/* ---------- retour de marchandise ---------- */
const retourOk = () => admin() || !!(C.db.meta.opt && C.db.meta.opt.retourCaisse);
function resteRetour(v) {
  const deja = C.dejaRetourne(v.id);
  return v.lignes.map((l, i) => ({ l: l, i: i, reste: l.qte - (deja[i] || 0) })).filter(x => x.reste > 0);
}
function totalRetour() {
  const r = S.ret, v = C.par(C.db.ventes, r.venteId); if (!v) return 0;
  let brut = 0;
  Object.keys(r.q).forEach(i => { const l = v.lignes[i], q = r.q[i]; if (l && q > 0) brut += q * l.pu; });
  return v.remise > 0 && v.brut > 0 ? Math.round(brut * v.total / v.brut) : brut;
}
A.formRetour = d => {
  const v = C.par(C.db.ventes, d.id);
  if (!v) return;
  if (v.annule) return toast('Cette facture est annulée.', true);
  const L = resteRetour(v);
  if (!L.length) return toast('Tous les articles de cette facture ont déjà été repris.', true);
  const du = v.clientId ? C.solde(v.clientId) : 0;
  S.ret = { venteId: v.id, q: {}, mode: 'espece', motif: '' };
  ouvrir('Retour sur la facture ' + v.num, '<p class="petit doux" style="margin-bottom:10px">Indiquez les quantités que le client ramène. Elles reviennent en stock dans ' + esc((C.depot(v.depotId) || {}).nom || 'le dépôt') + '.</p>' +
    '<div class="liste panier" style="margin-bottom:10px">' + L.map(x =>
      '<div class="pl" data-i="' + x.i + '"><div class="nm"><span>' + esc(x.l.nom) + '</span><span class="n" data-rt>0 F</span></div>' +
      '<span class="st">Vendu ' + F(x.l.qte) + ' à ' + M(x.l.pu) + ' · reprenable : ' + F(x.reste) + '</span>' +
      '<div class="qg"><button data-a="rMoins" aria-label="Enlever 1">−</button><input inputmode="decimal" data-in="rq" value="" placeholder="0" aria-label="Quantité reprise de ' + esc(x.l.nom) + '"><button data-a="rPlus" aria-label="Ajouter 1">+</button></div></div>').join('') + '</div>' +
    '<label class="ch"><span>Remboursement</span><select data-ch="rMode"><option value="espece">En espèces (l’argent sort de la caisse)</option>' +
      (du > 0 ? '<option value="avoir">Déduit de ce que le client doit (' + M(du) + ')</option>' : '') + '</select></label>' +
    '<label class="ch"><span>Motif (facultatif)</span><input data-in="rMotif" placeholder="Article abîmé, mauvaise taille…"></label>' +
    '<div class="carte compte" style="margin-top:10px">' + cl('Montant du retour', '<span id="rtot">0 F</span>', 'tot') + '</div>' +
    '<button class="btn m large" style="margin-top:10px" data-a="rValider">Enregistrer le retour</button>');
};
function majRetour() {
  const r = S.ret, v = C.par(C.db.ventes, r.venteId); if (!v) return;
  document.querySelectorAll('#modale .panier .pl').forEach(el => { const i = el.dataset.i, l = v.lignes[i], q = r.q[i] || 0;
    const c = $('[data-rt]', el); if (c) c.textContent = M(q > 0 ? q * l.pu : 0); });
  const t = $('#rtot'); if (t) t.textContent = M(totalRetour());
}
function poseQte(i, q) {
  const v = C.par(C.db.ventes, S.ret.venteId), L = resteRetour(v), x = L.find(y => String(y.i) === String(i));
  if (!x) return 0;
  q = Math.max(0, Math.min(x.reste, Math.round(q * 1000) / 1000));
  if (q > 0) S.ret.q[i] = q; else delete S.ret.q[i];
  return q;
}
I.rq = (val, el) => { const i = el.closest('.pl').dataset.i, q = poseQte(i, val.trim() === '' ? 0 : num(val)); if (String(q) !== val.trim() && !(q === 0 && val.trim() === '')) el.value = q || ''; majRetour(); };
I.rMotif = v => { S.ret.motif = v; };
CH.rMode = v => { S.ret.mode = v; };
function pasRetour(el, k) {
  const pl = el.closest('.pl'), i = pl.dataset.i, q = poseQte(i, (S.ret.q[i] || 0) + k);
  $('[data-in=rq]', pl).value = q || ''; majRetour();
}
A.rPlus = (d, el) => pasRetour(el, 1);
A.rMoins = (d, el) => pasRetour(el, -1);
A.rValider = () => {
  const r = S.ret, lignes = Object.keys(r.q).map(i => ({ i: +i, qte: r.q[i] }));
  const t = agir(() => C.retourner({ venteId: r.venteId, lignes: lignes, mode: r.mode, motif: r.motif, userId: S.user.id }));
  if (!t) return;
  sauver(); S.ret = null; rendre(); ticketRetour(t.id);
  toast(t.mode === 'avoir' ? 'Retour enregistré, déduit de ce que le client doit' : 'Retour enregistré, ' + M(t.total) + ' à rendre au client');
};
A.annulerRetour = d => confirmer('Annuler ce retour', 'Les articles repartent du stock et le remboursement est effacé. À faire seulement en cas d’erreur de saisie.', 'Annuler le retour', () => {
  if (agir(() => C.annulerRetour(d.id, S.user.id)) !== undefined) { sauver(); fermer(); rendre(); toast('Retour annulé'); }
}, true);

function ticketRetour(id) {
  const r = C.par(C.listeRetours(), id), v = C.par(C.db.ventes, r.venteId) || {}, t = r.clientId && C.tiers(r.clientId);
  const txt = [C.db.meta.shop.nom, 'Retour ' + r.num + ' du ' + dh(r.date), 'Facture d’origine : ' + r.venteNum,
    r.lignes.map(l => '- ' + l.nom + ' x' + F(l.qte)).join('\n'),
    'Montant : ' + M(r.total), r.mode === 'avoir' ? 'Déduit de ce que le client doit' : 'Remboursé en espèces'].join('\n');
  const corps = '<table class="f-tab"><thead><tr><th>Désignation des produits</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>' +
    r.lignes.map(l => '<tr><td>' + esc(l.nom) + '</td><td class="c n">' + F(l.qte) + '</td><td class="d n">' + M(l.pu) + '</td><td class="d n">' + M(l.qte * l.pu) + '</td></tr>').join('') +
    '<tr class="vide court"><td></td><td></td><td></td><td></td></tr></tbody></table>' +
    '<table class="f-tot">' + ligneTot('Mode', r.mode === 'avoir' ? 'Déduit de sa dette' : 'Remboursé en espèces') + ligneTot('Montant du retour', M(r.total), 1) + '</table>' +
    (r.annule ? '<div class="f-tampon">Retour annulé</div>' : '');
  ouvrir('Retour ' + r.num, cadreFacture({
    infos: [['Date d’émission', dj(r.date)], ['Émis par', (C.user(r.userId) || {}).nom || ''], ['Facture d’origine', r.venteNum]].concat(r.motif ? [['Motif', r.motif]] : []),
    dest: t ? [t.nom, t.tel] : ['Client de passage'], titre: 'Retour n° ' + r.num + (r.annule ? ' (annulé)' : ''), corps
  }) + boutonsTicket(txt) + (admin() && !r.annule ? '<button class="btn d large nonimp" style="margin-top:8px" data-a="annulerRetour" data-id="' + r.id + '">Annuler ce retour</button>' : ''));
}
A.ticketRetour = d => ticketRetour(d.id);

/* bouton « Retour » sur la facture */
const ticketVenteRetBase = ticketVente;
ticketVente = function (id, nouveau) {
  ticketVenteRetBase(id, nouveau);
  const v = C.par(C.db.ventes, id);
  if (nouveau || !v || v.annule || !retourOk() || !resteRetour(v).length) return;
  const b = $('#modale [data-a=corrigerVente]') || $('#modale .rangee.nonimp');
  if (b) b.insertAdjacentHTML('afterend', '<button class="btn large nonimp" style="margin-top:8px" data-a="formRetour" data-id="' + id + '">Retour / remboursement</button>');
};

/* ---------- journal des retours ---------- */
const journalRetBase = V.journal;
V.journal = function () {
  const f = S.f;
  const PR = 'data-k="reglements">Règlements</button>';
  if (f.jtab !== 'retours') return journalRetBase().replace(PR, PR + '<button class="puce" data-a="onglet" data-c="jtab" data-k="retours">Retours</button>');
  const b = bornes(), L = C.listeRetours().filter(x => x.date >= b[0] && x.date <= b[1] && (admin() || x.userId === S.user.id)).reverse();
  const ok = L.filter(x => !x.annule);
  const h = '<div class="titre"><h1>Journaux</h1></div>' +
    puces('jtab', [['ventes', 'Ventes']].concat(admin() ? [['achats', 'Achats']] : [], [['depenses', 'Dépenses'], ['reglements', 'Règlements'], ['retours', 'Retours']])) + barrePer();
  if (!L.length) return h + '<div class="carte">' + vide('Aucun retour sur cette période', 'Ouvrez une facture puis touchez « Retour / remboursement ».') + '</div>';
  return h + '<p class="petit doux" style="margin:0 2px 6px">' + ok.length + ' retour' + (ok.length > 1 ? 's' : '') + ', total <b class="n">' + M(ok.reduce((s, x) => s + x.total, 0)) + '</b></p>' +
    '<div class="liste">' + L.slice(0, 300).map(r => '<button class="ligne" data-a="ticketRetour" data-id="' + r.id + '"><div class="f"><b>' + esc(r.clientId ? nomT(r.clientId) : 'Client de passage') + '</b><span>' + esc(r.num + ', facture ' + r.venteNum + ', ' + dh(r.date)) + '</span></div>' +
      '<div class="d"><b class="n rouge">-' + M(r.total) + '</b><span>' + (r.annule ? '<span class="etiq ko">Annulé</span>' : '<span class="etiq">' + (r.mode === 'avoir' ? 'Sur sa dette' : 'Espèces') + '</span>') + '</span></div></button>').join('') + '</div>';
};

/* ---------- rapports : remises, retours, remboursements ---------- */
const rapportsRetBase = V.rapports;
V.rapports = function () {
  let h = rapportsRetBase();
  const b = bornes(), R = C.rapport(b[0], b[1], admin() ? null : S.user.id);
  if (S.f.rtab === 'caisse' && R.rembourses > 0) h = h.replace(cl('Total des sorties', M(R.sorties), 'tot'), cl('Remboursements de retours', M(R.rembourses)) + cl('Total des sorties', M(R.sorties), 'tot'));
  if (S.f.rtab === 'resultat' && (R.retours > 0 || R.remises > 0)) {
    let av = '';
    if (R.remises > 0) av += cl('Remises accordées (déjà déduites)', M(R.remises), 'petit doux');
    if (R.retours > 0) av += cl('Retours de marchandise', '-' + M(R.retours)) + cl('Ventes nettes', M(R.caNet), 'gras');
    h = h.replace(cl('Coût d’achat des articles vendus', '-' + M(R.cout)), av + cl('Coût d’achat des articles vendus', '-' + M(R.cout - R.retoursCout)));
  }
  return h;
};

/* ---------- réglages ---------- */
const reglagesRetBase = V.reglages;
V.reglages = function () {
  const m = C.db.meta;
  return reglagesRetBase().replace('<span>Autoriser la caisse à modifier le prix de vente</span></label></div>',
    '<span>Autoriser la caisse à modifier le prix de vente</span></label>' +
    '<label class="coche" style="margin:0"><input type="checkbox" data-ch="optRem"' + (m.opt.remiseCaisse ? ' checked' : '') + '><span>Autoriser la caisse à faire une remise sur le total</span></label>' +
    '<label class="coche" style="margin:0"><input type="checkbox" data-ch="optRet"' + (m.opt.retourCaisse ? ' checked' : '') + '><span>Autoriser la caisse à enregistrer un retour ou un remboursement</span></label></div>');
};
CH.optRem = (v, el) => { C.db.meta.opt.remiseCaisse = el.checked; sauver(); };
CH.optRet = (v, el) => { C.db.meta.opt.retourCaisse = el.checked; sauver(); };
