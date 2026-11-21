/* SAS STOCK — mode démonstration (demo.html)
   Une boutique d'exemple, entièrement dans la mémoire de l'onglet : aucun compte Google,
   aucun enregistrement sur l'appareil, aucune donnée envoyée. Tout repart à zéro au rechargement.
   Ce fichier est chargé AVANT les autres ; demarrer() (ui3.js) lui passe la main. */
window.__DEMO = 1;

window.demoDemarrer = async function () {
  const mem = {};
  Store.open = async () => {};
  Store.get = async k => mem[k];
  Store.set = async (k, v) => { mem[k] = v; };
  Store.del = async k => { delete mem[k]; };
  mem.lic = { appareil: 'DEMO-0000' };
  mem.lic_demo = { fin: Date.now() + 365 * 864e5 };
  mem.sync_demo = { h: {}, last: 0, init: true }; // pas de première synchronisation à attendre
  lic = mem.lic;
  window.FB = null;
  await ouvrirCompte({ uid: 'demo', email: 'demonstration@sas-stock.com', nom: 'Démonstration' });
  const l = document.getElementById('lance'); if (l) l.remove();
  demoBoutique();
  S.user = C.db.users[0];
  S.vue = 'accueil';
  window.demoBandeau();
  rendre();
};

function demoBoutique() {
  const d = C.db = C.vide(), J = 864e5;
  d.meta.shop = { nom: 'LA RÉFÉRENCE', tel: '07 48 67 13 34', adresse: 'Man, quartier Commerce', rccm: 'CI-MAN-2026-B-1042', pied: 'Merci de votre confiance.' };
  d.users.push({ id: 'u1', nom: 'Awa', role: 'gerant', pin: '1234', actif: true }, { id: 'u2', nom: 'Moussa', role: 'caissier', pin: '1111', actif: true });
  d.depots.push({ id: 'd1', nom: 'Magasin' }, { id: 'd2', nom: 'Réserve' });
  [['f1', 'Literie'], ['f2', 'Linge de maison'], ['f3', 'Tapis'], ['f4', 'Accessoires']].forEach(x => d.familles.push({ id: x[0], nom: x[1] }));
  const art = [
    ['a1', 'Matelas mousse 2 places', 'MAT200', 'f1', 42000, 65000, 3],
    ['a2', 'Matelas mousse 1 place', 'MAT120', 'f1', 24000, 38000, 3],
    ['a3', 'Lit en bois 2 places', 'LIT200', 'f1', 85000, 130000, 2],
    ['a4', 'Drap brodé 2 places', 'DRA200', 'f2', 5500, 11000, 6],
    ['a5', 'Couverture polaire', 'COU001', 'f2', 4200, 8500, 6],
    ['a6', 'Oreiller mousse', 'ORE001', 'f2', 1400, 3500, 10],
    ['a7', 'Tapis de prière brodé', 'TAP001', 'f3', 2200, 5000, 10],
    ['a8', 'Tapis de salon 2 m', 'TAP200', 'f3', 18000, 32000, 2],
    ['a9', 'Moustiquaire imprégnée', 'MOU001', 'f4', 2600, 6000, 8],
    ['a10', 'Rideau occultant', 'RID001', 'f4', 6500, 14000, 4]
  ];
  art.forEach(x => d.articles.push({ id: x[0], nom: x[1], code: x[2], familleId: x[3], pa: x[4], pv: x[5], seuil: x[6], actif: true, unite: 'pièce' }));
  d.tiers.push({ id: 'F1', type: 'fournisseur', nom: 'Entrepôt Adjamé' }, { id: 'F2', type: 'fournisseur', nom: 'Import Sotramo' });
  ['Koné Awa', 'Traoré Ibrahim', 'Diarra Fatoumata', 'Ouattara Salif', 'Bamba Mariam', 'Hôtel Les Palmiers', 'Soro Adama', 'Cissé Aminata']
    .forEach((n, i) => d.tiers.push({ id: 'c' + i, type: 'client', nom: n, tel: '07 4' + (i + 1) + ' 22 11 0' + i }));
  const a1 = C.creerAchat({ lignes: art.slice(0, 5).map(x => ({ articleId: x[0], qte: 60, pu: x[4] })), fournisseurId: 'F1', depotId: 'd1', ref: 'BL-2210', paye: null, userId: 'u1' });
  const a2 = C.creerAchat({ lignes: art.slice(5).map(x => ({ articleId: x[0], qte: 120, pu: x[4] })), fournisseurId: 'F2', depotId: 'd1', ref: 'BL-2211', paye: null, userId: 'u1' });
  a1.date = Date.now() - 38 * J; a2.date = Date.now() - 36 * J;
  const a3 = C.creerAchat({ lignes: [{ articleId: 'a1', qte: 6, pu: 42000 }, { articleId: 'a8', qte: 4, pu: 18000 }], fournisseurId: 'F1', depotId: 'd1', ref: 'BL-2290', paye: 150000, userId: 'u1' });
  a3.date = Date.now() - 4 * J;
  let g = 7;
  const rnd = () => (g = (g * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let j = 40; j >= 1; j--) {
    for (let k = 0, n = 1 + Math.floor(rnd() * 4); k < n; k++) {
      const L = [];
      for (let i = 0, m = 1 + Math.floor(rnd() * 3); i < m; i++) {
        const a = art[Math.floor(rnd() * art.length)];
        if (!L.some(x => x.articleId === a[0])) L.push({ articleId: a[0], qte: 1 + Math.floor(rnd() * 2), pu: a[5] });
      }
      const credit = rnd() < 0.22, cli = credit || rnd() < 0.5 ? 'c' + Math.floor(rnd() * 8) : '';
      const v = C.creerVente({ lignes: L, clientId: cli, recu: credit && cli ? (rnd() < 0.5 ? 0 : 5000) : null, userId: rnd() < 0.4 ? 'u2' : 'u1', depotId: 'd1' });
      v.date = Date.now() - j * J + (8 + Math.floor(rnd() * 9)) * 36e5;
    }
  }
  [[['a1', 1, 65000], ['a6', 2, 3500]], [['a7', 3, 5000]], [['a4', 2, 11000], ['a5', 1, 8500]], [['a9', 2, 6000]], [['a2', 1, 38000], ['a6', 1, 3500]]]
    .forEach((L, i) => { const v = C.creerVente({ lignes: L.map(x => ({ articleId: x[0], qte: x[1], pu: x[2] })), clientId: i === 2 ? 'c3' : '', recu: null, userId: 'u1', depotId: 'd1' }); v.date = Date.now() - (5 - i) * 36e5; });
  d.ventes.sort((x, y) => x.date - y.date);
  const dp1 = C.depenser({ libelle: 'Transport de marchandise', categorie: 'Transport', montant: 15000, userId: 'u1' });
  const dp2 = C.depenser({ libelle: 'Électricité du mois', categorie: 'Électricité et eau', montant: 28000, userId: 'u1' });
  dp1.date = Date.now() - 9 * J; dp2.date = Date.now() - 20 * J;
  C.ajuster('a3', 'd1', 1, 'Inventaire', 'u1');
  C.ajuster('a10', 'd1', 3, 'Inventaire', 'u1');
  C.transferer('a7', 'd1', 'd2', 20, 'u1');
  C.touche();
}

/* bandeau permanent, posé en haut du contenu : on rappelle que rien n'est enregistré */
{
const n = () => typeof numeroWA === 'function' ? numeroWA(REVENDEUR.tel) : '';
const lienWA = () => {
  const num = n(), m = 'Bonjour ' + REVENDEUR.nom + ', j’ai essayé la démonstration de SAS STOCK et je voudrais l’installer dans ma boutique.';
  return num ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(m) : 'tel:' + REVENDEUR.tel2;
};
const BAN = () => '<div id="demoBan"><span><b>Démonstration</b> — boutique d’exemple. Rien n’est enregistré : tout repart à zéro si vous rechargez la page.</span>' +
  '<span class="bx"><a class="s" href="./">Retour au site</a><a class="p" href="' + lienWA() + '" target="_blank" rel="noopener">Demander mon accès</a></span></div>';
document.head.insertAdjacentHTML('beforeend', '<style>' +
  '#demoBan{background:#10261F;color:#fff;border-radius:14px;padding:12px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:.9rem;line-height:1.35}' +
  '#demoBan b{color:#F2A413}#demoBan>span:first-child{flex:1;min-width:200px}' +
  '#demoBan .bx{display:flex;gap:8px;flex-wrap:wrap}' +
  '#demoBan a{display:inline-block;padding:8px 14px;border-radius:99px;text-decoration:none;font-weight:800;font-size:.84rem;white-space:nowrap}' +
  '#demoBan a.p{background:#F2A413;color:#1A1203}#demoBan a.s{background:rgba(255,255,255,.16);color:#fff}' +
  '@media print{#demoBan{display:none}}</style>');
window.demoBandeau = function () { // appelé par demoDemarrer, une fois tous les scripts chargés
  const rendreDemoBase = rendre;
  rendre = function () {
    rendreDemoBase();
    const m = document.querySelector('#app main');
    if (m && !document.getElementById('demoBan')) m.insertAdjacentHTML('afterbegin', BAN());
  };
  etatSyncTexte = () => 'Mode démonstration';
};
}
