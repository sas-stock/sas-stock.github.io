/* SAS STOCK — tarifs des abonnements (2.9.1)
   Affichés sur la page d'accueil d'un nouveau client (et licence en attente ou expirée)
   et dans Réglages > Compte et licence. Pour changer un prix : modifier TARIFS ci-dessous. */
{
const TARIFS = [
  { nom: '1 mois', prix: 12000, mois: 1 },
  { nom: '3 mois', prix: 33000, mois: 3 },
  { nom: '1 an', prix: 120000, mois: 12, phare: '2 mois offerts' },
  { nom: 'À vie', prix: 350000, mois: 0 }
];
const base = TARIFS[0].prix, NBSP = String.fromCharCode(160), Mn = x => M(x).split(' ').join(NBSP);
const lienWA = t => {
  const n = typeof numeroWA === 'function' ? numeroWA(REVENDEUR.tel) : '';
  const m = 'Bonjour ' + REVENDEUR.nom + ', je souhaite l’abonnement SAS STOCK « ' + t.nom + ' » (' + M(t.prix) + ').' + (typeof compte !== 'undefined' && compte && compte.email ? ' Mon compte : ' + compte.email : '');
  return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(m) : 'tel:' + REVENDEUR.tel2;
};
function detail(t) {
  if (!t.mois) return 'Un seul paiement, sans renouvellement';
  if (t.mois === 1) return 'Renouvelable chaque mois';
  const eco = base * t.mois - t.prix;
  return 'Soit ' + Mn(Math.round(t.prix / t.mois)) + ' par mois' + (eco > 0 ? ' · ' + Mn(eco) + ' d’économie' : '');
}
function blocTarifs(sombre) {
  return '<div class="tarifs' + (sombre ? ' sombre' : '') + '"><p class="tt">Nos abonnements</p><div class="tg">' + TARIFS.map(t =>
    '<a class="tf' + (t.phare ? ' phare' : '') + '" href="' + lienWA(t) + '" target="_blank" rel="noopener">' + (t.phare ? '<i>' + esc(t.phare) + '</i>' : '') +
    '<span class="tn">' + esc(t.nom) + '</span><b class="n">' + M(t.prix) + '</b><span class="td">' + esc(detail(t)) + '</span></a>').join('') + '</div>' +
    '<p class="tp">Toutes les fonctions sont incluses, sur téléphone et ordinateur. Touchez une formule pour la demander sur WhatsApp.</p></div>';
}
window.blocTarifs = blocTarifs;

// page d'accueil, licence en attente, licence expirée
const vueActivationTarifs = vueActivation;
vueActivation = function () {
  const h = vueActivationTarifs(), r = etat.raison;
  if (['chargement', 'premier', 'horloge'].indexOf(r) >= 0) return h;
  const t = blocTarifs(true), i = h.indexOf('<div class="contact">');
  return i >= 0 ? h.slice(0, i) + t + h.slice(i) : h.replace(/<\/div><\/div>$/, t + '</div></div>');
};
// Réglages > Compte et licence
const modaleLicenceTarifs = modaleLicence;
modaleLicence = function () {
  modaleLicenceTarifs();
  if (etat.aVie) return;
  const c = document.querySelector('#modale .carte'); if (c) c.insertAdjacentHTML('afterend', '<div style="margin-top:12px">' + blocTarifs(false) + '</div>');
};
A.licence = () => modaleLicence();
}
