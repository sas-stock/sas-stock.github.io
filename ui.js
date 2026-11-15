/* SAS STOCK — interface (1/2) : base, entrée, caisse, stock */
'use strict';
const PUB = '2116e0b208d4db7cfce3401dc53b81191723cdcb91f21d4fd3973a175b655a2e2ac8d562e0c01024b5a374ecc614a3cb4bffdd064dce394bf091721d60fa62f0', VERSION = '2.4.0', UNITES = ['pièce', 'paire', 'jeu', 'carton', 'paquet', 'sac', 'litre', 'bidon', 'kg', 'mètre'], REVENDEUR = { nom: 'SAS TECH', tel: '07 48 67 13 34', tel2: '+2250748671334', mail: 'sanogo2souleymane@gmail.com' };
const MAITRE = 'b61a3f9ceba6d66975dac91b63733da83c8f90570d41c820e15b791c21f6ae49';
const C = CORE;
let lic = {}, etat = { ok: false, raison: 'aucune' };
const S = { user: null, vue: 'accueil', per: { k: 'jour' }, panier: panierVide(), ach: null, f: {}, pinU: null, pin: '' };
function panierVide() { return { lignes: [], clientId: '', recu: null }; }

/* ---------- outils ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : NaN; };
const F = x => { x = Math.round((x || 0) * 100) / 100; const neg = x < 0, p = String(Math.abs(x)).split('.'); return (neg ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? ',' + p[1] : ''); };
const M = x => F(Math.round(x || 0)) + ' F';
const z2 = x => String(x).padStart(2, '0');
const dj = ms => { const d = new Date(ms); return z2(d.getDate()) + '/' + z2(d.getMonth() + 1) + '/' + d.getFullYear(); };
const dh = ms => { const d = new Date(ms); return z2(d.getDate()) + '/' + z2(d.getMonth() + 1) + ' à ' + z2(d.getHours()) + 'h' + z2(d.getMinutes()); };
const iso = ms => { const d = new Date(ms); return d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate()); };
const admin = () => !!S.user && S.user.role === 'gerant';
const sansAccent = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const P = {
  maison: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', caisse: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H7"/>',
  boite: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', journal: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  gens: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"/>', graph: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  reglage: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>', ajout: '<path d="M12 5v14M5 12h14"/>', imprime: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><path d="M8 14h8v7H8z"/>',
  envoi: '<path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4"/>', cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', sortie: '<path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/>'
};
const ic = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[k] + '</svg>';
const LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#0E7A53"/><rect x="14" y="38" width="36" height="12" rx="3" fill="#fff"/><rect x="14" y="24" width="24" height="12" rx="3" fill="#F2A413"/><rect x="26" y="10" width="24" height="12" rx="3" fill="#fff"/></svg>';

/* ---------- stockage local ---------- */
const Store = {
  idb: null, mem: {},
  async open() {
    try {
      this.idb = await new Promise((ok, ko) => {
        const r = indexedDB.open('sasstock', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('bloqué'));
      });
    } catch (e) { this.idb = null; }
  },
  async get(k) {
    if (this.idb) try {
      const v = await new Promise((ok, ko) => { const q = this.idb.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); });
      if (v !== undefined) return v;
    } catch (e) {}
    try { const t = localStorage.getItem('sas_' + k); if (t) return JSON.parse(t); } catch (e) {}
    return this.mem[k];
  },
  async set(k, v) {
    this.mem[k] = v;
    if (this.idb) try {
      await new Promise((ok, ko) => { const tx = this.idb.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = ok; tx.onerror = () => ko(tx.error); });
      return;
    } catch (e) {}
    try { localStorage.setItem('sas_' + k, JSON.stringify(v)); } catch (e) {}
  }
};
let tSauve = null;
function sauver(tout) { clearTimeout(tSauve); if (tout) return Store.set('db', C.db); tSauve = setTimeout(() => Store.set('db', C.db), 120); }

/* ---------- licence ---------- */
function verifierLicence() {
  if (lic.maitre === MAITRE) { etat = { ok: true, aVie: true, reste: Infinity, type: 1, maitre: true }; return; }
  const now = Date.now();
  if (lic.vu && now < lic.vu - 2 * 864e5) { etat = { ok: false, raison: 'horloge' }; return; }
  etat = lic.cle ? LIC.check(lic.cle, PUB, lic.appareil, now) : { ok: false, raison: 'aucune' };
  if (now > (lic.vu || 0) + 36e5) { lic.vu = now; Store.set('lic', lic); }
}
function texteLicence() {
  if (!etat.ok) return 'Aucune licence active';
  if (etat.aVie) return 'Licence à vie';
  return (etat.type === 0 ? 'Licence d’essai' : 'Licence') + ' valable jusqu’au ' + dj(etat.expDate.getTime()) + ' (' + etat.reste + ' jour' + (etat.reste > 1 ? 's' : '') + ')';
}
function activer(cle) {
  if (LIC.hashTxt('sas-maitre:' + String(cle).replace(/\s+/g, '').toUpperCase()) === MAITRE) { lic.maitre = MAITRE; Store.set('lic', lic); verifierLicence(); return; }
  const r = LIC.check(cle, PUB, lic.appareil);
  if (!r.ok) {
    throw new Error({ format: 'Clé non reconnue. Vérifiez que vous l’avez copiée en entier.', signature: 'Clé non valide.',
      appareil: 'Cette clé a été créée pour un autre appareil. Envoyez le code ci-dessus à votre revendeur.',
      expiree: 'Cette clé est déjà expirée. Demandez une nouvelle clé.' }[r.raison] || 'Clé refusée.');
  }
  if (etat.ok && !etat.aVie && !r.aVie && r.expJour < etat.expJour) throw new Error('Cette clé se termine avant votre licence actuelle.');
  if (etat.ok && etat.aVie) throw new Error('Votre licence est déjà à vie.');
  const anc = lic.cle ? LIC.readKey(lic.cle, PUB) : null;
  if (!anc || !anc.ok || r.emisJour > anc.emisJour) lic.vu = Date.now(); // une clé nouvellement émise débloque un appareil dont la date avait été faussée
  lic.cle = String(cle).replace(/\s+/g, ''); Store.set('lic', lic); verifierLicence();
}

/* ---------- fenêtres et messages ---------- */
let tToast = null;
function toast(m, ko) { const t = $('#toast'); t.textContent = m; t.className = ko ? 'err' : ''; t.hidden = false; clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, ko ? 4200 : 2400); }
function ouvrir(titre, html) {
  const m = $('#modale');
  m.innerHTML = '<div class="boite" role="dialog" aria-modal="true"><header><h2>' + esc(titre) + '</h2><button class="ferme nonimp" data-a="fermer" aria-label="Fermer">×</button></header>' + html + '</div>';
  m.hidden = false;
}
function fermer() { const m = $('#modale'); m.hidden = true; m.innerHTML = ''; formCb = null; confCb = null; }
let formCb = null, confCb = null;
function champ(c) {
  if (c.t === 'select') return '<label class="ch"><span>' + esc(c.l) + '</span><select name="' + c.n + '">' + c.opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(c.v == null ? '' : c.v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>';
  if (c.t === 'coche') return '<label class="coche"><input type="checkbox" name="' + c.n + '"' + (c.v ? ' checked' : '') + '><span>' + esc(c.l) + '</span></label>';
  if (c.t === 'texte') return '<p class="doux petit" style="margin-bottom:12px">' + esc(c.l) + '</p>';
  const nb = c.t === 'nombre', pin = c.t === 'pin';
  return '<label class="ch"><span>' + esc(c.l) + '</span><input name="' + c.n + '" type="' + (pin ? 'password' : c.t === 'tel' ? 'tel' : 'text') + '"' + (nb ? ' inputmode="decimal"' : pin ? ' inputmode="numeric" maxlength="6"' : '') +
    ' value="' + esc(c.v == null ? '' : c.v) + '"' + (c.req ? ' required' : '') + (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + ' autocomplete="off"></label>';
}
function formulaire(titre, champs, cb, o) {
  o = o || {};
  ouvrir(titre, '<form data-form="gen">' + champs.map(champ).join('') + '<button class="btn p large">' + esc(o.ok || 'Enregistrer') + '</button></form>' + (o.apres || ''));
  formCb = cb;
  const i = $('#modale input:not([type=checkbox]),#modale select'); if (i && !o.sansFocus) try { i.focus(); } catch (e) {}
}
function confirmer(titre, texte, ok, cb, danger) {
  ouvrir(titre, '<p style="margin-bottom:16px">' + esc(texte) + '</p><div class="rangee"><button class="btn f" data-a="fermer">Retour</button><button class="btn f ' + (danger ? 'd' : 'p') + '" data-a="okConf">' + esc(ok) + '</button></div>');
  confCb = cb;
}
function agir(fn) { // exécute une action métier et affiche l'erreur éventuelle
  try { const r = fn(); sauver(); return r === undefined ? true : r; }
  catch (e) { if (!e.metier) console.error(e); toast(e.metier || e.message ? e.message : 'Erreur inattendue.', true); return false; }
}

/* ---------- périodes ---------- */
function bornes(p) {
  p = p || S.per;
  const n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), J = 864e5;
  const pd = s => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null; };
  if (p.k === '7j') return [d0 - 6 * J, d0 + J - 1];
  if (p.k === 'mois') return [new Date(n.getFullYear(), n.getMonth(), 1).getTime(), d0 + J - 1];
  if (p.k === 'tout') return [0, Infinity];
  if (p.k === 'perso') { const a = pd(p.de), b = pd(p.a); return [a == null ? 0 : a, b == null ? Infinity : b + J - 1]; }
  return [d0, d0 + J - 1];
}
function barrePer() {
  const L = [['jour', 'Aujourd’hui'], ['7j', '7 jours'], ['mois', 'Ce mois'], ['tout', 'Tout'], ['perso', 'Dates…']];
  return '<div class="puces">' + L.map(x => '<button class="puce' + (S.per.k === x[0] ? ' on' : '') + '" data-a="per" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    (S.per.k === 'perso' ? '<div class="rangee" style="margin-bottom:10px"><label class="f"><span class="petit doux">Du</span><input type="date" data-ch="perDe" value="' + esc(S.per.de || '') + '"></label><label class="f"><span class="petit doux">Au</span><input type="date" data-ch="perA" value="' + esc(S.per.a || '') + '"></label></div>' : '');
}
function puces(cle, L) { return '<div class="puces">' + L.map(x => '<button class="puce' + (S.f[cle] === x[0] ? ' on' : '') + '" data-a="onglet" data-c="' + cle + '" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>'; }
function vide(t, s) { return '<div class="videz"><b>' + esc(t) + '</b>' + esc(s || '') + '</div>'; }

/* ---------- écrans d'entrée ---------- */
function porte(html, contact) { return '<div class="porte"><div class="in"><div class="marque">' + LOGO + '<div><b>SAS STOCK</b><span>Stocks et caisses, par ' + esc(REVENDEUR.nom) + '</span></div></div>' + html + (contact ? blocContact() : '') + '</div></div>'; }
function blocContact() { return '<div class="contact"><span>Licence, aide ou renouvellement : ' + esc(REVENDEUR.nom) + '</span><a href="tel:' + REVENDEUR.tel2 + '">' + esc(REVENDEUR.tel) + '</a><a href="mailto:' + REVENDEUR.mail + '">' + esc(REVENDEUR.mail) + '</a></div>'; }
function vueActivation() {
  const msg = { aucune: 'Pour utiliser l’application, activez-la avec la clé de licence fournie par votre revendeur.',
    expiree: 'Votre licence a expiré' + (etat.expDate ? ' le ' + dj(etat.expDate.getTime()) : '') + '. Vos données sont intactes : entrez une nouvelle clé pour continuer.',
    horloge: 'La date de cet appareil semble incorrecte. Réglez la date et l’heure, puis rouvrez l’application.' }[etat.raison] || 'La licence enregistrée n’est plus reconnue. Entrez une clé valide.';
  return porte('<p class="ex">' + msg + '</p><div class="carte"><span class="petit doux gras">Code de cet appareil</span><div class="code" id="codeApp">' + esc(lic.appareil) + '</div>' +
    '<button class="btn mini" data-a="copier" data-t="' + esc(lic.appareil) + '">Copier le code</button>' +
    '<p class="petit doux" style="margin:10px 0 14px">Envoyez ce code à ' + esc(REVENDEUR.nom) + (REVENDEUR.tel ? ' (' + esc(REVENDEUR.tel) + ')' : '') + ' pour recevoir votre clé.</p>' +
    '<form data-form="activer"><label class="ch"><span>Clé de licence</span><textarea name="cle" rows="3" placeholder="SAS1-…" required autocomplete="off" autocapitalize="off" spellcheck="false"></textarea></label><button class="btn p large">Activer la licence</button></form></div>' +
    (etat.raison === 'expiree' && C.db.users.length ? '<button class="btn large" style="margin-top:12px" data-a="exporter">Enregistrer une copie de mes données</button>' : ''));
}
function vuePremiere() {
  return porte('<p class="ex">Licence activée. Créez maintenant votre boutique et le compte du gérant.</p><div class="carte"><form data-form="premiere">' +
    [{ n: 'boutique', l: 'Nom de la boutique', req: 1 }, { n: 'tel', l: 'Téléphone de la boutique', t: 'tel' }, { n: 'adresse', l: 'Adresse (quartier, ville)' }, { n: 'rccm', l: 'N° RCCM (facultatif)' }, { n: 'nom', l: 'Nom du gérant', req: 1 },
     { n: 'pin', l: 'Code secret du gérant (4 à 6 chiffres)', t: 'pin', req: 1 }, { n: 'pin2', l: 'Répétez le code secret', t: 'pin', req: 1 }].map(champ).join('') +
    '<button class="btn p large">Créer ma boutique</button></form></div>');
}
function vueConnexion() {
  const us = C.db.users.filter(u => u.actif !== false);
  if (us.length === 1 && !S.pinU) S.pinU = us[0].id;
  const u = S.pinU && C.user(S.pinU);
  if (!u) return porte('<p class="ex">Qui utilise la caisse ?</p><div class="liste">' + us.map(x => '<button class="ligne" data-a="choisirU" data-id="' + x.id + '"><div class="f"><b>' + esc(x.nom) + '</b><span>' + (x.role === 'gerant' ? 'Gérant' : 'Caisse') + '</span></div></button>').join('') + '</div>');
  let pts = ''; for (let i = 0; i < u.pinLen; i++) pts += '<i class="' + (i < S.pin.length ? 'on' : '') + '"></i>';
  return porte('<div class="carte"><h2 class="centre">' + esc(u.nom) + '</h2><p class="centre doux petit">Entrez votre code secret</p><div class="pin">' + pts + '</div><div class="clavier">' +
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => '<button data-a="touche" data-d="' + d + '">' + d + '</button>').join('') +
    '<button data-a="retourU" style="font-size:.85rem"' + (us.length < 2 ? ' disabled' : '') + '>Autre</button><button data-a="touche" data-d="0">0</button><button data-a="efface" aria-label="Effacer">←</button></div></div>');
}
const hachPin = (id, pin) => LIC.hashTxt('sas:' + id + ':' + pin);

/* ---------- coque ---------- */
function coque(contenu) {
  const it = [['accueil', 'Accueil', 'maison'], ['caisse', 'Caisse', 'caisse'], ['stock', 'Stock', 'boite'], ['journal', 'Journaux', 'journal'],
    ['tiers', 'Clients', 'gens', 'sec'], ['rapports', 'Rapports', 'graph', 'sec'], ['reglages', 'Réglages', 'reglage', 'sec'], ['plus', 'Plus', 'plus', 'plus']]
    .filter(x => admin() || x[0] !== 'reglages');
  const v = S.vue === 'achat' ? 'journal' : S.vue, dansPlus = ['tiers', 'rapports', 'reglages', 'plus'].indexOf(v) >= 0;
  return '<header class="tete">' + LOGO + '<div class="nomb"><b>' + esc(C.db.meta.shop.nom || 'SAS STOCK') + '</b><span id="etatSync">' + etatSyncTexte() + '</span></div>' + pastille() + '<button class="moi" data-a="deconnexion">' + esc(S.user.nom) + '</button></header>' +
    (!etat.aVie && etat.reste <= 7 ? '<div class="bandeau"><span>Votre licence se termine dans <b>' + etat.reste + ' jour' + (etat.reste > 1 ? 's' : '') + '</b>.</span><button data-a="licence">Prolonger</button></div>' : '') +
    '<main>' + contenu + '</main><nav class="nav">' + it.map(x => '<button class="' + (x[3] || '') + (v === x[0] || (x[0] === 'plus' && dansPlus) ? ' on' : '') + '" data-a="aller" data-v="' + x[0] + '"><i>' + ic(x[2]) + '</i>' + x[1] + '</button>').join('') + '</nav>';
}
const V = {}, apres = {};

/* ---------- accueil ---------- */
V.accueil = function () {
  const b = bornes({ k: 'jour' }), R = C.rapport(b[0], b[1], admin() ? null : S.user.id);
  const cr = C.impayes('client').reduce((s, x) => s + x.du, 0), al = C.alertes();
  const dern = C.db.ventes.filter(v => admin() || v.userId === S.user.id).slice(-5).reverse();
  return '<div class="titre"><div><p class="doux petit">' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p><h1>Bonjour ' + esc(S.user.nom) + '</h1></div></div>' +
    '<div class="grille"><div class="chiffre fort"><span>' + (admin() ? 'Ventes d’aujourd’hui' : 'Mes ventes d’aujourd’hui') + '</span><b class="n">' + M(R.ca) + '</b><span>' + R.nbVentes + ' vente' + (R.nbVentes > 1 ? 's' : '') + '</span></div>' +
    '<div class="chiffre"><span>Encaissé aujourd’hui</span><b class="n">' + M(R.entrees) + '</b></div>' +
    (admin() ? '<div class="chiffre"><span>Bénéfice du jour</span><b class="n ' + (R.benefice < 0 ? 'rouge' : 'vert') + '">' + M(R.benefice) + '</b></div>' : '<div class="chiffre"><span>Dépenses du jour</span><b class="n">' + M(R.depenses) + '</b></div>') +
    '<div class="chiffre"><span>Crédits clients à encaisser</span><b class="n">' + M(cr) + '</b></div>' +
    (admin() ? '<div class="chiffre"><span>Dettes fournisseurs</span><b class="n">' + M(C.impayes('fournisseur').reduce((s, x) => s + x.du, 0)) + '</b></div>' : '') + '</div>' +
    '<button class="btn p large" style="margin-top:14px" data-a="aller" data-v="caisse">' + ic('caisse') + 'Nouvelle vente</button>' +
    '<div class="deux"><div class="bloc"><h2>Stock à surveiller</h2>' + (al.length ? '<div class="liste">' + al.slice(0, 6).map(a => ligneArticle(a, '')).join('') +
      (al.length > 6 ? '<button class="ligne" data-a="voirAlertes"><div class="f"><b>Voir les ' + al.length + ' articles</b></div></button>' : '') + '</div>'
      : '<div class="carte">' + (C.db.articles.length ? vide('Aucune alerte', 'Tous vos articles sont au-dessus de leur seuil.') : vide('Aucun article pour l’instant', 'Ajoutez vos articles dans Stock pour commencer à vendre.')) + '</div>') + '</div>' +
    '<div class="bloc"><h2>Dernières ventes</h2>' + (dern.length ? '<div class="liste">' + dern.map(ligneVente).join('') + '</div>' : '<div class="carte">' + vide('Aucune vente', 'Vos ventes apparaîtront ici.') + '</div>') + '</div></div>';
};
function etiqStock(a, q) { return q <= 0 ? '<span class="etiq ko">Rupture</span>' : q <= (a.seuil || 0) ? '<span class="etiq al">Stock bas</span>' : ''; }
function ligneArticle(a, did) {
  const q = did ? C.qte(a.id, did) : C.qteTot(a.id), f = C.famille(a.familleId);
  return '<button class="ligne" data-a="ficheArticle" data-id="' + a.id + '"><div class="f"><b>' + esc(a.nom) + '</b><span>' + esc((a.code ? a.code + ', ' : '') + (f ? f.nom : 'Sans famille')) + '</span></div>' +
    '<div class="d"><b class="n">' + F(q) + ' ' + etiqStock(a, q) + '</b><span class="n">' + M(a.pv) + '</span></div></button>';
}
function ligneVente(v) {
  const c = v.clientId && C.tiers(v.clientId), du = v.total - v.paye;
  return '<button class="ligne" data-a="detailVente" data-id="' + v.id + '"><div class="f"><b>' + esc(c ? c.nom : 'Client de passage') + '</b><span>' + v.num + ', ' + dh(v.date) + ', ' + esc((C.user(v.userId) || {}).nom || '') + '</span></div>' +
    '<div class="d"><b class="n">' + M(v.total) + '</b><span>' + (v.annule ? '<span class="etiq ko">Annulée</span>' : du > 0 ? '<span class="etiq al">Crédit ' + M(du) + '</span>' : '<span class="etiq">Payée</span>') + '</span></div></button>';
}

/* ---------- caisse ---------- */
const depotVente = () => C.db.depots[0];
function chercheArticles(q, limite) {
  q = sansAccent(q).trim(); if (!q) return [];
  const mots = q.split(/\s+/);
  return C.db.articles.filter(a => a.actif !== false && mots.every(m => sansAccent(a.nom + ' ' + (a.code || '')).indexOf(m) >= 0)).slice(0, limite || 8);
}
function totalPanier(p) { return p.lignes.reduce((s, l) => s + (l.qte > 0 && l.pu >= 0 ? l.qte * l.pu : 0), 0); }
V.caisse = function () {
  const p = S.panier, dv = depotVente(), libre = admin() || C.db.meta.opt.prixLibre, tot = totalPanier(p);
  const clients = C.db.tiers.filter(t => t.type === 'client').sort((a, b) => a.nom.localeCompare(b.nom));
  return '<div class="titre"><h1>Caisse</h1>' + (p.lignes.length ? '<button class="btn mini d" data-a="pVider">Vider le panier</button>' : '') + '</div><div class="caisse2"><div>' +
    (p.lignes.length ? '<div class="liste panier" style="margin-bottom:10px">' + p.lignes.map((l, i) => { const a = l.libre ? { nom: l.nom } : C.article(l.articleId);
      return '<div class="pl" data-i="' + i + '"><div class="nm"><span>' + esc(a.nom) + '</span><span class="n" data-lt>' + M(l.qte * l.pu) + '</span></div><span class="st">' + (l.libre ? 'Hors stock' : 'En stock : ' + F(C.qte(a.id, dv.id))) + '</span>' +
        '<input inputmode="decimal" data-in="pq" value="' + (isNaN(l.qte) ? '' : l.qte) + '" aria-label="Quantité de ' + esc(a.nom) + '">' +
        '<input inputmode="numeric" data-in="pp" value="' + (isNaN(l.pu) ? '' : l.pu) + '" aria-label="Prix unitaire"' + (l.libre ? ' placeholder="Prix"' : '') + (libre || l.libre ? '' : ' readonly') + '><button class="x" data-a="pRetire" aria-label="Retirer ' + esc(a.nom) + '">×</button></div>'; }).join('') + '</div>' : '') +
    '<div class="cherche">' + ic('loupe') + '<input id="rech" data-in="rech" placeholder="Tapez le nom ou le code d’un article" autocomplete="off" enterkeyhint="search"></div><div id="res" style="margin-top:8px"></div>' +
    (!C.db.articles.length ? '<div class="carte" style="margin-top:10px">' + vide('Aucun article enregistré', admin() ? 'Créez vos articles dans Stock, puis revenez vendre.' : 'Demandez au gérant d’ajouter les articles.') + '</div>' : '') +
    '</div><div class="encaisse" style="margin-top:14px"' + (p.lignes.length ? '' : ' hidden') + '><div class="tt"><span>Total à payer</span><b class="n" id="ctot">' + M(tot) + '</b></div>' +
    '<label class="ch" style="margin-top:10px"><span>Client</span><div class="rangee"><select class="f" data-ch="pClient"><option value="">Client de passage</option>' + clients.map(c => '<option value="' + c.id + '"' + (p.clientId === c.id ? ' selected' : '') + '>' + esc(c.nom) + '</option>').join('') + '</select>' +
    '<button type="button" class="btn mini" data-a="nouveauTiers" data-type="client" data-pour="panier">Nouveau</button></div></label>' +
    '<label class="ch"><span>Montant reçu</span><input inputmode="numeric" data-in="precu" id="precu" value="' + (p.recu == null ? '' : p.recu) + '" placeholder="' + F(tot) + ' (tout est payé)"></label>' +
    '<p class="info" id="cinfo"></p><button class="btn m large" data-a="pValider" id="cval">Valider la vente</button></div></div>';
};
function majCaisse() {
  const p = S.panier, tot = totalPanier(p);
  document.querySelectorAll('.panier .pl').forEach(el => { const l = p.lignes[+el.dataset.i]; $('[data-lt]', el).textContent = M(l.qte > 0 && l.pu >= 0 ? l.qte * l.pu : 0); });
  const t = $('#ctot'); if (!t) return;
  t.textContent = M(tot); $('#precu').placeholder = F(tot) + ' (tout est payé)';
  const i = $('#cinfo'), r = p.recu;
  if (r != null && r < tot) { i.className = 'info cr'; i.textContent = 'Reste à payer (crédit) : ' + M(tot - r); }
  else if (r != null && r > tot) { i.className = 'info mo'; i.textContent = 'Monnaie à rendre : ' + M(r - tot); }
  else { i.className = 'info'; i.textContent = ''; }
}
apres.caisse = function () { majCaisse(); if (S.focusRech) { S.focusRech = false; const r = $('#rech'); if (r) try { r.focus(); } catch (e) {} } };
function majRes() {
  const q = $('#rech').value, L = chercheArticles(q), dv = depotVente(), box = $('#res');
  if (!q.trim()) { box.innerHTML = ''; return; }
  const horsStock = '<button class="ligne" data-a="pLibre"><div class="f"><b>Ajouter « ' + esc(q.trim()) + ' » (hors stock)</b><span>Article qui n’est pas dans votre stock : vous saisissez la quantité et le prix</span></div><div class="d"><b class="n">+</b></div></button>';
  box.innerHTML = '<div class="liste">' + L.map(a => { const s = C.qte(a.id, dv.id);
    return '<button class="ligne" data-a="pAjoute" data-id="' + a.id + '"><div class="f"><b>' + esc(a.nom) + '</b><span>' + esc(a.code || '') + ' En stock : ' + F(s) + ' ' + etiqStock(a, s) + '</span></div><div class="d"><b class="n">' + M(a.pv) + '</b></div></button>'; }).join('') + horsStock + '</div>';
}
function texteTicket(v) {
  const sh = C.db.meta.shop, c = v.clientId && C.tiers(v.clientId);
  return [sh.nom, lignesBoutique().join('\n'), 'Reçu ' + v.num + ' du ' + dh(v.date), c ? 'Client : ' + c.nom : ''].filter(Boolean).join('\n') + '\n\n' +
    v.lignes.map(l => l.nom + '\n  ' + F(l.qte) + ' x ' + F(l.pu) + ' = ' + M(l.qte * l.pu)).join('\n') + '\n\nTotal : ' + M(v.total) + '\nPayé : ' + M(v.paye) +
    (v.total > v.paye ? '\nReste à payer : ' + M(v.total - v.paye) : '') + '\n\n' + (sh.pied || '');
}
function lignesBoutique() { const sh = C.db.meta.shop, L = []; if (sh.activite) L.push(sh.activite); const ad = [sh.adresse, sh.ville].filter(Boolean).join(', '); if (ad) L.push(ad); const t = [sh.tel, sh.tel2].filter(Boolean).join(' / '); if (t) L.push('Tél. ' + t); if (sh.email) L.push(sh.email); if (sh.rccm) L.push('RCCM : ' + sh.rccm); if (sh.ncc) L.push('NCC : ' + sh.ncc); return L; }
function enTeteTicket() { return '<h3>' + esc(C.db.meta.shop.nom) + '</h3>' + lignesBoutique().map(x => '<p class="ce">' + esc(x) + '</p>').join(''); }
function enTeteTicketV1() { const sh = C.db.meta.shop; return '<h3>' + esc(sh.nom) + '</h3>' + (sh.adresse ? '<p class="ce">' + esc(sh.adresse) + '</p>' : '') + (sh.tel ? '<p class="ce">Tél. ' + esc(sh.tel) + '</p>' : ''); }
function boutonsTicket(texte) {
  return '<div class="rangee nonimp" style="margin-top:16px"><button class="btn f" data-a="imprimer">' + ic('imprime') + 'Imprimer</button>' +
    '<a class="btn f" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texte) + '">' + ic('envoi') + 'WhatsApp</a></div>';
}
function ticketVente(id, nouveau) {
  const v = C.par(C.db.ventes, id), c = v.clientId && C.tiers(v.clientId), du = v.total - v.paye;
  ouvrir(nouveau ? 'Vente enregistrée' : 'Vente ' + v.num, '<div class="ticket">' + enTeteTicket() + '<hr><div class="tl"><span>Reçu ' + v.num + '</span><span>' + dh(v.date) + '</span></div>' +
    '<div class="tl q"><span>' + esc(c ? 'Client : ' + c.nom : 'Client de passage') + '</span><span>' + esc((C.user(v.userId) || {}).nom || '') + '</span></div><hr>' +
    v.lignes.map(l => '<div>' + esc(l.nom) + '</div><div class="tl q"><span class="n">' + F(l.qte) + ' × ' + F(l.pu) + '</span><span class="n">' + M(l.qte * l.pu) + '</span></div>').join('') +
    '<hr><div class="tl g"><span>Total</span><span class="n">' + M(v.total) + '</span></div><div class="tl"><span>Payé</span><span class="n">' + M(v.paye) + '</span></div>' +
    (v.monnaie > 0 ? '<div class="tl q"><span>Reçu ' + M(v.recu) + ', monnaie rendue</span><span class="n">' + M(v.monnaie) + '</span></div>' : '') +
    (du > 0 ? '<div class="tl gras"><span>Reste à payer</span><span class="n">' + M(du) + '</span></div>' : '') +
    (v.annule ? '<hr><p class="ce gras">VENTE ANNULÉE</p>' : '') + '<hr><p class="ce">' + esc(C.db.meta.shop.pied || '') + '</p></div>' + boutonsTicket(texteTicket(v)) +
    (nouveau ? '<button class="btn p large nonimp" style="margin-top:8px" data-a="fermer">Vente suivante</button>'
      : admin() && !v.annule ? '<button class="btn d large nonimp" style="margin-top:8px" data-a="annulerVente" data-id="' + v.id + '">Annuler cette vente</button>' : ''));
}

/* ---------- stock ---------- */
V.stock = function () {
  const f = S.f; f.stab = f.stab || 'articles';
  let h = '<div class="titre"><h1>Stock</h1><div class="rangee">' + (admin() ? '<button class="btn mini p" data-a="formArticle">' + ic('ajout') + 'Article</button>' : '') + '</div></div>' +
    puces('stab', [['articles', 'Articles'], ['alertes', 'À surveiller'], ['mouvements', 'Mouvements']]);
  if (f.stab === 'mouvements') return h + barrePer() + listeMouvements(null);
  h += '<div class="cherche">' + ic('loupe') + '<input data-in="sq" value="' + esc(f.sq || '') + '" placeholder="Chercher un article" autocomplete="off"></div>' +
    '<div class="rangee" style="margin:8px 0 10px"><select class="f" data-ch="sfam"><option value="">Toutes familles</option>' + C.db.familles.map(x => '<option value="' + x.id + '"' + (f.sfam === x.id ? ' selected' : '') + '>' + esc(x.nom) + '</option>').join('') + '</select>' +
    '<select class="f" data-ch="sdep"><option value="">Tous dépôts</option>' + C.db.depots.map(x => '<option value="' + x.id + '"' + (f.sdep === x.id ? ' selected' : '') + '>' + esc(x.nom) + '</option>').join('') + '</select></div><div id="sl">' + listeStock() + '</div>';
  return h;
};
function listeStock() {
  const f = S.f, mots = sansAccent(f.sq).trim().split(/\s+/).filter(Boolean);
  let L = C.db.articles.filter(a => a.actif !== false && (!f.sfam || a.familleId === f.sfam) && mots.every(m => sansAccent(a.nom + ' ' + (a.code || '')).indexOf(m) >= 0));
  if (f.stab === 'alertes') L = L.filter(a => C.qteTot(a.id) <= (a.seuil || 0));
  L.sort((a, b) => a.nom.localeCompare(b.nom));
  if (!L.length) return '<div class="carte">' + (C.db.articles.length ? vide('Aucun article ne correspond', 'Modifiez la recherche ou les filtres.') : vide('Votre stock est vide', admin() ? 'Touchez « Article » pour créer le premier.' : 'Le gérant doit d’abord créer les articles.')) + '</div>';
  const val = C.valeurStock(f.sdep || null);
  return (admin() && f.stab !== 'alertes' ? '<div class="grille" style="margin-bottom:10px"><div class="chiffre"><span>Valeur au prix d’achat</span><b class="n">' + M(val.achat) + '</b></div><div class="chiffre"><span>Valeur au prix de vente</span><b class="n">' + M(val.vente) + '</b></div></div>' : '') +
    '<p class="petit doux" style="margin:0 2px 6px">' + L.length + ' article' + (L.length > 1 ? 's' : '') + '</p><div class="liste">' + L.slice(0, 300).map(a => ligneArticle(a, f.sdep)).join('') + '</div>' +
    (L.length > 300 ? '<p class="petit doux centre" style="margin-top:8px">Affinez la recherche pour voir les autres articles.</p>' : '');
}
const TYPES = { vente: 'Vente', achat: 'Achat', transfert: 'Transfert', ajustement: 'Ajustement', annulation: 'Annulation' };
function listeMouvements(aid) {
  const b = aid ? [0, Infinity] : bornes();
  const L = C.db.mouvements.filter(m => (!aid || m.articleId === aid) && m.date >= b[0] && m.date <= b[1]).slice(-250).reverse();
  if (!L.length) return '<div class="carte">' + vide('Aucun mouvement', 'Les entrées et sorties de stock apparaîtront ici.') + '</div>';
  return '<div class="liste">' + L.map(m => { const a = C.article(m.articleId), d = C.depot(m.depotId);
    return '<div class="ligne"><div class="f"><b>' + esc(aid ? TYPES[m.type] + (m.ref ? ' ' + m.ref : '') : a ? a.nom : '—') + '</b><span>' + esc((aid ? '' : TYPES[m.type] + (m.ref ? ' ' + m.ref : '') + ', ') + (d ? d.nom : '') + ', ' + dh(m.date) + (m.note ? ', ' + m.note : '')) + '</span></div>' +
      '<div class="d"><b class="n ' + (m.qte < 0 ? 'rouge' : 'vert') + '">' + (m.qte > 0 ? '+' : '') + F(m.qte) + '</b><span class="n">reste ' + F(m.apres) + '</span></div></div>'; }).join('') + '</div>';
}
function ficheArticle(id) {
  const a = C.article(id), f = C.famille(a.familleId);
  ouvrir(a.nom, '<div class="grille" style="margin-bottom:12px"><div class="chiffre"><span>Prix de vente</span><b class="n">' + M(a.pv) + '</b></div>' +
    (admin() ? '<div class="chiffre"><span>Prix d’achat moyen</span><b class="n">' + M(a.pa) + '</b></div>' : '<div class="chiffre"><span>Stock total</span><b class="n">' + F(C.qteTot(id)) + '</b></div>') + '</div>' +
    '<p class="petit doux" style="margin-bottom:8px">' + esc((a.code ? 'Code ' + a.code + ', ' : '') + (f ? f.nom : 'Sans famille') + ', alerte à ' + F(a.seuil || 0)) + '</p>' +
    '<div class="liste">' + C.db.depots.map(d => '<div class="ligne"><div class="f"><b>' + esc(d.nom) + '</b></div><div class="d"><b class="n">' + F(C.qte(id, d.id)) + '</b></div></div>').join('') +
    '<div class="ligne"><div class="f"><b>Total</b></div><div class="d"><b class="n">' + F(C.qteTot(id)) + '</b></div></div></div>' +
    '<div class="rangee" style="margin-top:14px">' + (C.db.depots.length > 1 ? '<button class="btn f" data-a="formTransfert" data-id="' + id + '">Transférer</button>' : '') +
    (admin() ? '<button class="btn f" data-a="formAjuster" data-id="' + id + '">Corriger le stock</button><button class="btn f" data-a="formArticle" data-id="' + id + '">Modifier</button>' : '') +
    '<button class="btn f" data-a="histoArticle" data-id="' + id + '">Historique</button></div>');
}
function formArticle(id, pour) {
  const a = id ? C.article(id) : {}, opF = [['', 'Sans famille']].concat(C.db.familles.map(x => [x.id, x.nom])), opD = C.db.depots.map(x => [x.id, x.nom]);
  const ch = [{ n: 'nom', l: 'Nom de l’article (une taille ou variante = un article)', v: a.nom, req: 1 }, { n: 'code', l: 'Code ou référence (facultatif)', v: a.code },
    { n: 'familleId', l: 'Famille', t: 'select', opts: opF, v: a.familleId }, { n: 'pa', l: 'Prix d’achat', t: 'nombre', v: a.pa }, { n: 'pv', l: 'Prix de vente', t: 'nombre', v: a.pv, req: 1 },
    { n: 'seuil', l: 'Seuil d’alerte (stock bas)', t: 'nombre', v: a.seuil == null ? 0 : a.seuil }, { n: 'unite', l: 'Unité de vente', t: 'select', opts: UNITES.map(x => [x, x]), v: a.unite || 'pièce' }];
  if (!id) ch.push({ n: 'init', l: 'Stock de départ', t: 'nombre', v: '' }, { n: 'depot', l: 'Rangé dans', t: 'select', opts: opD });
  formulaire(id ? 'Modifier l’article' : 'Nouvel article', ch, v => {
    const nom = v.nom.trim(), code = v.code.trim(), pv = num(v.pv), pa = v.pa === '' ? 0 : num(v.pa), seuil = v.seuil === '' ? 0 : num(v.seuil);
    if (!nom) throw new Error('Indiquez le nom de l’article.');
    if (!(pv >= 0)) throw new Error('Indiquez un prix de vente.');
    if (!(pa >= 0) || !(seuil >= 0)) throw new Error('Prix d’achat ou seuil invalide.');
    if (code && C.db.articles.some(x => x.id !== id && x.code && x.code.toLowerCase() === code.toLowerCase())) throw new Error('Ce code est déjà utilisé par un autre article.');
    if (id) Object.assign(a, { nom, code, familleId: v.familleId, pa, pv, seuil, unite: v.unite });
    else {
      const init = v.init === '' ? 0 : num(v.init); if (!(init >= 0)) throw new Error('Stock de départ invalide.');
      const n = { id: C.uid(), nom, code, familleId: v.familleId, pa, pv, seuil, unite: v.unite, actif: true }; C.db.articles.push(n);
      if (init > 0) C.ajuster(n.id, v.depot, init, 'Stock de départ', S.user.id);
      if (pour === 'achat') { S.ach.lignes.push({ articleId: n.id, qte: 1, pu: pa }); }
    }
    toast(id ? 'Article modifié' : 'Article créé');
  }, { apres: id ? '<button class="btn d large" style="margin-top:8px" data-a="retirerArticle" data-id="' + id + '">Retirer cet article de la liste</button>' : '' });
}
