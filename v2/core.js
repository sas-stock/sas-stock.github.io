/* SAS STOCK — données et règles de gestion (stock, ventes, achats, caisse, rapports) */
(function (root) {
  'use strict';
  var C = { db: null };

  C.vide = function () {
    return { v: 1,
      meta: { shop: { nom: '', tel: '', adresse: '', pied: 'Merci de votre confiance.' },
              opt: { venteSansStock: false, prixLibre: false }, seq: { V: 0, A: 0, R: 0 }, sauvegarde: 0, cree: Date.now() },
      users: [], depots: [], familles: [], articles: [], stock: {}, tiers: [],
      ventes: [], achats: [], reglements: [], depenses: [], mouvements: [] };
  };
  C.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  function err(m) { var e = new Error(m); e.metier = true; return e; }
  function par(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }
  C.par = par;
  C.article = function (id) { return par(C.db.articles, id); };
  C.tiers = function (id) { return par(C.db.tiers, id); };
  C.user = function (id) { return par(C.db.users, id); };
  C.depot = function (id) { return par(C.db.depots, id); };
  C.famille = function (id) { return par(C.db.familles, id); };
  C.numero = function (p) { var n = ++C.db.meta.seq[p]; return p + '-' + String(n).padStart(5, '0'); };

  /* ---------- stock ---------- */
  C.qte = function (aid, did) { return (C.db.stock[aid] || {})[did] || 0; };
  C.qteTot = function (aid) { var s = C.db.stock[aid] || {}, t = 0; for (var k in s) t += s[k]; return t; };
  function mouv(aid, did, qte, type, ref, userId, date, note) {
    var s = C.db.stock[aid] || (C.db.stock[aid] = {});
    s[did] = (s[did] || 0) + qte;
    C.db.mouvements.push({ id: C.uid(), date: date || Date.now(), userId: userId, articleId: aid, depotId: did, qte: qte, apres: s[did], type: type, ref: ref || '', note: note || '' });
  }
  C.transferer = function (aid, de, vers, qte, userId) {
    if (!(qte > 0)) throw err('Indiquez une quantité à transférer.');
    if (de === vers) throw err('Choisissez deux dépôts différents.');
    if (C.qte(aid, de) < qte) throw err('Stock insuffisant dans ' + C.depot(de).nom + ' : ' + C.qte(aid, de) + ' disponible(s).');
    var ref = 'Vers ' + C.depot(vers).nom, d = Date.now();
    mouv(aid, de, -qte, 'transfert', ref, userId, d);
    mouv(aid, vers, qte, 'transfert', 'De ' + C.depot(de).nom, userId, d);
  };
  C.ajuster = function (aid, did, nouvelle, motif, userId) {
    if (!(nouvelle >= 0)) throw err('La quantité comptée doit être 0 ou plus.');
    var ecart = nouvelle - C.qte(aid, did);
    if (ecart === 0) throw err('La quantité comptée est identique au stock actuel.');
    mouv(aid, did, ecart, 'ajustement', motif || 'Inventaire', userId);
  };

  /* ---------- ventes ---------- */
  C.creerVente = function (o) {
    if (!o.lignes || !o.lignes.length) throw err('Ajoutez au moins un article.');
    var total = 0, besoin = {}, lignes = [];
    o.lignes.forEach(function (l) {
      var a = C.article(l.articleId);
      if (!a) throw err('Article introuvable.');
      if (!(l.qte > 0)) throw err('Quantité invalide pour ' + a.nom + '.');
      if (!(l.pu >= 0)) throw err('Prix invalide pour ' + a.nom + '.');
      besoin[a.id] = (besoin[a.id] || 0) + l.qte;
      total += l.qte * l.pu;
      lignes.push({ articleId: a.id, nom: a.nom, qte: l.qte, pu: l.pu, pa: a.pa || 0 });
    });
    if (!C.db.meta.opt.venteSansStock) for (var aid in besoin) {
      var dispo = C.qte(aid, o.depotId);
      if (dispo < besoin[aid]) throw err('Stock insuffisant pour ' + C.article(aid).nom + ' : ' + dispo + ' disponible(s).');
    }
    var recu = o.recu == null ? total : o.recu;
    if (!(recu >= 0)) throw err('Montant reçu invalide.');
    var paye = Math.min(recu, total);
    if (paye < total && !o.clientId) throw err('Vente à crédit : choisissez un client pour suivre son impayé.');
    var v = { id: C.uid(), num: C.numero('V'), date: o.date || Date.now(), userId: o.userId, clientId: o.clientId || '', depotId: o.depotId,
              lignes: lignes, total: total, paye: paye, recu: recu, monnaie: Math.max(0, recu - total), annule: false };
    lignes.forEach(function (l) { mouv(l.articleId, o.depotId, -l.qte, 'vente', v.num, o.userId, v.date); });
    C.db.ventes.push(v);
    return v;
  };
  C.annulerVente = function (id, userId) {
    var v = par(C.db.ventes, id);
    if (!v || v.annule) throw err('Vente déjà annulée.');
    v.annule = true; v.annulePar = userId; v.annuleLe = Date.now();
    v.lignes.forEach(function (l) { mouv(l.articleId, v.depotId, l.qte, 'annulation', v.num, userId); });
  };

  /* ---------- achats (bons de livraison) ---------- */
  C.creerAchat = function (o) {
    if (!o.lignes || !o.lignes.length) throw err('Ajoutez au moins un article.');
    if (!o.fournisseurId) throw err('Choisissez un fournisseur.');
    var total = 0, lignes = [];
    o.lignes.forEach(function (l) {
      var a = C.article(l.articleId);
      if (!(l.qte > 0)) throw err('Quantité invalide pour ' + a.nom + '.');
      if (!(l.pu >= 0)) throw err('Prix invalide pour ' + a.nom + '.');
      total += l.qte * l.pu; lignes.push({ articleId: a.id, nom: a.nom, qte: l.qte, pu: l.pu });
    });
    var paye = o.paye == null ? total : o.paye;
    if (!(paye >= 0) || paye > total) throw err('Le montant payé doit être compris entre 0 et ' + total + '.');
    var ac = { id: C.uid(), num: C.numero('A'), date: o.date || Date.now(), userId: o.userId, fournisseurId: o.fournisseurId, depotId: o.depotId,
               ref: o.ref || '', lignes: lignes, total: total, paye: paye, annule: false };
    lignes.forEach(function (l) { // coût moyen pondéré
      var a = C.article(l.articleId), avant = Math.max(0, C.qteTot(a.id));
      l.paAvant = a.pa || 0;
      a.pa = Math.round((avant * (a.pa || 0) + l.qte * l.pu) / (avant + l.qte));
      mouv(a.id, o.depotId, l.qte, 'achat', ac.num, o.userId, ac.date);
    });
    C.db.achats.push(ac);
    return ac;
  };
  C.annulerAchat = function (id, userId) {
    var ac = par(C.db.achats, id);
    if (!ac || ac.annule) throw err('Achat déjà annulé.');
    ac.lignes.forEach(function (l) {
      if (C.qte(l.articleId, ac.depotId) < l.qte) throw err('Impossible : une partie de ' + l.nom + ' a déjà quitté ce dépôt.');
    });
    ac.annule = true;
    ac.lignes.forEach(function (l) { mouv(l.articleId, ac.depotId, -l.qte, 'annulation', ac.num, userId); });
  };

  /* ---------- règlements, dépenses, soldes ---------- */
  C.solde = function (tid) {
    var t = C.tiers(tid), s = 0; if (!t) return 0;
    if (t.type === 'client') C.db.ventes.forEach(function (v) { if (!v.annule && v.clientId === tid) s += v.total - v.paye; });
    else C.db.achats.forEach(function (a) { if (!a.annule && a.fournisseurId === tid) s += a.total - a.paye; });
    C.db.reglements.forEach(function (r) { if (r.tiersId === tid) s -= r.montant; });
    return s;
  };
  C.regler = function (o) {
    var t = C.tiers(o.tiersId);
    if (!t) throw err('Tiers introuvable.');
    if (!(o.montant > 0)) throw err('Indiquez un montant.');
    var du = C.solde(t.id);
    if (o.montant > du) throw err('Le montant dépasse le reste dû (' + du + ').');
    var r = { id: C.uid(), num: C.numero('R'), date: Date.now(), userId: o.userId, tiersId: t.id, type: t.type, montant: o.montant, mode: o.mode || 'Espèces', note: o.note || '', resteApres: du - o.montant };
    C.db.reglements.push(r);
    return r;
  };
  C.depenser = function (o) {
    if (!o.libelle) throw err('Indiquez le motif de la dépense.');
    if (!(o.montant > 0)) throw err('Indiquez un montant.');
    var d = { id: C.uid(), date: Date.now(), userId: o.userId, libelle: o.libelle, categorie: o.categorie || 'Divers', montant: o.montant };
    C.db.depenses.push(d); return d;
  };

  /* ---------- rapports ---------- */
  C.rapport = function (de, a, userId) {
    var db = C.db;
    function dans(x) { return x.date >= de && x.date <= a && (!userId || x.userId === userId); }
    var R = { nbVentes: 0, ca: 0, cout: 0, encVentes: 0, credit: 0, reglClients: 0, depenses: 0, payeAchats: 0, reglFourn: 0, achats: 0, nbAchats: 0 };
    var art = {}, cli = {}, fam = {}, cai = {}, four = {};
    function caisse(uid) { return cai[uid] || (cai[uid] = { id: uid, nom: (C.user(uid) || {}).nom || '—', nb: 0, ca: 0, enc: 0, dep: 0 }); }
    db.ventes.forEach(function (v) {
      if (v.annule || !dans(v)) return;
      R.nbVentes++; R.ca += v.total; R.encVentes += v.paye; R.credit += v.total - v.paye;
      var k = caisse(v.userId); k.nb++; k.ca += v.total; k.enc += v.paye;
      var cn = v.clientId ? (C.tiers(v.clientId) || {}).nom || '—' : 'Clients de passage', cid = v.clientId || '_';
      var c = cli[cid] || (cli[cid] = { id: cid, nom: cn, nb: 0, ca: 0 }); c.nb++; c.ca += v.total;
      v.lignes.forEach(function (l) {
        var m = l.qte * l.pu, co = l.qte * l.pa; R.cout += co;
        var x = art[l.articleId] || (art[l.articleId] = { id: l.articleId, nom: l.nom, qte: 0, ca: 0, marge: 0 });
        x.qte += l.qte; x.ca += m; x.marge += m - co;
        var ar = C.article(l.articleId), f = ar && C.famille(ar.familleId), fid = f ? f.id : '_';
        var y = fam[fid] || (fam[fid] = { id: fid, nom: f ? f.nom : 'Sans famille', qte: 0, ca: 0, marge: 0 });
        y.qte += l.qte; y.ca += m; y.marge += m - co;
      });
    });
    db.reglements.forEach(function (r) {
      if (!dans(r)) return;
      if (r.type === 'client') { R.reglClients += r.montant; caisse(r.userId).enc += r.montant; } else R.reglFourn += r.montant;
    });
    db.depenses.forEach(function (d) { if (dans(d)) { R.depenses += d.montant; caisse(d.userId).dep += d.montant; } });
    db.achats.forEach(function (x) {
      if (x.annule || !dans(x)) return;
      R.nbAchats++; R.achats += x.total; R.payeAchats += x.paye;
      var f = four[x.fournisseurId] || (four[x.fournisseurId] = { id: x.fournisseurId, nom: (C.tiers(x.fournisseurId) || {}).nom || '—', nb: 0, total: 0 });
      f.nb++; f.total += x.total;
    });
    R.entrees = R.encVentes + R.reglClients;
    R.sorties = R.depenses + R.payeAchats + R.reglFourn;
    R.soldeCaisse = R.entrees - R.sorties;
    R.marge = R.ca - R.cout;
    R.benefice = R.marge - R.depenses;
    function tri(o, k) { return Object.keys(o).map(function (i) { return o[i]; }).sort(function (x, y) { return y[k] - x[k]; }); }
    R.parArticle = tri(art, 'ca'); R.parClient = tri(cli, 'ca'); R.parFamille = tri(fam, 'ca'); R.parCaissier = tri(cai, 'ca'); R.parFournisseur = tri(four, 'total');
    return R;
  };
  C.valeurStock = function (did) {
    var pa = 0, pv = 0, n = 0;
    C.db.articles.forEach(function (a) { if (a.actif === false) return; var q = did ? C.qte(a.id, did) : C.qteTot(a.id); if (q > 0) { pa += q * (a.pa || 0); pv += q * (a.pv || 0); n += q; } });
    return { achat: pa, vente: pv, unites: n };
  };
  C.alertes = function () {
    return C.db.articles.filter(function (a) { return a.actif !== false && C.qteTot(a.id) <= (a.seuil || 0); })
      .sort(function (x, y) { return C.qteTot(x.id) - C.qteTot(y.id); });
  };
  C.impayes = function (type) {
    return C.db.tiers.filter(function (t) { return t.type === type; }).map(function (t) { return { t: t, du: C.solde(t.id) }; })
      .filter(function (x) { return x.du > 0; }).sort(function (x, y) { return y.du - x.du; });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.CORE = C;
})(typeof self !== 'undefined' ? self : this);
