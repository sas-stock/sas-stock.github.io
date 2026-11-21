/* SAS STOCK 2 — compte Google, licence en ligne et synchronisation entre appareils */
'use strict';
let compte = null, licFin = null, syncEtat = 'attente', sy = { h: {}, last: 0, init: false }, arret = null, arretLic = null, tPousse = null, enPousse = false, encore = false;
const cle = n => n + '_' + compte.uid;
const LISTES = { a: 'articles', t: 'tiers', v: 'ventes', c: 'achats', r: 'reglements', e: 'depenses', m: 'mouvements', x: 'retours' };
function hache(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
const cacheMouv = new Map(); // les mouvements de stock ne changent plus une fois écrits : on garde leur JSON et leur empreinte
function jsonMouv(x) {
  let c = cacheMouv.get(x.id);
  if (!c) { const j = JSON.stringify(x); c = [j, hache(j)]; cacheMouv.set(x.id, c); }
  return c;
}
/* Construire la liste complète des enregistrements à envoyer coûte cher sur une grosse
   boutique : on la calcule par tranches pour ne pas bloquer l'écran, et on la garde
   tant que rien n'a changé (l'envoi et le compteur « à envoyer » s'en servent tous les deux). */
let _entSig = null, _ent = null;
async function entites() {
  const g = C.sig();
  if (_ent && g === _entSig) return _ent;
  const d = C.db, o = new Map();
  if (d.users.length) { const j = JSON.stringify({ shop: d.meta.shop, opt: d.meta.opt, users: d.users, depots: d.depots, familles: d.familles }); o.set('cfg', [j, hache(j)]); }
  let n = 0;
  for (const p in LISTES) {
    const L = d[LISTES[p]] || [];
    for (let i = 0; i < L.length; i++) {
      const x = L[i];
      if (p === 'm') o.set('m_' + x.id, jsonMouv(x));
      else { const j = JSON.stringify(x); o.set(p + '_' + x.id, [j, hache(j)]); }
      if (++n % 4000 === 0) await new Promise(r => setTimeout(r)); // on rend la main à l'écran entre deux tranches
    }
  }
  _entSig = C.sig(); _ent = o;
  return o;
}
function dedoublonner(d) { // deux appareils hors ligne peuvent créer le même numéro : le plus ancien le garde, l'autre reçoit le suivant (même résultat sur tous les appareils)
  let modif = false;
  [['V', 'ventes'], ['A', 'achats'], ['R', 'reglements'], ['T', 'retours']].forEach(p => {
    const vus = new Set();
    d[p[1]].slice().sort((x, y) => x.date - y.date || (x.id < y.id ? -1 : 1)).forEach(x => {
      if (!vus.has(x.num)) { vus.add(x.num); return; }
      const ancien = x.num; x.numAvant = x.numAvant || ancien; x.num = C.numero(p[0]); vus.add(x.num); modif = true;
      d.mouvements.forEach(m => { if (m.ref === ancien && ((m.type === 'vente' || m.type === 'achat') && m.date === x.date || m.type === 'annulation' && x.annuleLe && Math.abs(m.date - x.annuleLe) < 6e4)) { m.ref = x.num; cacheMouv.delete(m.id); } });
    });
  });
  return modif;
}
function appliquer(docs) {
  let change = false; const d = C.db;
  if (!d.retours) d.retours = [];
  docs.forEach(x => {
    if (x.m > sy.last) sy.last = x.m;
    const h = x.j == null ? null : hache(x.j);
    if ((h === null && !(x.k in sy.h)) || sy.h[x.k] === h) return;
    if (h === null) delete sy.h[x.k]; else sy.h[x.k] = h;
    change = true;
    if (x.k === 'cfg') { if (h) { const c = JSON.parse(x.j); d.meta.shop = c.shop; d.meta.opt = c.opt; d.users = c.users; d.depots = c.depots; d.familles = c.familles; } return; }
    const L = d[LISTES[x.k[0]]], id = x.k.slice(2), i = L.findIndex(y => y.id === id);
    if (h === null) { if (i >= 0) L.splice(i, 1); } else if (i >= 0) L[i] = JSON.parse(x.j); else L.push(JSON.parse(x.j));
  });
  if (!change) return false;
  C.touche();
  ['ventes', 'achats', 'reglements', 'depenses', 'mouvements', 'retours'].forEach(l => d[l].sort((a, b) => a.date - b.date));
  const s = {}; d.mouvements.forEach(m => { const a = s[m.articleId] || (s[m.articleId] = {}); a[m.depotId] = (a[m.depotId] || 0) + m.qte; }); d.stock = s;
  [['V', 'ventes'], ['A', 'achats'], ['R', 'reglements'], ['T', 'retours']].forEach(p => d[p[1]].forEach(y => { const n = parseInt(String(y.num).split('-')[1], 10); if (n > (d.meta.seq[p[0]] || 0)) d.meta.seq[p[0]] = n; }));
  if (dedoublonner(d)) setTimeout(pousser, 50);
  if (S.user) { const u = C.user(S.user.id); if (!u || u.actif === false) S.user = null; else S.user = u; }
  return true;
}
const TXT = { ok: 'Synchronisé', envoi: 'Envoi en cours…', horsligne: 'Hors ligne, envoi au retour du réseau', erreur: 'Synchronisation en pause', attente: 'SAS STOCK' };
function etatSyncTexte() { return TXT[syncEtat]; }
function pastille() { const h = navigator.onLine === false || syncEtat === 'horsligne', k = syncEtat === 'erreur'; return '<span id="reseau" class="reseau' + (h ? ' off' : k ? ' ko' : '') + '">' + (h ? 'Hors ligne' : k ? 'En pause' : 'En ligne') + '</span>'; }
function majSync(e) { syncEtat = e; const el = $('#etatSync'); if (el) el.textContent = TXT[e]; const r = $('#reseau'); if (r) r.outerHTML = pastille(); }
async function pousser() {
  if (!compte || !etat.ok || !window.FB) return;
  if (enPousse) { encore = true; return; }
  enPousse = true;
  const lent = setTimeout(() => majSync('horsligne'), 5000);
  try {
    const ent = await entites(), lot = [];
    ent.forEach((v, k) => { if (sy.h[k] !== v[1]) lot.push({ k, j: v[0], h: v[1] }); });
    Object.keys(sy.h).forEach(k => { if (!ent.has(k)) lot.push({ k, j: null, h: null }); });
    if (lot.length) majSync('envoi');
    for (let i = 0; i < lot.length; i += 300) {
      const part = lot.slice(i, i + 300);
      await FB.ecrire(compte.uid, part, lic.appareil);
      part.forEach(x => { if (x.h === null) delete sy.h[x.k]; else sy.h[x.k] = x.h; });
      await Store.set(cle('sync'), sy);
    }
    clearTimeout(lent); majSync('ok');
  } catch (e) { clearTimeout(lent); console.warn('sync', e); majSync('erreur'); }
  enPousse = false;
  if (encore) { encore = false; pousser(); }
}
function sauver(tout) {
  C.touche(); // la base a changé : les index (soldes, rapports, alertes) sont à refaire
  clearTimeout(tSauve);
  const f = () => { if (compte) Store.set(cle('db'), C.db); };
  if (tout) f(); else tSauve = setTimeout(f, 120);
  clearTimeout(tPousse); tPousse = setTimeout(pousser, 700);
  if (tout) return Promise.resolve();
}
const JESSAI = 7; // durée de l'essai gratuit, en jours
function verifierLicence() {
  const now = Date.now();
  if (!compte) { etat = { ok: false, raison: etat.raison === 'chargement' ? 'chargement' : 'compte' }; return; }
  /* Plancher de temps : la date vue la plus avancée. lic.sol vient du serveur et résiste
     à l'effacement des données de l'application ; lic.vu n'est qu'un repère local. */
  const sol = Math.max(lic.vu || 0, lic.sol || 0);
  if (sol && now < sol - 2 * 864e5) { etat = { ok: false, raison: 'horloge' }; return; }
  if (now > (lic.vu || 0) + 36e5) { lic.vu = now; Store.set('lic', lic); }
  /* Sans licence vendue, la boutique vit sur son essai gratuit, daté par le serveur. */
  let fin = licFin, essai = false;
  if (fin == null && lic.essai) { fin = lic.essai + JESSAI * 864e5; essai = true; }
  if (fin == null) { etat = { ok: false, raison: 'attente' }; return; }
  const reste = Math.ceil((fin - now) / 864e5), aVie = fin > Date.UTC(2090, 0, 1), expDate = new Date(fin);
  if (reste <= 0) etat = { ok: false, raison: essai ? 'essaiFini' : 'expiree', expDate, essai };
  else if (!sy.init) etat = { ok: false, raison: 'premier', licOk: true };
  else etat = { ok: true, aVie, essai, reste: aVie ? Infinity : reste, expDate, type: 1 };
}
function demarrerSync() {
  if (arret || !compte || !window.FB || !(etat.ok || etat.licOk)) return;
  arret = FB.ecouterDocs(compte.uid, Math.max(0, sy.last - 3e5), docs => {
    const premier = !sy.init; sy.init = true;
    const change = appliquer(docs);
    if (change) Store.set(cle('db'), C.db);
    Store.set(cle('sync'), sy);
    if (premier) { verifierLicence(); rendre(); pousser(); }
    else if (change && (!S.user || ($('#modale').hidden && S.vue !== 'caisse' && S.vue !== 'achat'))) rendre();
  }, () => { arret = null; majSync('erreur'); });
  if (etat.ok) pousser();
}
async function ouvrirCompte(u) {
  if (arret) arret(); if (arretLic) arretLic(); arret = arretLic = null;
  compte = u; S.user = null; S.pinU = null; S.pin = ''; S.panier = panierVide(); S.ach = null; S.vue = 'accueil'; licFin = null; syncEtat = 'attente';
  if (!u) { C.db = C.vide(); sy = { h: {}, last: 0, init: false }; etat = { ok: false, raison: 'compte' }; rendre(); return; }
  Store.set('dernier', u);
  C.db = (await Store.get(cle('db'))) || C.vide();
  if (!C.db.retours) C.db.retours = []; // boutique créée avant les retours
  sy = (await Store.get(cle('sync'))) || { h: {}, last: 0, init: false };
  const l = await Store.get(cle('lic')); licFin = l ? l.fin : null;
  verifierLicence(); rendre();
  if (!window.FB) return;
  /* Une seule écriture à l'ouverture : elle met la fiche à jour et rend l'heure du
     serveur, qui fixe le plancher anti-recul et la date de début de l'essai. */
  if (FB.ouverture) FB.ouverture(u).then(h => {
    if (!h || !compte || compte.uid !== u.uid) return;
    const av = etat.ok + '|' + etat.raison;
    lic.sol = Math.max(lic.sol || 0, h.now); lic.essai = h.essai || null; Store.set('lic', lic);
    verifierLicence();
    if (av !== etat.ok + '|' + etat.raison) rendre();
    demarrerSync();
  }).catch(() => {});
  else FB.profil(u).catch(() => {});   // ancienne liaison Firebase : pas d'essai gratuit
  arretLic = FB.ecouterLicence(u.uid, fin => {
    licFin = fin; Store.set(cle('lic'), { fin });
    const av = etat.ok + '|' + etat.raison; verifierLicence();
    if (av !== etat.ok + '|' + etat.raison) rendre();
    demarrerSync();
  }, () => {});
  demarrerSync();
}
function texteLicence() {
  if (!etat.ok) return etat.raison === 'essaiFini' ? 'Essai gratuit terminé' : 'Aucune licence active';
  if (etat.essai) return 'Essai gratuit : il reste ' + etat.reste + ' jour' + (etat.reste > 1 ? 's' : '');
  return etat.aVie ? 'Licence à vie' : 'Licence valable jusqu’au ' + dj(etat.expDate.getTime()) + ' (' + etat.reste + ' jour' + (etat.reste > 1 ? 's' : '') + ')';
}
/* Demande de licence prête à envoyer : le vendeur reçoit l'adresse du compte, qui est
   la seule chose dont il a besoin pour activer la boutique depuis sa page Licences. */
function lienDemande(texte) {
  const nom = C.db && C.db.meta && C.db.meta.shop && C.db.meta.shop.nom ? C.db.meta.shop.nom : '';
  const m = 'Bonjour ' + REVENDEUR.nom + ', je souhaite activer ma licence SAS STOCK' + (nom ? ' pour ma boutique ' + nom : '') + '. Mon compte : ' + (compte ? compte.email : '') + '.';
  return '<a class="btn p large" style="margin-top:10px" target="_blank" rel="noopener" href="https://wa.me/' + REVENDEUR.tel2.replace(/\D/g, '') + '?text=' + encodeURIComponent(m) + '">' + texte + '</a>';
}
function vueActivation() {
  const r = etat.raison, mail = compte ? '<div class="code" style="font-size:1rem;letter-spacing:0;word-break:break-all">' + esc(compte.email) + '</div>' : '';
  const changer = '<button class="btn large" style="margin-top:10px" data-a="quitterCompte">Utiliser un autre compte Google</button>';
  if (r === 'chargement') return porte('<p class="ex">Ouverture de votre boutique…</p>');
  if (r === 'premier') return porte('<p class="ex">Chargement de vos données…</p><div class="carte"><p>La première ouverture sur cet appareil demande Internet. Vérifiez votre connexion : le chargement reprend tout seul.</p></div>' + changer, 1);
  if (r === 'horloge') return porte('<p class="ex">La date de cet appareil semble incorrecte. Réglez la date et l’heure, puis rouvrez l’application.</p>');
  if (r === 'attente') return porte('<p class="ex">Votre compte est créé. Il reste à activer votre licence.</p><div class="carte"><span class="petit doux gras">Votre adresse à envoyer à ' + esc(REVENDEUR.nom) + '</span>' + mail +
    '<button class="btn mini" data-a="copier" data-t="' + esc(compte.email) + '">Copier l’adresse</button><p class="petit doux" style="margin-top:10px">Dès que ' + esc(REVENDEUR.nom) + (REVENDEUR.tel ? ' (' + esc(REVENDEUR.tel) + ')' : '') + ' active votre licence, l’application s’ouvre toute seule sur cet écran.</p></div>' + changer, 1);
  if (r === 'essaiFini') return porte('<p class="ex">Votre essai gratuit de ' + JESSAI + ' jours s’est terminé le ' + dj(etat.expDate.getTime()) + '. <b>Tout ce que vous avez saisi est conservé</b> : vos articles, vos ventes et vos clients reviennent dès que votre licence est activée.</p>' +
    '<div class="carte"><span class="petit doux gras">Votre compte</span>' + mail + lienDemande('Demander ma licence sur WhatsApp') +
    '<p class="petit doux" style="margin-top:10px">Ou appelez ' + esc(REVENDEUR.nom) + ' au ' + esc(REVENDEUR.tel) + '. L’application se rouvrira toute seule dès l’activation.</p></div>' + changer, 1);
  if (r === 'expiree') return porte('<p class="ex">Votre licence a expiré le ' + dj(etat.expDate.getTime()) + '. Vos données sont conservées. Contactez ' + esc(REVENDEUR.nom) + ' pour la prolonger : l’application se rouvrira toute seule.</p><div class="carte"><span class="petit doux gras">Votre compte</span>' + mail + '</div>' + changer, 1);
  return porte('<p class="ex">Connectez-vous avec le compte Google de votre boutique. Vos données seront les mêmes sur votre téléphone et votre ordinateur.</p><div class="carte">' +
    (window.FB ? '<button class="btn p large" data-a="google">Continuer avec Google</button>' : '<p>Connexion Internet nécessaire pour la première ouverture. Vérifiez votre réseau puis rouvrez l’application.</p>') + '</div>', 1);
}
function modaleLicence() {
  ouvrir('Compte et licence', '<div class="carte"><p class="gras">' + esc(texteLicence()) + '</p><p class="petit doux" style="margin-top:10px">Compte Google de la boutique</p><p style="word-break:break-all">' + esc(compte.email) + '</p>' +
    '<p class="petit doux" style="margin-top:10px">État : ' + esc(TXT[syncEtat] === 'SAS STOCK' ? 'En attente' : TXT[syncEtat]) + '</p></div>' +
    '<div class="carte" style="margin-top:12px">' + (etat.essai ? '<p class="petit doux">Votre essai se termine le ' + dj(etat.expDate.getTime()) + '. Demandez votre licence dès maintenant : tout ce que vous avez saisi est conservé.</p>' + lienDemande('Demander ma licence sur WhatsApp') + '<p class="petit doux" style="margin-top:12px">Ou contactez ' + esc(REVENDEUR.nom) + ' :</p>' : '') + '<p class="petit doux">' + (etat.essai ? '' : 'Pour prolonger la licence ou obtenir de l’aide, contactez ' + esc(REVENDEUR.nom) + ' :') + '</p><p style="margin-top:6px"><a class="gras" style="color:inherit" href="tel:' + REVENDEUR.tel2 + '">' + esc(REVENDEUR.tel) + '</a></p><p style="word-break:break-all"><a style="color:inherit" href="mailto:' + REVENDEUR.mail + '">' + esc(REVENDEUR.mail) + '</a></p></div>' +
    '<button class="btn p large" style="margin-top:12px" data-a="synchro">Synchroniser maintenant</button><button class="btn large" style="margin-top:8px" data-a="quitterCompte">Utiliser un autre compte Google</button>');
}
A.licence = () => modaleLicence();
A.google = () => FB.connecter().catch(e => toast(/popup/.test(e && e.code || '') ? 'Fenêtre Google fermée ou bloquée. Réessayez.' : 'Connexion impossible. Vérifiez votre Internet.', true));
A.synchro = () => { fermer(); if (!arret) demarrerSync(); pousser(); toast('Synchronisation lancée'); };
A.quitterCompte = () => confirmer('Changer de compte Google', 'Cet appareil sera déconnecté de la boutique. Les données restent en ligne et reviennent à la prochaine connexion.', 'Se déconnecter', () => { if (window.FB) FB.deconnecter(); else ouvrirCompte(null); }, true);
addEventListener('online', () => { majSync(syncEtat); if (!arret) demarrerSync(); pousser(); });
addEventListener('offline', () => majSync(syncEtat));
async function demarrer() {
  if (window.__DEMO && window.demoDemarrer) return window.demoDemarrer(); // demo.html : boutique d'exemple, rien n'est enregistré
  await Store.open();
  lic = (await Store.get('lic')) || {};
  if (!lic.appareil) { lic.appareil = LIC.newDeviceCode(); await Store.set('lic', lic); }
  C.db = C.vide(); etat = { ok: false, raison: 'chargement' }; rendre();
  const l = $('#lance'); if (l) setTimeout(() => { l.style.opacity = 0; setTimeout(() => l.remove(), 380); }, 750);
  let recu = false;
  const brancher = () => FB.onUser(u => { recu = true; if (!u) etat = { ok: false, raison: 'compte' }; ouvrirCompte(u); });
  if (window.FB) brancher(); else {
    addEventListener('fb-pret', brancher, { once: true });
    setTimeout(async () => { if (!recu) { etat = { ok: false, raison: 'compte' }; ouvrirCompte((await Store.get('dernier')) || null); } }, 7000);
  }
  setInterval(() => { const av = etat.ok; verifierLicence(); if (av !== etat.ok) rendre(); }, 6e5);
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
demarrer();
