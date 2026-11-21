/* SAS STOCK — centre de notifications (2.9.0)
   Une cloche dans l'en-tête, avec le nombre d'alertes non vues. Rien ne s'ouvre tout seul.
   Les alertes sont calculées à partir des données (aucune donnée en plus n'est enregistrée en ligne).
   « Vu » masque une alerte sur cet appareil jusqu'à ce que son contenu change (signature). */
{
P.cloche = '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';
const J = 864e5;
const cleVu = () => 'sasNotifVu:' + (typeof compte !== 'undefined' && compte ? compte.uid : 'local') + ':' + (S.user ? S.user.id : '');
const lireVu = () => { try { return JSON.parse(localStorage.getItem(cleVu()) || '{}'); } catch (e) { return {}; } };
const ecrireVu = o => { try { localStorage.setItem(cleVu(), JSON.stringify(o)); } catch (e) {} };

// date de la plus ancienne vente à crédit encore impayée (les règlements soldent d'abord les plus anciennes)
const plusVieuxCredit = tid => C.vieuxCredits()[tid] || null;

/* Les alertes parcourent tout le stock et tous les crédits : on garde le résultat
   jusqu'à la prochaine modification, sinon la cloche ralentit chaque écran. */
let _alCle = '', _al = [];
function alertes() {
  if (!C.db || !S.user) return [];
  const cle = C.rev + '|' + C.db.ventes.length + '|' + C.db.mouvements.length + '|' + C.db.tiers.length + '|' + S.user.id +
    '|' + (typeof attente !== 'undefined' && attente ? attente.n + ':' + attente.v : '') + '|' + syncEtat + '|' + (navigator.onLine === false);
  if (cle === _alCle) return _al;
  _alCle = cle; _al = calculAlertes();
  return _al;
}
function calculAlertes() {
  const adm = admin(), L = [], now = Date.now();
  const art = C.db.articles.filter(a => a.actif !== false);
  // stock
  const rupt = art.filter(a => C.qteTot(a.id) <= 0), bas = art.filter(a => { const q = C.qteTot(a.id); return q > 0 && q <= (a.seuil || 0); });
  if (rupt.length) L.push({ k: 'rupture', sig: rupt.map(a => a.id).sort().join(','), n: 'ko', t: rupt.length === 1 ? rupt[0].nom + ' : rupture de stock' : rupt.length + ' articles en rupture de stock',
    s: rupt.length === 1 ? 'Réapprovisionnez ou retirez-le de la vente.' : rupt.slice(0, 4).map(a => a.nom).join(', ') + (rupt.length > 4 ? '…' : ''), b: [['Voir', 'notifStock']] });
  if (bas.length) L.push({ k: 'bas', sig: bas.map(a => a.id + ':' + C.qteTot(a.id)).sort().join(','), n: 'al', t: bas.length === 1 ? bas[0].nom + ' : stock bas (' + F(C.qteTot(bas[0].id)) + ')' : bas.length + ' articles bientôt épuisés',
    s: bas.length === 1 ? 'Pensez à recommander.' : bas.slice(0, 4).map(a => a.nom + ' (' + F(C.qteTot(a.id)) + ')').join(', ') + (bas.length > 4 ? '…' : ''), b: [['Voir', 'notifStock']] });
  // crédits clients de plus de 30 jours
  if (adm) {
    const ret = C.impayes('client').map(x => ({ t: x.t, du: x.du, d: plusVieuxCredit(x.t.id) })).filter(x => x.d && now - x.d > 30 * J).sort((a, b) => a.d - b.d);
    if (ret.length) L.push({ k: 'credits', sig: ret.map(x => x.t.id + ':' + Math.round(x.du)).join(','), n: 'al',
      t: ret.length === 1 ? ret[0].t.nom + ' vous doit ' + M(ret[0].du) + ' depuis ' + Math.floor((now - ret[0].d) / J) + ' jours' : ret.length + ' clients doivent de l’argent depuis plus de 30 jours',
      s: ret.length === 1 ? 'Relancez-le par WhatsApp en un clic.' : 'Total : ' + M(ret.reduce((s, x) => s + x.du, 0)),
      liste: ret.slice(0, 5).map(x => ['ficheTiers', x.t.id, x.t.nom, M(x.du) + ' · ' + Math.floor((now - x.d) / J) + ' j']),
      b: typeof V !== 'undefined' && V.relances ? [['Relancer', 'relances']] : [] });
    const fo = C.impayes('fournisseur');
    if (fo.length) { const tot = fo.reduce((s, x) => s + x.du, 0);
      L.push({ k: 'fournisseurs', sig: fo.map(x => x.t.id + ':' + Math.round(x.du)).join(','), n: 'info', t: 'Vous devez ' + M(tot) + (fo.length === 1 ? ' à ' + fo[0].t.nom : ' à ' + fo.length + ' fournisseurs'),
        s: fo.length > 1 ? fo.slice(0, 3).map(x => x.t.nom + ' ' + M(x.du)).join(', ') : '', b: [['Voir', 'notifFour']] }); }
  }
  // inventaires en cours
  (C.db.inventaires || []).filter(x => x.statut !== 'valide').forEach(x => {
    const n = C.db.articles.filter(a => a.actif !== false && (!x.familleId || a.familleId === x.familleId)), c = n.filter(a => x.comptes && x.comptes[a.id] != null).length;
    L.push({ k: 'inv:' + x.id, sig: String(c), n: 'info', t: 'Inventaire ' + x.num + ' en cours', s: c + ' / ' + n.length + ' articles comptés' + (adm ? ' · pensez à le valider' : ''), b: [['Continuer', 'invOuvrir', x.id]] });
  });
  // envois en attente
  if (typeof attente !== 'undefined' && attente.n && (navigator.onLine === false || syncEtat !== 'ok'))
    L.push({ k: 'attente', sig: 'x', n: 'info', t: (attente.v ? attente.v + ' facture' + (attente.v > 1 ? 's' : '') : attente.n + ' modification' + (attente.n > 1 ? 's' : '')) + ' pas encore envoyée' + ((attente.v || attente.n) > 1 ? 's' : ''),
      s: 'Tout part automatiquement dès que la connexion revient. Ne désinstallez pas l’application d’ici là.', fixe: 1 });
  if (adm) {
    // licence
    if (etat && etat.ok && !etat.aVie && !etat.maitre && etat.reste <= 15)
      L.push({ k: 'licence', sig: String(etat.reste <= 3 ? 'r' + etat.reste : etat.reste <= 7 ? '7' : '15'), n: etat.reste <= 7 ? 'ko' : 'al',
        t: (etat.essai ? 'Votre essai gratuit se termine dans ' : 'Votre licence se termine dans ') + etat.reste + ' jour' + (etat.reste > 1 ? 's' : ''),
        s: etat.essai ? 'Demandez votre licence à ' + REVENDEUR.nom + ' (' + REVENDEUR.tel + ') : vous garderez tout ce que vous avez déjà saisi.'
          : 'Renouvelez auprès de ' + REVENDEUR.nom + ' (' + REVENDEUR.tel + ') pour ne pas être bloqué.',
        b: [[etat.essai ? 'Demander ma licence' : 'Prolonger', 'licence']] });
    // copie de sécurité
    const sv = C.db.meta.sauvegarde || 0;
    // pendant l'essai la copie dans un fichier est fermée : inutile de la réclamer
    if (!etat.essai && C.db.ventes.length >= 20 && now - sv > 30 * J)
      L.push({ k: 'copie', sig: String(Math.floor(now / (30 * J))), n: 'info', t: sv ? 'Dernière copie de sécurité il y a ' + Math.floor((now - sv) / J) + ' jours' : 'Aucune copie de sécurité dans un fichier',
        s: 'Vos données sont en ligne, mais une copie dans un fichier (WhatsApp, clé USB) protège en plus.', b: [['Faire une copie', 'notifCopie']] });
  }
  const nv = alerteNouveautes(lireVu()); if (nv) L.unshift(nv);
  return L;
}
/* ---------- nouveautés de chaque mise à jour ---------- */
const NOUVEAUTES = [
  { v: '2.11.0', l: ['Nouvel écran « Relances » (menu Plus) : vos clients qui doivent de l’argent, du plus ancien au plus récent, avec un bouton qui ouvre WhatsApp avec le message déjà écrit, citant la facture concernée. La date de chaque relance est enregistrée.',
    'Nouveau compte : 7 jours d’essai gratuit, avec vos vraies données. Tout est conservé quand la licence est activée.',
    'La cloche s’anime quand une nouvelle alerte arrive, et les notifications apparaissent une par une.'] },
  { v: '2.10.0', l: ['L’application s’ouvre et change d’écran beaucoup plus vite, surtout quand la boutique a beaucoup de ventes et de clients.'] },
  { v: '2.9.9', l: ['Stock : nouvel onglet « Classement ». Vous voyez les articles les plus vendus et ceux qui dorment, sur 7 jours, 30 jours, 3 mois, 12 mois ou depuis le début, classés par quantité, par chiffre d’affaires ou par marge.'] },
  { v: '2.9.8', l: ['Caisse : remise sur le total d’une vente, en francs ou en pourcentage. Elle apparaît sur la facture et le PDF.', 'Retours : depuis une facture, bouton « Retour / remboursement ». Les articles reviennent en stock, et le client est remboursé en espèces ou le montant est déduit de ce qu’il doit.', 'Nouvel onglet « Retours » dans les Journaux, et les remboursements apparaissent dans le point de caisse.', 'Réglages : vous choisissez si la caisse peut faire des remises et enregistrer des retours (le gérant le peut toujours).'] },
  { v: '2.9.7', l: ['Facture : quand le client ne paie rien, la mention « LIVRÉ ET NON PAYÉ » apparaît sur la facture, le PDF et le message WhatsApp.', 'Facture longue : le montant total reste sur la première page, les articles continuent sur les pages suivantes.'] },
  { v: '2.9.6', l: ['Clients et fournisseurs : indiquez une somme déjà due à la création, ou ajoutez-la plus tard depuis la fiche (« Ajouter une somme due »).'] },
  { v: '2.9.5', l: ['Caisse : choisissez le dépôt d’où vous vendez (« Vendre depuis le dépôt »). Le choix est gardé sur l’appareil.', 'La recherche de la caisse montre aussi le stock des autres dépôts.', 'Transfert entre dépôts : le dépôt d’arrivée ne peut plus être le même que celui de départ.'] },
  { v: '2.9.3', l: ['Réglages > Installer l’application : téléchargez SAS STOCK pour Android ou ordinateur, ou copiez le lien pour un autre appareil.'] },
  { v: '2.9.2', l: ['SAS STOCK a sa propre adresse : sas-stock.com.', 'L’application s’installe sur téléphone Android et sur ordinateur depuis sas-stock.com/telecharger.html.'] },
  { v: '2.9.1', l: ['Les tarifs des abonnements sont affichés dans Réglages > Compte et licence : touchez une formule pour la demander sur WhatsApp.', 'Nouvelle unité « rouleau » pour vos articles.', 'Cette fenêtre vous annonce maintenant chaque nouveauté.'] },
  { v: '2.9.0', l: ['La cloche en haut de l’écran regroupe les alertes : ruptures, stocks bas, clients en retard de paiement, factures en attente, licence…'] },
  { v: '2.8.0', l: ['Inventaires (Stock > Inventaires) : comptez le stock réel, l’application calcule les écarts et corrige le stock en une fois, avec un rapport imprimable.'] },
  { v: '2.7.1', l: ['Option « trait entre chaque article » sur les factures (Réglages > Règles de vente).'] },
  { v: '2.7.0', l: ['Arrivages (Stock > Arrivages) : retrouvez chaque livraison (celle du lundi, celle du vendredi…) et ce qu’il en reste.'] }
];
const cmpV = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
function versionDepart() {
  // première ouverture de cette version sur l'appareil : une boutique créée aujourd'hui ne voit pas l'historique ;
  // une boutique plus ancienne découvre les nouveautés depuis la 2.7.0
  const k = 'sasVersionDepart:' + (typeof compte !== 'undefined' && compte ? compte.uid : 'local');
  let d = null; try { d = localStorage.getItem(k); } catch (e) {}
  if (!d) { d = C.db && C.db.meta && C.db.meta.cree && Date.now() - C.db.meta.cree > J ? '2.6.1' : VERSION; try { localStorage.setItem(k, d); } catch (e) {} }
  return d;
}
function alerteNouveautes(vu) {
  const depuis = [versionDepart(), vu.maj || '0'].sort(cmpV).pop();
  const N = NOUVEAUTES.filter(x => cmpV(x.v, depuis) > 0 && cmpV(x.v, VERSION) <= 0);
  if (!N.length) return null;
  return { k: 'maj', sig: N[0].v, n: 'info', t: N.length === 1 ? 'Nouveau dans la version ' + N[0].v : 'Nouveautés depuis votre dernière mise à jour', items: N.reduce((r, x) => r.concat(x.l.map(t => (N.length > 1 ? x.v + ' : ' : '') + t)), []) };
}
const nonVues = (L, vu) => L.filter(x => x.fixe || vu[x.k] !== x.sig);

/* ---------- la cloche ----------
   La cloche ne s'agite que lorsqu'une alerte de PLUS apparaît : sans ce garde-fou
   elle rejouerait l'animation à chaque rendu d'écran, ce qui finit par agacer. */
let _nAv = null;
function cloche() {
  const n = nonVues(alertes(), lireVu()).length;
  const neuf = _nAv != null && n > _nAv; _nAv = n;
  return '<button id="cloche" class="cloche' + (n ? ' on' : '') + (neuf ? ' neuf' : '') + '" data-a="notifs" aria-label="Notifications' + (n ? ' : ' + n + ' nouvelle' + (n > 1 ? 's' : '') : '') + '">' + ic('cloche') + (n ? '<b>' + (n > 9 ? '9+' : n) + '</b>' : '') + '</button>';
}
const majCloche = () => { const c = $('#cloche'); if (c) c.outerHTML = cloche(); };
const coqueNotifBase = coque;
coque = function (contenu) { return coqueNotifBase(contenu).replace('<button class="moi"', () => cloche() + '<button class="moi"'); };
if (typeof majAttente === 'function') { const majAttenteNotifBase = majAttente; majAttente = function () { majAttenteNotifBase(); majCloche(); }; }

/* ---------- le panneau ---------- */
/* L'apparition en cascade n'a lieu qu'à l'ouverture du panneau : après un « Vu »,
   rejouer l'animation sur toute la liste donnerait l'impression d'un rechargement. */
let _anim = 0;
function carteNotif(x, vue, i) {
  const d = _anim && i != null ? ' style="animation-delay:' + Math.min(i * 55, 330) + 'ms"' : ' style="animation:none"';
  return '<div class="carte notif ' + x.n + (vue ? ' vue' : '') + '"' + d + '><div class="nt"><b>' + esc(x.t) + '</b>' + (x.s ? '<span>' + esc(x.s) + '</span>' : '') + '</div>' +
    (x.items ? '<ul class="majl">' + x.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
    (x.liste ? '<div class="liste" style="margin-top:8px">' + x.liste.map(l => '<button class="ligne" data-a="' + l[0] + '" data-id="' + esc(l[1]) + '"><div class="f"><b>' + esc(l[2]) + '</b></div><div class="d"><span>' + esc(l[3]) + '</span></div></button>').join('') + '</div>' : '') +
    '<div class="rangee nb">' + (x.b || []).map(b => '<button class="btn mini p" data-a="' + b[1] + '"' + (b[2] ? ' data-id="' + esc(b[2]) + '"' : '') + '>' + esc(b[0]) + '</button>').join('') +
    (!vue && !x.fixe ? '<button class="btn mini" data-a="notifVu" data-k="' + esc(x.k) + '">Vu</button>' : '') + '</div></div>';
}
function panneau() {
  const L = alertes(), vu = lireVu(), nv = nonVues(L, vu), vues = L.filter(x => nv.indexOf(x) < 0);
  ouvrir('Notifications', (nv.length ? nv.map((x, i) => carteNotif(x, 0, i)).join('') + (nv.filter(x => !x.fixe).length > 1 ? '<button class="btn f large" style="margin-top:4px" data-a="notifTout">Tout marquer comme vu</button>' : '')
    : '<div class="carte">' + vide('Rien de nouveau', L.length ? 'Vous avez tout vu.' : 'Tout va bien : pas de rupture, pas de retard, rien en attente.') + '</div>') +
    (vues.length ? '<details style="margin-top:14px"><summary class="petit doux">Déjà vues (' + vues.length + ')</summary><div style="margin-top:8px">' + vues.map(x => carteNotif(x, 1)).join('') + '</div></details>' : '') +
    '<p class="petit doux" style="margin-top:12px">Une alerte marquée « Vu » revient si la situation change (nouvel article en rupture, nouveau retard…).</p>');
}
A.notifs = () => { _anim = 1; panneau(); _anim = 0; };
A.notifVu = d => { const L = alertes(), x = L.find(y => y.k === d.k), vu = lireVu(); if (x) { vu[x.k] = x.sig; ecrireVu(vu); } panneau(); majCloche(); };
A.notifTout = () => { const vu = lireVu(); alertes().forEach(x => { if (!x.fixe) vu[x.k] = x.sig; }); ecrireVu(vu); panneau(); majCloche(); };
A.notifStock = () => { fermer(); S.f.stab = 'alertes'; aller('stock'); };
A.notifFour = () => { fermer(); S.f.ttab = 'fournisseur'; aller('tiers'); };
A.notifCopie = () => { fermer(); aller('reglages'); setTimeout(() => { const t = [...document.querySelectorAll('h2,h3,.sect b')].find(h => /Copie de sécurité/.test(h.textContent)); if (t) t.scrollIntoView({ block: 'start' }); }, 50); };
}
