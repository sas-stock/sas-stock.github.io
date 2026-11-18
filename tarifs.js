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

/* Réglages > Installer l'application (2.9.3) : lien vers la page de téléchargement Android / ordinateur */
{
const LIEN_DL = 'https://sas-stock.com/telecharger.html';
const reglagesDlBase = V.reglages;
V.reglages = function () {
  const h = reglagesDlBase();
  if (!admin()) return h;
  return h + '<div class="bloc"><div class="rangee" style="justify-content:space-between;margin:18px 2px 8px"><h2>Installer l’application</h2></div><div class="carte">' +
    '<p class="petit doux" style="margin-bottom:10px">Installez SAS STOCK sur un téléphone Android ou un ordinateur : il s’ouvre depuis une icône, même sans internet. Pour un autre appareil, envoyez-lui ce lien.</p>' +
    '<div class="rangee"><a class="btn p f" style="justify-content:center;text-align:center;text-decoration:none" href="telecharger.html" target="_blank" rel="noopener">Télécharger l’application</a><button class="btn f" data-a="copierLienDl">Copier le lien</button></div></div></div>';
};
A.copierLienDl = () => { try { navigator.clipboard.writeText(LIEN_DL).then(() => toast('Lien copié : ' + LIEN_DL), () => toast(LIEN_DL)); } catch (e) { toast(LIEN_DL); } };
}

/* Présentation pour un visiteur qui découvre le site (2.9.4) : écran de connexion seulement */
{
const FONCTIONS = [
  ['Caisse rapide', 'Ventes en quelques touches, monnaie à rendre, reçus et factures à imprimer ou envoyer.'],
  ['Stock en temps réel', 'Chaque vente et chaque achat mettent le stock à jour. Alertes de rupture et de stock bas.'],
  ['Crédits et dettes', 'Ce que chaque client vous doit, ce que vous devez aux fournisseurs, règlements et relances.'],
  ['Bénéfice et rapports', 'Point de caisse du jour, bénéfice, articles les plus vendus, impayés.'],
  ['Inventaires et dépôts', 'Comptage du stock réel, écarts corrigés en une fois, plusieurs dépôts ou magasins.'],
  ['Employés contrôlés', 'Un code secret par employé. La caisse ne voit ni les prix d’achat ni les bénéfices.']
];
const vueActivationPres = vueActivation;
vueActivation = function () {
  const h = vueActivationPres();
  if (etat.raison !== 'compte') return h;
  const tete = '<h1 class="pres-t">Gérez le stock et la caisse de votre boutique</h1><p class="pres-s">Sur téléphone et ordinateur, même sans internet. Vos données sont sauvegardées en ligne et identiques sur tous vos appareils.</p>';
  const corps = '<div class="pres"><p class="pres-h">Ce que fait SAS STOCK</p><div class="pres-g">' + FONCTIONS.map(f => '<div><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>').join('') + '</div>' +
    '<p class="pres-h">Pour commencer</p><ol class="pres-e"><li>Touchez <b>Continuer avec Google</b> avec le compte de votre boutique.</li><li>Choisissez une formule ci-dessous et envoyez-la sur WhatsApp à ' + esc(REVENDEUR.nom) + '.</li><li>Dès que votre licence est activée, l’application s’ouvre : créez votre boutique et commencez à vendre.</li></ol></div>';
  let r = h.replace('<p class="ex">Connectez-vous avec le compte Google de votre boutique. Vos données seront les mêmes sur votre téléphone et votre ordinateur.</p>', tete + '<p class="ex">Nouveau client ou déjà client : connectez-vous avec le compte Google de votre boutique.</p>');
  const i = r.indexOf('<div class="tarifs');
  return i >= 0 ? r.slice(0, i) + corps + r.slice(i) : r;
};
}
