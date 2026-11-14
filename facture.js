/* SAS STOCK — facture au format page (sans TVA) et logo de la boutique */
'use strict';
function cadreFacture(o) {
  const sh = C.db.meta.shop;
  return '<div class="facture"><div class="f-ent">' + (sh.logo ? '<img class="f-logo" src="' + esc(sh.logo) + '" alt="">' : '') + '<div><div class="f-nom">' + esc(sh.nom) + '</div>' + lignesBoutique().map(x => '<div>' + esc(x) + '</div>').join('') + '</div></div>' +
    '<div class="f-haut"><table class="f-infos">' + o.infos.map(i => '<tr><td>' + esc(i[0]) + '</td><td>' + esc(i[1]) + '</td></tr>').join('') + '</table>' +
    '<div class="f-dest"><b>Destinataire</b>' + o.dest.filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div></div>' +
    '<div class="f-titre">' + esc(o.titre) + '</div>' + o.corps +
    '<div class="f-bas"><div>' + esc(sh.pied || '') + '</div><div class="f-sign">Signature</div></div></div>';
}
const ligneTot = (l, m, g) => '<tr' + (g ? ' class="g"' : '') + '><td>' + l + '</td><td class="n">' + m + '</td></tr>';
function ticketVente(id, nouveau) {
  const v = C.par(C.db.ventes, id), c = v.clientId && C.tiers(v.clientId), du = v.total - v.paye;
  const corps = '<table class="f-tab"><thead><tr><th>Désignation des produits</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>' +
    v.lignes.map(l => '<tr><td>' + esc(l.nom) + '</td><td class="c n">' + F(l.qte) + '</td><td class="d n">' + M(l.pu) + '</td><td class="d n">' + M(l.qte * l.pu) + '</td></tr>').join('') +
    '<tr class="vide"><td></td><td></td><td></td><td></td></tr></tbody></table>' +
    '<table class="f-tot">' + ligneTot('Total', M(v.total)) + ligneTot('Montant payé', M(v.paye)) + (v.monnaie > 0 ? ligneTot('Monnaie rendue', M(v.monnaie)) : '') + ligneTot('Reste à payer', M(du), 1) + '</table>';
  ouvrir(nouveau ? 'Vente enregistrée' : 'Vente ' + v.num, cadreFacture({
    infos: [['Date d’émission', dj(v.date)], ['Émis par', (C.user(v.userId) || {}).nom || ''], ['Mode de paiement', du > 0 ? (v.paye > 0 ? 'Acompte, reste à crédit' : 'À crédit') : 'Comptant']],
    dest: c ? [c.nom, c.tel] : ['Client de passage'], titre: 'Facture n° ' + v.num + (v.annule ? ' (annulée)' : ''), corps }) + boutonsTicket(texteTicket(v)) +
    (nouveau ? '<button class="btn p large nonimp" style="margin-top:8px" data-a="fermer">Vente suivante</button>'
      : admin() && !v.annule ? '<button class="btn d large nonimp" style="margin-top:8px" data-a="annulerVente" data-id="' + v.id + '">Annuler cette vente</button>' : ''));
}
function ticketRecu(id) {
  const r = C.par(C.db.reglements, id), cli = r.type === 'client', t = C.tiers(r.tiersId) || {};
  const txt = [C.db.meta.shop.nom, 'Reçu de règlement ' + r.num + ' du ' + dh(r.date), (cli ? 'Client : ' : 'Fournisseur : ') + (t.nom || ''), 'Montant : ' + M(r.montant) + ' (' + r.mode + ')', 'Reste dû : ' + M(r.resteApres)].join('\n');
  const corps = '<table class="f-tab"><thead><tr><th>Désignation</th><th>Moyen de paiement</th><th>Montant</th></tr></thead><tbody><tr><td>' + esc(cli ? 'Règlement reçu du client' : 'Règlement payé au fournisseur') + (r.note ? '<br>' + esc(r.note) : '') + '</td><td class="c">' + esc(r.mode) + '</td><td class="d n">' + M(r.montant) + '</td></tr>' +
    '<tr class="vide court"><td></td><td></td><td></td></tr></tbody></table><table class="f-tot">' + ligneTot(cli ? 'Montant reçu' : 'Montant payé', M(r.montant)) + ligneTot('Reste dû après ce règlement', M(r.resteApres), 1) + '</table>';
  ouvrir('Règlement ' + r.num, cadreFacture({ infos: [['Date d’émission', dj(r.date)], ['Émis par', (C.user(r.userId) || {}).nom || '']], dest: [t.nom, t.tel], titre: 'Reçu de règlement n° ' + r.num, corps }) + boutonsTicket(txt));
}
function blocLogo() {
  const sh = C.db.meta.shop;
  return '<div class="carte" id="blocLogo" style="margin-top:12px"><span class="petit doux gras">Logo sur les factures</span>' +
    (sh.logo ? '<img src="' + esc(sh.logo) + '" alt="Logo actuel" style="display:block;max-height:80px;max-width:200px;margin:8px 0">' : '<p class="petit doux" style="margin:6px 0 8px">Aucun logo pour l’instant.</p>') +
    '<div class="rangee"><label class="btn f" style="cursor:pointer">' + (sh.logo ? 'Changer le logo' : 'Choisir un logo') + '<input type="file" accept="image/*" data-ch="logo" hidden></label>' + (sh.logo ? '<button class="btn d f" data-a="retirerLogo">Retirer</button>' : '') + '</div></div>';
}
const majBlocLogo = () => { const b = $('#blocLogo'); if (b) b.outerHTML = blocLogo(); };
const formBoutiqueBase = A.formBoutique;
A.formBoutique = () => { formBoutiqueBase(); $('#modale .boite').insertAdjacentHTML('beforeend', blocLogo()); };
A.retirerLogo = () => { delete C.db.meta.shop.logo; sauver(); majBlocLogo(); toast('Logo retiré'); };
CH.logo = (v, el) => {
  const fi = el.files && el.files[0]; if (!fi) return;
  const img = new Image(), url = URL.createObjectURL(fi);
  img.onload = () => {
    const k = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); C.db.meta.shop.logo = c.toDataURL('image/jpeg', 0.85); sauver(); majBlocLogo(); toast('Logo enregistré');
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Cette image ne peut pas être lue. Essayez un fichier JPG ou PNG.', true); };
  img.src = url;
};
