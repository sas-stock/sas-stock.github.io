/* SAS STOCK — données et règles de gestion (stock, ventes, achats, caisse, rapports) */
(function (root) {
  'use strict';
  var C = { db: null };

  C.vide = function () {
    return { v: 1,
      meta: { shop: { nom: '', tel: '', adresse: '', pied: 'Merci de votre confiance.' },
              opt: { venteSansStock: false, prixLibre: false, remiseCaisse: false }, seq: { V: 0, A: 0, R: 0, T: 0 }, sauvegarde: 0, cree: Date.now() },
      users: [], depots: [], familles: [], articles: [], stock: {}, tiers: [],
      ventes: [], achats: [], reglements: [], depenses: [], mouvements: [], retours: [] };
  };
  C.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

  /* ---------- index en mémoire (vitesse) ----------
     Les soldes et les rapports étaient recalculés à chaque affichage, en parcourant
     toutes les ventes pour chaque client : sur une grosse boutique l'application
     passait plus d'une seconde par écran. On les calcule maintenant en une passe et
     on les garde jusqu'à la prochaine modification. */
  C.rev = 0;
  var _soldes = null, _rapports = {}, _sig = '', _vieuxD = null, _vieuxJ = null;
  C.touche = function () { C.rev++; _soldes = null; _rapports = {}; _vieuxD = _vieuxJ = null; };
  function signature() {
    var d = C.db;
    if (!d) return '';
    return d.ventes.length + '.' + d.achats.length + '.' + d.reglements.length + '.' + d.depenses.length + '.' +
      d.mouvements.length + '.' + d.tiers.length + '.' + d.articles.length + '.' + d.users.length + '.' + d.depots.length + '.' + d.familles.length + '.' + (d.retours || []).length + '.' + C.rev;
  }
  function frais() { // vide les index si la base a changé sans passer par C.touche (synchro, restauration)
    var g = signature();
    if (g !== _sig) { _sig = g; _soldes = null; _rapports = {}; _vieuxD = _vieuxJ = null; }
  }
  C.sig = signature;
  C.soldes = function () { // tous les soldes en une seule passe
    frais();
    if (_soldes) return _soldes;
    var s = {}, d = C.db;
    d.tiers.forEach(function (t) { var x = 0; (t.dettes || []).forEach(function (y) { x += y.montant; }); s[t.id] = x; });
    d.ventes.forEach(function (v) { if (!v.annule && v.clientId && s[v.clientId] != null) s[v.clientId] += v.total - v.paye; });
    d.achats.forEach(function (a) { if (!a.annule && a.fournisseurId && s[a.fournisseurId] != null) s[a.fournisseurId] += a.total - a.paye; });
    C.listeRetours().forEach(function (r) { if (!r.annule && r.mode === 'avoir' && r.clientId && s[r.clientId] != null) s[r.clientId] -= r.total; });
    d.reglements.forEach(function (r) { if (s[r.tiersId] != null) s[r.tiersId] -= r.montant; });
    _soldes = s;
    return s;
  };
  /* Le plus ancien montant encore dû, par client, en une passe.
     C.vieuxCreditsD() rend l'opération entière (date, reste dû, n° de facture) : les
     relances citent la facture au client. C.vieuxCredits() n'en garde que les dates.
     Les deux sont mémorisés : notif.js les interroge une fois par client impayé. */
  function calculVieux() {
    var parCli = {}, regle = {}, out = {};
    function ajoute(id, date, du, num) { if (du > 0) (parCli[id] || (parCli[id] = [])).push({ date: date, du: du, num: num || null }); }
    C.db.ventes.forEach(function (v) { if (!v.annule && v.clientId) ajoute(v.clientId, v.date, v.total - v.paye, v.num); });
    C.db.tiers.forEach(function (t) { (t.dettes || []).forEach(function (d) { ajoute(t.id, d.date, d.montant, null); }); });
    C.db.reglements.forEach(function (r) { regle[r.tiersId] = (regle[r.tiersId] || 0) + r.montant; });
    C.listeRetours().forEach(function (r) { if (!r.annule && r.mode === 'avoir' && r.clientId) regle[r.clientId] = (regle[r.clientId] || 0) + r.total; });
    Object.keys(parCli).forEach(function (id) {
      var reste = regle[id] || 0, L = parCli[id].sort(function (a, b) { return a.date - b.date; });
      for (var i = 0; i < L.length; i++) { if (reste >= L[i].du) { reste -= L[i].du; continue; } out[id] = L[i]; return; }
    });
    return out;
  }
  C.vieuxCreditsD = function () { frais(); if (!_vieuxD) _vieuxD = calculVieux(); return _vieuxD; };
  C.vieuxCredits = function () {
    frais();
    if (!_vieuxJ) { var d = C.vieuxCreditsD(); _vieuxJ = {}; Object.keys(d).forEach(function (k) { _vieuxJ[k] = d[k].date; }); }
    return _vieuxJ;
  };
  function err(m) { var e = new Error(m); e.metier = true; return e; }
  function par(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }
  C.par = par;
  /* Retrouver un article par son identifiant parcourait toute la liste : sur un rapport
     de plusieurs milliers de lignes cela faisait des millions de comparaisons. */
  var _idx = {}, _idxSig = null;
  function index(nom) {
    var g = signature();
    if (g !== _idxSig) { _idx = {}; _idxSig = g; }
    var m = _idx[nom];
    if (!m) { m = _idx[nom] = Object.create(null); C.db[nom].forEach(function (x) { m[x.id] = x; }); }
    return m;
  }
  C.article = function (id) { return index('articles')[id] || null; };
  C.tiers = function (id) { return index('tiers')[id] || null; };
  C.user = function (id) { return index('users')[id] || null; };
  C.depot = function (id) { return index('depots')[id] || null; };
  C.famille = function (id) { return index('familles')[id] || null; };
  C.numero = function (p) { var n = (C.db.meta.seq[p] || 0) + 1; C.db.meta.seq[p] = n; return p + '-' + String(n).padStart(5, '0'); };
  C.listeRetours = function () { return C.db.retours || (C.db.retours = []); }; // anciennes boutiques : la liste n'existe pas encore

  /* ---------- stock ---------- */
  C.qte = function (aid, did) { return (C.db.stock[aid] || {})[did] || 0; };
  C.qteTot = function (aid) { var s = C.db.stock[aid] || {}, t = 0; for (var k in s) t += s[k]; return t; };
  function mouv(aid, did, qte, type, ref, userId, date, note) {
    C.touche();
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
  C.calcRemise = function (brut, r) { // r = { t: 'f' (francs) ou 'p' (pourcentage), v: valeur }
    if (!r || !(r.v > 0)) return 0;
    if (r.t === 'p' && r.v > 100) throw err('La remise ne peut pas dépasser 100 %.');
    var m = Math.round(r.t === 'p' ? brut * r.v / 100 : r.v);
    if (m > brut) throw err('La remise (' + m + ') dépasse le montant de la vente (' + brut + ').');
    return m;
  };
  C.creerVente = function (o) {
    C.touche();
    if (!o.lignes || !o.lignes.length) throw err('Ajoutez au moins un article.');
    var total = 0, besoin = {}, lignes = [];
    o.lignes.forEach(function (l) {
      if (l.libre) { // article saisi à la main, hors stock
        var nm = String(l.nom || '').trim();
        if (!nm) throw err('Indiquez le nom de l’article hors stock.');
        if (!(l.qte > 0)) throw err('Quantité invalide pour ' + nm + '.');
        if (!(l.pu >= 0)) throw err('Indiquez le prix unitaire de ' + nm + '.');
        total += l.qte * l.pu;
        lignes.push({ articleId: '', libre: true, nom: nm, qte: l.qte, pu: l.pu, pa: 0 });
        return;
      }
      var a = C.article(l.articleId);
      if (!a) throw err('Article introuvable.');
      if (!(l.qte > 0)) throw err('Quantité invalide pour ' + a.nom + '.');
      if (!(l.pu >= 0)) throw err('Prix invalide pour ' + a.nom + '.');
      besoin[a.id] = (besoin[a.id] || 0) + l.qte;
      total += l.qte * l.pu;
      lignes.push(l.lot ? { articleId: a.id, nom: a.nom, qte: l.qte, pu: l.pu, pa: a.pa || 0, lot: l.lot } : { articleId: a.id, nom: a.nom, qte: l.qte, pu: l.pu, pa: a.pa || 0 });
    });
    if (!C.db.meta.opt.venteSansStock) for (var aid in besoin) {
      var dispo = C.qte(aid, o.depotId);
      if (dispo < besoin[aid]) throw err('Stock insuffisant pour ' + C.article(aid).nom + ' : ' + dispo + ' disponible(s).');
    }
    var brut = total, rem = C.calcRemise(brut, o.remise);
    total = brut - rem;
    var recu = o.recu == null ? total : o.recu;
    if (!(recu >= 0)) throw err('Montant reçu invalide.');
    var paye = Math.min(recu, total);
    if (paye < total && !o.clientId) throw err('Vente à crédit : choisissez un client pour suivre son impayé.');
    var v = { id: C.uid(), num: C.numero('V'), date: o.date || Date.now(), userId: o.userId, clientId: o.clientId || '', depotId: o.depotId,
              lignes: lignes, total: total, paye: paye, recu: recu, monnaie: Math.max(0, recu - total), annule: false };
    if (rem > 0) { v.brut = brut; v.remise = rem; if (o.remise && o.remise.t === 'p') v.remiseP = o.remise.v; }
    if (o.remplace) v.remplace = o.remplace;
    if (paye > 0) v.mode = o.mode || 'Espèces';
    lignes.forEach(function (l) { if (!l.libre) mouv(l.articleId, o.depotId, -l.qte, 'vente', v.num, o.userId, v.date); });
    C.db.ventes.push(v);
    return v;
  };
  C.annulerVente = function (id, userId) {
    C.touche();
    var v = par(C.db.ventes, id);
    if (!v || v.annule) throw err('Vente déjà annulée.');
    v.annule = true; v.annulePar = userId; v.annuleLe = Date.now();
    v.lignes.forEach(function (l) { if (!l.libre) mouv(l.articleId, v.depotId, l.qte, 'annulation', v.num, userId); });
  };

  /* ---------- retours et remboursements ---------- */
  C.dejaRetourne = function (vid) { // quantités déjà reprises, par numéro de ligne de la facture
    var q = {};
    C.listeRetours().forEach(function (r) {
      if (r.annule || r.venteId !== vid) return;
      r.lignes.forEach(function (l) { q[l.i] = (q[l.i] || 0) + l.qte; });
    });
    return q;
  };
  C.retourner = function (o) {
    C.touche();
    var v = par(C.db.ventes, o.venteId);
    if (!v) throw err('Facture introuvable.');
    if (v.annule) throw err('Cette facture est annulée : il n’y a plus rien à reprendre.');
    var deja = C.dejaRetourne(v.id), brut = 0, lignes = [];
    (o.lignes || []).forEach(function (x) {
      var l = v.lignes[x.i];
      if (!l) throw err('Ligne introuvable sur la facture.');
      if (!(x.qte > 0)) return;
      var reste = l.qte - (deja[x.i] || 0);
      if (x.qte > reste) throw err('Pour ' + l.nom + ' : ' + reste + ' au maximum (le reste a déjà été repris).');
      brut += x.qte * l.pu;
      lignes.push({ i: x.i, articleId: l.articleId, libre: !!l.libre, nom: l.nom, qte: x.qte, pu: l.pu, pa: l.pa || 0 });
    });
    if (!lignes.length) throw err('Indiquez la quantité reprise pour au moins un article.');
    var total = v.remise > 0 && v.brut > 0 ? Math.round(brut * v.total / v.brut) : brut; // la remise de la facture s'applique aussi au retour
    var mode = o.mode === 'avoir' ? 'avoir' : 'espece';
    if (mode === 'avoir') {
      if (!v.clientId) throw err('Sans client enregistré, le remboursement doit se faire en espèces.');
      var du = C.solde(v.clientId);
      if (du <= 0) throw err('Ce client ne doit rien : remboursez en espèces.');
      if (total > du) throw err('Le client ne doit que ' + du + ' : déduisez au plus ce montant, le reste en espèces.');
    }
    var r = { id: C.uid(), num: C.numero('T'), date: o.date || Date.now(), userId: o.userId, venteId: v.id, venteNum: v.num,
              clientId: v.clientId || '', depotId: o.depotId || v.depotId, lignes: lignes, total: total, mode: mode, motif: o.motif || '', annule: false };
    lignes.forEach(function (l) { if (!l.libre) mouv(l.articleId, r.depotId, l.qte, 'retour', r.num, o.userId, r.date); });
    C.listeRetours().push(r);
    return r;
  };
  C.annulerRetour = function (id, userId) {
    C.touche();
    var r = par(C.listeRetours(), id);
    if (!r || r.annule) throw err('Retour déjà annulé.');
    r.lignes.forEach(function (l) { if (!l.libre && C.qte(l.articleId, r.depotId) < l.qte) throw err('Impossible : ' + l.nom + ' est déjà reparti de ce dépôt.'); });
    r.annule = true; r.annulePar = userId; r.annuleLe = Date.now();
    r.lignes.forEach(function (l) { if (!l.libre) mouv(l.articleId, r.depotId, -l.qte, 'annulation', r.num, userId); });
  };

  C.remplacerVente = function (id, o) { // corriger une facture : annule l'ancienne et crée la nouvelle, ou ne change rien en cas d'erreur
    var v = par(C.db.ventes, id);
    if (!v || v.annule) throw err('Cette vente est déjà annulée.');
    var nMouv = C.db.mouvements.length, seq = C.db.meta.seq.V;
    C.annulerVente(id, o.userId);
    try { o.remplace = v.num; var n = C.creerVente(o); v.remplaceePar = n.num; return n; }
    catch (e) {
      C.db.mouvements.splice(nMouv).forEach(function (m) { C.db.stock[m.articleId][m.depotId] -= m.qte; });
      v.annule = false; delete v.annulePar; delete v.annuleLe; C.db.meta.seq.V = seq; throw e;
    }
  };

  /* ---------- achats (bons de livraison) ---------- */
  C.creerAchat = function (o) {
    C.touche();
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
    C.touche();
    var ac = par(C.db.achats, id);
    if (!ac || ac.annule) throw err('Achat déjà annulé.');
    ac.lignes.forEach(function (l) {
      if (C.qte(l.articleId, ac.depotId) < l.qte) throw err('Impossible : une partie de ' + l.nom + ' a déjà quitté ce dépôt.');
    });
    ac.annule = true; ac.annulePar = userId; ac.annuleLe = Date.now();
    ac.lignes.forEach(function (l) { mouv(l.articleId, ac.depotId, -l.qte, 'annulation', ac.num, userId); });
  };

  /* ---------- règlements, dépenses, soldes ---------- */
  C.solde = function (tid) { var s = C.soldes()[tid]; return s == null ? 0 : s; };
  C.regler = function (o) {
    C.touche();
    var t = C.tiers(o.tiersId);
    if (!t) throw err('Tiers introuvable.');
    if (!(o.montant > 0)) throw err('Indiquez un montant.');
    var du = C.solde(t.id);
    if (o.montant > du) throw err('Le montant dépasse le reste dû (' + du + ').');
    var r = { id: C.uid(), num: C.numero('R'), date: Date.now(), userId: o.userId, tiersId: t.id, type: t.type, montant: o.montant, mode: o.mode || 'Espèces', note: o.note || '', resteApres: du - o.montant };
    C.db.reglements.push(r);
    return r;
  };
  C.ajouterDette = function (o) {
    C.touche();
    var t = C.tiers(o.tiersId);
    if (!t) throw err('Tiers introuvable.');
    if (!(o.montant > 0)) throw err('Indiquez un montant.');
    var d = { id: C.uid(), date: o.date || Date.now(), montant: o.montant, note: o.note || '', userId: o.userId };
    t.dettes = (t.dettes || []).concat([d]);
    return d;
  };
  C.retirerDette = function (tid, did) {
    C.touche();
    var t = C.tiers(tid), d = t && (t.dettes || []).find(function (x) { return x.id === did; });
    if (!d) throw err('Somme introuvable.');
    if (C.solde(tid) - d.montant < 0) throw err('Impossible : des règlements ont déjà été enregistrés sur cette somme.');
    t.dettes = t.dettes.filter(function (x) { return x.id !== did; });
  };
  C.depenser = function (o) {
    C.touche();
    if (!o.libelle) throw err('Indiquez le motif de la dépense.');
    if (!(o.montant > 0)) throw err('Indiquez un montant.');
    var d = { id: C.uid(), date: Date.now(), userId: o.userId, libelle: o.libelle, categorie: o.categorie || 'Divers', montant: o.montant };
    C.db.depenses.push(d); return d;
  };

  /* ---------- rapports ---------- */
  C.rapport = function (de, a, userId) { // gardé en mémoire : un même écran l'appelle plusieurs fois
    frais();
    var k = de + '|' + a + '|' + (userId || '');
    if (_rapports[k]) return _rapports[k];
    var R = calculRapport(de, a, userId);
    if (Object.keys(_rapports).length > 8) _rapports = {};
    _rapports[k] = R;
    return R;
  };
  function calculRapport(de, a, userId) {
    var db = C.db;
    function dans(x) { return x.date >= de && x.date <= a && (!userId || x.userId === userId); }
    var R = { nbVentes: 0, ca: 0, cout: 0, encVentes: 0, credit: 0, reglClients: 0, depenses: 0, payeAchats: 0, reglFourn: 0, achats: 0, nbAchats: 0,
              remises: 0, retours: 0, retoursCout: 0, rembourses: 0, avoirs: 0, nbRetours: 0 };
    var art = {}, cli = {}, fam = {}, cai = {}, four = {}, modes = {};
    function mode(m, x) { m = m || 'Espèces'; modes[m] = (modes[m] || 0) + x; }
    function caisse(uid) { return cai[uid] || (cai[uid] = { id: uid, nom: (C.user(uid) || {}).nom || '—', nb: 0, ca: 0, enc: 0, dep: 0 }); }
    db.ventes.forEach(function (v) {
      if (v.annule || !dans(v)) return;
      R.nbVentes++; R.ca += v.total; R.encVentes += v.paye; R.credit += v.total - v.paye; if (v.paye > 0) mode(v.mode, v.paye);
      if (v.remise > 0) R.remises += v.remise;
      var kr = v.remise > 0 && v.brut > 0 ? v.total / v.brut : 1; // la remise se répartit sur les lignes
      var k = caisse(v.userId); k.nb++; k.ca += v.total; k.enc += v.paye;
      var cn = v.clientId ? (C.tiers(v.clientId) || {}).nom || '—' : 'Clients de passage', cid = v.clientId || '_';
      var c = cli[cid] || (cli[cid] = { id: cid, nom: cn, nb: 0, ca: 0 }); c.nb++; c.ca += v.total;
      v.lignes.forEach(function (l) {
        var m = Math.round(l.qte * l.pu * kr), co = l.qte * l.pa; R.cout += co;
        statArticle({ articleId: l.articleId, libre: l.libre, nom: l.nom, q: l.qte }, m, co);
      });
    });
    function statArticle(l, m, co) { // ajoute (ou retire, si négatif) une ligne aux statistiques par article et par famille
      var ka = l.articleId || 'libre:' + l.nom, x = art[ka] || (art[ka] = { id: ka, nom: l.libre ? l.nom + ' (hors stock)' : l.nom, qte: 0, ca: 0, marge: 0 });
      x.qte += l.q; x.ca += m; x.marge += m - co;
      var ar = C.article(l.articleId), f = ar && C.famille(ar.familleId), fid = f ? f.id : '_';
      var y = fam[fid] || (fam[fid] = { id: fid, nom: f ? f.nom : 'Sans famille', qte: 0, ca: 0, marge: 0 });
      y.qte += l.q; y.ca += m; y.marge += m - co;
    }
    C.listeRetours().forEach(function (r) {
      if (r.annule || !dans(r)) return;
      R.nbRetours++; R.retours += r.total;
      var kr2 = r.total && r.lignes.length ? r.total / r.lignes.reduce(function (s2, l) { return s2 + l.qte * l.pu; }, 0) : 1;
      r.lignes.forEach(function (l) {
        var co = l.qte * (l.pa || 0); R.retoursCout += co;
        statArticle({ articleId: l.articleId, libre: l.libre, nom: l.nom, q: -l.qte }, -Math.round(l.qte * l.pu * kr2), -co);
      });
      if (r.mode === 'espece') { R.rembourses += r.total; var kc = caisse(r.userId); kc.rem = (kc.rem || 0) + r.total; }
      else R.avoirs += r.total;
    });
    db.reglements.forEach(function (r) {
      if (!dans(r)) return;
      if (r.type === 'client') { R.reglClients += r.montant; caisse(r.userId).enc += r.montant; mode(r.mode, r.montant); } else R.reglFourn += r.montant;
    });
    db.depenses.forEach(function (d) { if (dans(d)) { R.depenses += d.montant; caisse(d.userId).dep += d.montant; } });
    db.achats.forEach(function (x) {
      if (x.annule || !dans(x)) return;
      R.nbAchats++; R.achats += x.total; R.payeAchats += x.paye;
      var f = four[x.fournisseurId] || (four[x.fournisseurId] = { id: x.fournisseurId, nom: (C.tiers(x.fournisseurId) || {}).nom || '—', nb: 0, total: 0 });
      f.nb++; f.total += x.total;
    });
    R.entrees = R.encVentes + R.reglClients;
    R.sorties = R.depenses + R.payeAchats + R.reglFourn + R.rembourses;
    R.soldeCaisse = R.entrees - R.sorties;
    R.caNet = R.ca - R.retours;
    R.marge = R.caNet - (R.cout - R.retoursCout);
    R.benefice = R.marge - R.depenses;
    function tri(o, k) { return Object.keys(o).map(function (i) { return o[i]; }).sort(function (x, y) { return y[k] - x[k]; }); }
    R.parMode = Object.keys(modes).map(function (k) { return { nom: k, montant: modes[k] }; }).sort(function (x, y) { return y.montant - x.montant; });
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
    var s = C.soldes();
    return C.db.tiers.filter(function (t) { return t.type === type; }).map(function (t) { return { t: t, du: s[t.id] || 0 }; })
      .filter(function (x) { return x.du > 0; }).sort(function (x, y) { return y.du - x.du; });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.CORE = C;
})(typeof self !== 'undefined' ? self : this);
