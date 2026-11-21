/* SAS STOCK — relances des crédits clients (2.11.0)
   Un écran qui classe les clients qui doivent de l'argent du plus ancien au plus récent,
   et un bouton WhatsApp par client dont le message cite la facture la plus ancienne.
   La date de la dernière relance est gardée sur la fiche du client (t.relance), donc
   elle suit la boutique d'un appareil à l'autre : deux vendeurs ne relancent pas deux
   fois le même client le même jour. */
{
const J = 864e5;

/* La liste : un client par ligne, le plus vieux crédit d'abord. */
function lignesRelance() {
  const vx = C.vieuxCreditsD(), now = Date.now();
  return C.impayes('client').map(x => {
    const v = vx[x.t.id] || null;
    return { t: x.t, du: x.du, d: v ? v.date : null, num: v ? v.num : null,
      jours: v ? Math.floor((now - v.date) / J) : null, rel: x.t.relance || 0 };
  }).sort((a, b) => (a.d || Infinity) - (b.d || Infinity) || b.du - a.du);
}
/* « il y a 3 jours », « aujourd'hui » : plus parlant qu'une date pour une relance. */
function depuis(t) {
  if (!t) return '';
  const n = Math.floor((Date.now() - t) / J);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'hier' : 'il y a ' + n + ' jours';
}
function message(l) {
  const sh = C.db.meta.shop;
  let m = 'Bonjour ' + l.t.nom + ', sauf erreur de notre part, vous restez devoir ' + M(l.du) + ' à ' + sh.nom + '.';
  if (l.num) m += ' La plus ancienne facture non réglée est la n° ' + l.num + ' du ' + dj(l.d) + '.';
  else if (l.d) m += ' La plus ancienne somme due date du ' + dj(l.d) + '.';
  m += ' Merci de passer régler dès que possible.';
  if (sh.tel) m += ' Contact : ' + sh.tel + '.';
  return m;
}
/* Le filtre reste sur l'écran : un gérant qui relance fait souvent toute la liste des
   « plus de 30 jours » d'affilée, et revient dessus après chaque envoi. */
function filtrer(L) {
  const f = S.f.rltab || 'tous', now = Date.now();
  if (f === 'vieux') return L.filter(x => x.d && now - x.d > 30 * J);
  if (f === 'jamais') return L.filter(x => !x.rel);
  if (f === 'faits') return L.filter(x => x.rel);
  return L;
}
V.relances = function () {
  if (!admin()) return V.plus();
  if (!S.f.rltab) S.f.rltab = 'tous';
  const L = lignesRelance(), V2 = filtrer(L), now = Date.now();
  const tot = L.reduce((s, x) => s + x.du, 0), vieux = L.filter(x => x.d && now - x.d > 30 * J);
  const h = '<div class="titre"><h1>Relances</h1><button class="btn mini" data-a="aller" data-v="tiers">Tous les clients</button></div>' +
    '<div class="grille" style="margin-bottom:12px"><div class="chiffre fort"><span>À encaisser</span><b class="n">' + M(tot) + '</b><span>' + L.length + ' client' + (L.length > 1 ? 's' : '') + '</span></div>' +
    '<div class="chiffre"><span>En retard de plus de 30 jours</span><b class="n' + (vieux.length ? ' rouge' : '') + '">' + M(vieux.reduce((s, x) => s + x.du, 0)) + '</b></div>' +
    '<div class="chiffre"><span>Jamais relancés</span><b class="n">' + L.filter(x => !x.rel).length + '</b></div></div>' +
    puces('rltab', [['tous', 'Tous (' + L.length + ')'], ['vieux', 'Plus de 30 j (' + vieux.length + ')'], ['jamais', 'Jamais relancés'], ['faits', 'Déjà relancés']]);
  if (!L.length) return h + '<div class="carte">' + vide('Personne ne vous doit d’argent', 'Tous vos clients sont à jour.') + '</div>';
  if (!V2.length) return h + '<div class="carte">' + vide('Aucun client dans ce filtre', 'Changez de filtre ci-dessus.') + '</div>';
  return h + '<div class="liste rel">' + V2.map(l => {
    const num = numeroWA(l.t.tel);
    return '<div class="ligne rl">' +
      '<div class="f"><b>' + esc(l.t.nom) + '</b><span>' + esc(l.t.tel || 'Pas de numéro') +
        (l.d ? ' · ' + (l.jours >= 1 ? l.jours + ' jour' + (l.jours > 1 ? 's' : '') : 'moins d’un jour') + (l.num ? ' · facture ' + esc(l.num) : '') : '') + '</span>' +
        (l.rel ? '<span class="etiq">Relancé ' + depuis(l.rel) + '</span>' : '') + '</div>' +
      '<div class="d"><b class="n rouge">' + M(l.du) + '</b></div>' +
      '<div class="rb">' + (num
        ? '<a class="btn mini p" target="_blank" rel="noopener" data-a="relanceFaite" data-id="' + l.t.id + '" href="https://wa.me/' + num + '?text=' + encodeURIComponent(message(l)) + '">' + ic('envoi') + 'Relancer</a>'
        : '<button class="btn mini" data-a="formTiers" data-id="' + l.t.id + '">Ajouter le numéro</button>') +
        '<button class="btn mini" data-a="formReglement" data-id="' + l.t.id + '">Encaisser</button>' +
        '<button class="btn mini" data-a="ficheTiers" data-id="' + l.t.id + '">Fiche</button></div></div>';
  }).join('') + '</div>' +
    '<p class="petit doux" style="margin-top:12px">« Relancer » ouvre WhatsApp avec le message déjà écrit : vous pouvez le modifier avant d’envoyer. La date de relance est enregistrée dès que vous touchez le bouton.</p>';
};
/* Le lien ouvre WhatsApp dans un autre onglet ; on ne peut pas savoir si le message a été
   envoyé, donc on note la relance au moment du clic. C'est un repère, pas une preuve. */
A.relanceFaite = d => {
  const t = C.tiers(d.id); if (!t) return;
  t.relance = Date.now(); sauver();
  setTimeout(() => { if (S.vue === 'relances') rendre(); }, 400);
};
A.relances = () => { fermer(); aller('relances'); };

/* Entrées vers l'écran : le menu Plus, l'écran Clients et l'alerte des crédits en retard. */
const V_plusRelance = V.plus;
V.plus = function () {
  const html = V_plusRelance();
  if (!admin()) return html;
  const n = C.impayes('client').length;
  const b = '<button class="ligne" data-a="aller" data-v="relances">' + ic('envoi').replace('<svg', '<svg width="24" height="24"') +
    '<div class="f"><b>Relances</b><span>' + (n ? n + ' client' + (n > 1 ? 's' : '') + ' à relancer par WhatsApp' : 'Personne ne vous doit d’argent') + '</span></div></button>';
  return html.replace('<button class="ligne" data-a="licence">', b + '<button class="ligne" data-a="licence">');
};
const V_tiersRelance = V.tiers;
V.tiers = function () {
  const html = V_tiersRelance();
  if (!admin() || S.f.ttab !== 'client' || !C.impayes('client').length) return html;
  return html.replace('<div class="cherche"', '<button class="btn mini p" style="margin-bottom:10px" data-a="aller" data-v="relances">' + ic('envoi') + 'Relancer les crédits</button><div class="cherche"');
};
}
