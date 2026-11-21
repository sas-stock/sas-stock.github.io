/* SAS STOCK — page d'accueil pour un visiteur qui découvre le site (2.10.1)
   Remplace l'écran de connexion quand personne n'est connecté : présentation, démonstration,
   captures réelles, abonnements, questions fréquentes, conditions.
   Les clients déjà inscrits retrouvent « Continuer avec Google » en haut de la page. */
{
const IMG = 'img/';
const FONCTIONS = [
  { t: 'Une caisse faite pour aller vite', s: 'Tapez les premières lettres de l’article, ajoutez-le, encaissez. L’application calcule le total et la monnaie à rendre, et sort la facture tout de suite. Vous pouvez vendre à crédit, encaisser un acompte, faire une remise, reprendre un article et rembourser le client.',
    i: 'tel-caisse', l: ['Recherche par nom ou par code', 'Monnaie à rendre calculée', 'Vente à crédit et acomptes', 'Remises et retours'] },
  { t: 'Le stock se tient tout seul', s: 'Chaque vente sort la marchandise, chaque achat la fait entrer. Vous voyez à tout moment ce qui reste, article par article et dépôt par dépôt, et l’application vous prévient avant la rupture.',
    i: 'tel-stock', l: ['Alerte de rupture et de stock bas', 'Plusieurs dépôts ou magasins', 'Inventaire avec correction des écarts', 'Import de vos articles depuis Excel'] },
  { t: 'Vous savez qui vous doit quoi', s: 'Chaque client a sa fiche : ce qu’il a acheté, ce qu’il a payé, ce qu’il reste à payer. Vous enregistrez un règlement en deux touches et l’application vous signale les crédits qui traînent depuis plus de 30 jours.',
    i: 'tel-clients', l: ['Crédits clients et dettes fournisseurs', 'Reçu de règlement à envoyer', 'Relance par WhatsApp depuis la fiche', 'Alerte sur les retards'] },
  { t: 'Des factures propres, à votre nom', s: 'Facture au format page avec votre logo, votre adresse et votre RCCM, ou petit ticket pour une imprimante de caisse. À imprimer, à envoyer en PDF ou à copier dans WhatsApp.',
    i: 'tel-facture', l: ['Votre logo et votre RCCM', 'PDF prêt à envoyer', 'Message WhatsApp en un geste', 'Mention « livré et non payé »'] }
];
const ECRANS = [
  { i: 'pc-accueil', t: 'L’accueil : vos ventes du jour, votre bénéfice, les crédits à encaisser et le stock à surveiller.' },
  { i: 'pc-rapports', t: 'Le bénéfice réel : chiffre d’affaires, coût d’achat de ce qui est sorti, dépenses, et ce qui reste.' },
  { i: 'pc-classement', t: 'Le classement : ce qui se vend le mieux, et les articles qui dorment sur vos étagères.' }
];
const QUESTIONS = [
  ['Faut-il Internet pour vendre ?', 'Non. Une fois l’application ouverte une première fois sur l’appareil, elle fonctionne sans réseau : vous vendez, vous imprimez, vous consultez votre stock. Dès que la connexion revient, tout part automatiquement vers votre compte.'],
  ['Mes données sont-elles en sécurité ?', 'Elles sont enregistrées sur votre appareil et sur votre compte Google, chez Google (Firebase). Chaque boutique a son espace : personne d’autre ne peut les lire. Vous pouvez en plus enregistrer une copie dans un fichier quand vous voulez, et la restaurer.'],
  ['Puis-je l’utiliser sur plusieurs appareils ?', 'Oui, autant que vous voulez avec le même compte. Une vente faite sur le téléphone de la boutique apparaît sur l’ordinateur du bureau, et l’inverse.'],
  ['Mes employés voient-ils mes bénéfices ?', 'Non. Chaque employé entre son propre code secret. Un caissier vend, encaisse et imprime, mais ne voit ni les prix d’achat, ni les marges, ni les bénéfices, ni les rapports de la boutique.'],
  ['J’ai un magasin et un dépôt. C’est possible ?', 'Oui. Vous créez autant de dépôts que nécessaire, vous choisissez depuis quel dépôt la caisse vend, vous transférez de la marchandise de l’un à l’autre, et vous faites vos inventaires dépôt par dépôt.'],
  ['Comment j’imprime mes factures ?', 'Au format page A4 depuis un ordinateur, ou en petit ticket sur une imprimante de caisse. Vous pouvez aussi envoyer la facture en PDF ou son texte par WhatsApp, sans imprimante.'],
  ['Que se passe-t-il si mon abonnement se termine ?', 'Vos données restent intactes. L’application demande simplement de renouveler, et se rouvre toute seule dès que l’abonnement est prolongé.'],
  ['Comment payer l’abonnement ?', 'Orange Money, MTN MoMo, Moov Money, Wave ou espèces, directement auprès de ' + REVENDEUR.nom + '. Touchez une formule ci-dessus pour en discuter sur WhatsApp.']
];
const CSS = `
.vit{--vv:#0C241B;--vc:#F2A413;--vt:#1C6B4B;background:#fff;color:#102A20;min-height:100vh}
.vit *{box-sizing:border-box}
.vit .v-w{width:100%;max-width:1060px;margin:0 auto;padding:0 20px}
.vit .v-nav{position:sticky;top:0;z-index:5;background:rgba(12,36,27,.96);backdrop-filter:blur(6px)}
.vit .v-nav .v-w{display:flex;align-items:center;gap:12px;height:62px}
.vit .v-nav svg{width:34px;height:34px}
.vit .v-nav b{color:#fff;font-size:1.1rem;font-weight:850;letter-spacing:-.01em}
.vit .v-nav .v-sp{flex:1}
.vit .v-nav a{color:#CFE0D7;text-decoration:none;font-size:.92rem;font-weight:600}
.vit .v-nav a.v-b{background:#fff;color:var(--vv);padding:9px 15px;border-radius:99px;font-weight:800}
@media(max-width:700px){.vit .v-nav a.v-h{display:none}}
.vit .v-hero{background:var(--vv);color:#fff;padding:46px 0 0;overflow:hidden}
.vit .v-hero h1{font-size:2.5rem;line-height:1.08;letter-spacing:-.03em;margin:0 0 14px;font-weight:850}
.vit .v-hero p.v-s{font-size:1.1rem;line-height:1.5;color:#C5D8CE;margin:0 0 22px;max-width:30em}
.vit .v-bs{display:flex;flex-wrap:wrap;gap:10px}
.vit .v-bt{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;border-radius:99px;font-weight:800;font-size:1rem;text-decoration:none;border:0;cursor:pointer;font-family:inherit}
.vit .v-bt.v-p{background:var(--vc);color:#1A1203}
.vit .v-bt.v-g{background:#fff;color:var(--vv)}
.vit .v-bt.v-l{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}
.vit .v-hero .v-sous{font-size:.86rem;color:#9FBBAE;margin:14px 0 0}
.vit .v-hero .v-im{display:flex;justify-content:center;margin-top:34px}
.vit .v-hero .v-im img{width:260px;height:auto;max-width:72vw;border-radius:26px 26px 0 0;box-shadow:0 -2px 60px rgba(0,0,0,.45);display:block}
.vit .v-ban{background:#091B14;color:#9FBBAE;font-size:.88rem;padding:13px 0;text-align:center}
.vit .v-ban b{color:#fff}
.vit section{padding:58px 0}
.vit h2{font-size:1.8rem;line-height:1.15;letter-spacing:-.02em;margin:0 0 10px;font-weight:850}
.vit .v-lede{color:#4A6459;font-size:1.03rem;margin:0 0 26px;max-width:36em}
.vit .v-vid{background:#0C241B;color:#fff}
.vit .v-vid video{width:100%;height:auto;aspect-ratio:16/10;border-radius:16px;display:block;background:#000}
.vit .v-vid .lede{color:#C5D8CE}
.vit .v-fn{display:grid;gap:34px}
.vit .v-fn article{display:grid;gap:20px;align-items:center}
@media(min-width:800px){.vit .v-fn article{grid-template-columns:1fr 300px}.vit .v-fn article:nth-child(even) .ph{order:-1}}
.vit .v-fn h3{font-size:1.35rem;margin:0 0 8px;letter-spacing:-.01em}
.vit .v-fn p{color:#4A6459;margin:0 0 12px;line-height:1.55}
.vit .v-fn ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}
.vit .v-fn li{position:relative;padding-left:26px;font-size:.95rem}
.vit .v-fn li::before{content:"";position:absolute;left:0;top:.42em;width:14px;height:8px;border-left:2.5px solid var(--vt);border-bottom:2.5px solid var(--vt);transform:rotate(-45deg)}
.vit .v-ph{display:flex;justify-content:center}
.vit .v-ph img{width:280px;height:auto;max-width:80vw;border-radius:20px;border:1px solid #DDE6E1;box-shadow:0 10px 36px rgba(12,36,27,.13)}
.vit .v-ec{display:grid;gap:26px}
@media(min-width:760px){.vit .v-ec{grid-template-columns:1fr 1fr}}
.vit .v-ec figure{margin:0}
.vit .v-ec img{width:100%;height:auto;border-radius:12px;border:1px solid #DDE6E1;display:block}
.vit .v-ec figcaption{font-size:.92rem;color:#4A6459;margin-top:9px}
.vit .v-et{display:grid;gap:16px;counter-reset:e}
@media(min-width:760px){.vit .v-et{grid-template-columns:repeat(3,1fr)}}
.vit .v-et div{background:#F3F7F5;border-radius:16px;padding:20px}
.vit .v-et div::before{counter-increment:e;content:counter(e);display:grid;place-items:center;width:30px;height:30px;border-radius:99px;background:var(--vv);color:#fff;font-weight:800;margin-bottom:10px}
.vit .v-et b{display:block;margin-bottom:5px}
.vit .v-et span{color:#4A6459;font-size:.95rem}
.vit .v-ab{background:#F3F7F5}
.vit .v-ab .tarifs{max-width:760px}
.vit .v-faq details{border-top:1px solid #E2EAE6;padding:16px 0}
.vit .v-faq details:last-of-type{border-bottom:1px solid #E2EAE6}
.vit .v-faq summary{font-weight:750;font-size:1.04rem;cursor:pointer;list-style:none;display:flex;gap:12px;align-items:flex-start}
.vit .v-faq summary::-webkit-details-marker{display:none}
.vit .v-faq summary::after{content:"+";margin-left:auto;font-weight:700;color:var(--vt);font-size:1.3rem;line-height:1}
.vit .v-faq details[open] summary::after{content:"–"}
.vit .v-faq p{color:#4A6459;margin:10px 0 0;line-height:1.55;max-width:46em}
.vit .v-fin{background:var(--vv);color:#fff;text-align:center}
.vit .v-fin h2{color:#fff}
.vit .v-fin .lede{color:#C5D8CE;margin-left:auto;margin-right:auto}
.vit .v-fin .bs{justify-content:center}
.vit footer{background:#091B14;color:#9FBBAE;padding:30px 0;font-size:.9rem}
.vit footer .v-w{display:grid;gap:8px}
.vit footer a{color:#fff;text-decoration:none;font-weight:600}
.vit footer .v-pt{display:flex;flex-wrap:wrap;gap:16px;margin-top:6px}
.vit footer .v-cop{color:#6E8A7D;font-size:.82rem;margin-top:10px}
@media(max-width:560px){.vit .v-hero h1{font-size:2rem}.vit h2{font-size:1.5rem}.vit section{padding:44px 0}}
`;
function styleVitrine() {
  if (document.getElementById('vitStyle')) return;
  const s = document.createElement('style'); s.id = 'vitStyle'; s.textContent = CSS; document.head.appendChild(s);
}
const waContact = () => {
  const n = typeof numeroWA === 'function' ? numeroWA(REVENDEUR.tel) : '';
  const m = 'Bonjour ' + REVENDEUR.nom + ', je voudrais des informations sur SAS STOCK pour ma boutique.';
  return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(m) : 'tel:' + REVENDEUR.tel2;
};
function pageVitrine() {
  const connexion = window.FB ? '<button class="v-bt v-g" data-a="google">Continuer avec Google</button>'
    : '<span class="v-sous">Connexion Internet nécessaire pour ouvrir votre boutique.</span>';
  return '<div class="vit">' +
    '<div class="v-nav"><div class="v-w">' + LOGO + '<b>SAS STOCK</b><span class="v-sp"></span>' +
      '<a class="v-h" href="#fonctions">Fonctions</a><a class="v-h" href="#abonnements">Abonnements</a><a class="v-h" href="#questions">Questions</a>' +
      (window.FB ? '<a class="v-b" href="#" data-a="google">Se connecter</a>' : '') + '</div></div>' +

    '<div class="v-hero"><div class="v-w">' +
      '<h1>Le stock et la caisse de votre boutique, dans votre téléphone</h1>' +
      '<p class="v-s">Vendez, suivez votre stock, sachez qui vous doit de l’argent et combien vous gagnez vraiment. Sur téléphone et sur ordinateur, même quand il n’y a pas de réseau.</p>' +
      '<div class="v-bs"><a class="v-bt v-p" href="demo.html">Essayer gratuitement</a>' + connexion + '</div>' +
      '<p class="v-sous">L’essai se fait avec une boutique d’exemple : pas de compte, pas d’engagement. Déjà client ? Connectez-vous avec le compte Google de votre boutique.</p>' +
      '<div class="v-im"><img src="' + IMG + 'tel-accueil.webp" alt="L’accueil de SAS STOCK sur un téléphone" width="560" height="1204" loading="eager"></div>' +
    '</div></div>' +
    '<div class="v-ban"><div class="v-w">Fonctionne <b>sans internet</b> · Vos données <b>sauvegardées en ligne</b> · <b>Téléphone et ordinateur</b> · Fait en <b>Côte d’Ivoire</b></div></div>' +

    '<section class="v-vid"><div class="v-w"><h2>Voir l’application en deux minutes</h2>' +
      '<p class="v-lede">Une vente du début à la fin : chercher l’article, encaisser, sortir la facture. C’est l’application réelle, filmée telle quelle.</p>' +
      '<video controls preload="none" poster="' + IMG + 'video-affiche.webp" playsinline><source src="video/demo-sas-stock.mp4" type="video/mp4">Votre navigateur ne peut pas lire cette vidéo.</video>' +
      '<p class="v-sous" style="color:#9FBBAE;font-size:.86rem;margin-top:12px">Vous préférez toucher vous-même ? <a href="demo.html" style="color:#fff">Ouvrez la démonstration</a>.</p>' +
    '</div></section>' +

    '<section id="fonctions"><div class="v-w"><h2>Ce que SAS STOCK fait pour vous</h2>' +
      '<p class="v-lede">Rien d’inutile : les quatre choses qui font perdre de l’argent dans une boutique, réglées une par une.</p>' +
      '<div class="v-fn">' + FONCTIONS.map(f =>
        '<article><div><h3>' + esc(f.t) + '</h3><p>' + esc(f.s) + '</p><ul>' + f.l.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
        '<div class="v-ph"><img src="' + IMG + f.i + '.webp" alt="' + esc(f.t) + '" width="560" height="1204" loading="lazy"></div></article>').join('') +
      '</div></div></section>' +

    '<section style="background:#F3F7F5"><div class="v-w"><h2>Et sur l’ordinateur</h2>' +
      '<p class="v-lede">Le même compte, les mêmes données, en plus grand. Voici de vraies captures du logiciel.</p>' +
      '<div class="v-ec">' + ECRANS.map(e => '<figure><img src="' + IMG + e.i + '.webp" alt="' + esc(e.t) + '" width="1100" height="690" loading="lazy"><figcaption>' + esc(e.t) + '</figcaption></figure>').join('') + '</div>' +
    '</div></section>' +

    '<section><div class="v-w"><h2>Pour commencer</h2><div class="v-et">' +
      '<div><b>Essayez</b><span>Ouvrez la démonstration et faites une vente pour voir comment ça marche.</span></div>' +
      '<div><b>Demandez votre accès</b><span>Écrivez à ' + esc(REVENDEUR.nom) + ' sur WhatsApp et choisissez votre formule.</span></div>' +
      '<div><b>Installez votre boutique</b><span>Connectez-vous avec Google, entrez vos articles (ou importez-les depuis Excel) et vendez.</span></div>' +
    '</div></div></section>' +

    '<section class="v-ab" id="abonnements"><div class="v-w"><h2>Les abonnements</h2>' +
      '<p class="v-lede">Un seul prix, toutes les fonctions comprises, sur autant d’appareils que vous voulez. Pas de commission sur vos ventes.</p>' +
      (typeof blocTarifs === 'function' ? blocTarifs(false) : '') + '</div></section>' +

    '<section class="v-faq" id="questions"><div class="v-w"><h2>Questions fréquentes</h2>' +
      QUESTIONS.map(q => '<details><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>').join('') +
    '</div></section>' +

    '<section class="v-fin"><div class="v-w"><h2>Prêt à essayer ?</h2>' +
      '<p class="v-lede">La démonstration s’ouvre tout de suite, sans compte. Si elle vous convient, ' + esc(REVENDEUR.nom) + ' active votre boutique le jour même.</p>' +
      '<div class="v-bs"><a class="v-bt v-p" href="demo.html">Essayer gratuitement</a><a class="v-bt v-l" href="' + waContact() + '" target="_blank" rel="noopener">Écrire sur WhatsApp</a></div>' +
    '</div></section>' +

    '<footer><div class="v-w"><span>SAS STOCK — gestion de stock et de caisse, par ' + esc(REVENDEUR.nom) + '</span>' +
      '<span><a href="tel:' + REVENDEUR.tel2 + '">' + esc(REVENDEUR.tel) + '</a> · <a href="mailto:' + REVENDEUR.mail + '">' + esc(REVENDEUR.mail) + '</a></span>' +
      '<div class="v-pt"><a href="demo.html">Démonstration</a><a href="telecharger.html">Télécharger l’application</a><a href="cgu.html">Conditions générales</a><a href="confidentialite.html">Politique de confidentialité</a></div>' +
      '<span class="v-cop">Version ' + VERSION + ' · Man, Côte d’Ivoire</span>' +
    '</div></footer></div>';
}
/* si la vidéo n'est pas encore en ligne, on retire simplement la section */
function verifierVideo() {
  const sec = document.querySelector('.vit .v-vid'); if (!sec) return;
  fetch('video/demo-sas-stock.mp4', { method: 'HEAD' }).then(r => { if (!r.ok) sec.remove(); }).catch(() => sec.remove());
}
const vueActivationVitrine = vueActivation;
vueActivation = function () {
  if (etat.raison !== 'compte') return vueActivationVitrine();
  styleVitrine();
  setTimeout(verifierVideo, 0);
  return pageVitrine();
};
}
