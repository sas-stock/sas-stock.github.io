/* SAS STOCK — Stock > Classement : les articles les plus vendus et ceux qui dorment */
'use strict';

const CL_PER = [['7', '7 derniers jours'], ['30', '30 derniers jours'], ['90', '3 derniers mois'], ['365', '12 derniers mois'], ['0', 'Depuis le début']];
const CL_TRI = [['qte', 'Quantité vendue'], ['ca', 'Chiffre d’affaires'], ['marge', 'Marge']];
function clBornes() {
  const n = +(S.f.clper || '30');
  return [n ? Date.now() - n * 864e5 : 0, Date.now()];
}
function derniereVente(aid) {
  let d = 0;
  C.db.ventes.forEach(v => { if (v.annule || v.date <= d) return; if (v.lignes.some(l => l.articleId === aid)) d = v.date; });
  return d;
}
function classement() {
  const b = clBornes(), R = C.rapport(b[0], b[1], admin() ? null : S.user.id), m = {};
  R.parArticle.forEach(x => { m[x.id] = x; });
  const L = C.db.articles.filter(a => a.actif !== false).map(a => {
    const s = m[a.id] || { qte: 0, ca: 0, marge: 0 };
    return { id: a.id, nom: a.nom, code: a.code || '', qte: s.qte, ca: s.ca, marge: s.marge, stock: C.qteTot(a.id), article: true };
  });
  R.parArticle.forEach(x => { if (String(x.id).indexOf('libre:') === 0) L.push({ id: x.id, nom: x.nom, code: '', qte: x.qte, ca: x.ca, marge: x.marge, stock: 0, article: false }); });
  return L;
}
function ligneCl(x, rang, tri, dormant) {
  const val = x.qte <= 0 && (tri === 'qte' || !x.ca) ? 'Aucune vente' : tri === 'qte' ? F(x.qte) + ' vendu' + (Math.abs(x.qte) > 1 ? 's' : '') : M(tri === 'marge' ? x.marge : x.ca);
  const sous = dormant && x.qte <= 0
    ? (() => { const d = x.article ? derniereVente(x.id) : 0; return d ? 'Dernière vente le ' + dj(d) : 'Jamais vendu'; })()
    : (tri === 'qte' ? M(x.ca) + (admin() ? ' · marge ' + M(x.marge) : '') : F(x.qte) + ' vendu' + (Math.abs(x.qte) > 1 ? 's' : '') + (admin() && tri === 'ca' ? ' · marge ' + M(x.marge) : ''));
  const bal = x.article ? 'button class="ligne" data-a="ficheArticle" data-id="' + x.id + '"' : 'div class="ligne"';
  return '<' + bal + '><span class="rang">' + rang + '</span><div class="f"><b>' + esc(x.nom) + '</b><span>' + esc(sous) + '</span></div>' +
    '<div class="d"><b class="n">' + val + '</b><span>' + (x.article ? 'en stock : ' + F(x.stock) : 'hors stock') + '</span></div></' + (x.article ? 'button' : 'div') + '>';
}
function contenuCl() {
  const f = S.f, tri = f.cltri || 'qte', L = classement();
  if (!C.db.articles.length) return '<div class="carte">' + vide('Aucun article', 'Créez vos articles, puis revenez voir ce qui se vend le mieux.') + '</div>';
  const vendus = L.filter(x => x.qte > 0).length;
  const cle = x => tri === 'qte' ? x.qte : tri === 'marge' ? x.marge : x.ca;
  const haut = L.slice().sort((a, b) => cle(b) - cle(a) || a.nom.localeCompare(b.nom)).filter(x => cle(x) > 0).slice(0, 20);
  const vus = new Set(haut.map(x => x.id));
  const bas = L.filter(x => x.article && !vus.has(x.id)).sort((a, b) => cle(a) - cle(b) || b.stock - a.stock || a.nom.localeCompare(b.nom)).slice(0, 20);
  const per = (CL_PER.find(p => p[0] === (f.clper || '30')) || CL_PER[1])[1].toLowerCase();
  return '<div class="rangee" style="margin-bottom:10px"><select class="f" data-ch="clper">' + CL_PER.map(p => '<option value="' + p[0] + '"' + ((f.clper || '30') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select>' +
    '<select class="f" data-ch="cltri">' + CL_TRI.filter(t => t[0] !== 'marge' || admin()).map(t => '<option value="' + t[0] + '"' + (tri === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select></div>' +
    '<p class="petit doux" style="margin:0 2px 8px">' + vendus + ' article' + (vendus > 1 ? 's' : '') + ' vendu' + (vendus > 1 ? 's' : '') + ' sur ' + L.filter(x => x.article).length + ' · ' + esc(per === 'depuis le début' ? 'depuis le début' : 'sur les ' + per) + '</p>' +
    (haut.length ? '<p class="petit doux gras" style="margin:2px 2px 6px">Les plus vendus</p><div class="liste rangs">' + haut.map((x, i) => ligneCl(x, i + 1, tri)).join('') + '</div>'
      : '<div class="carte">' + vide('Aucune vente sur cette période', 'Choisissez une période plus longue.') + '</div>') +
    (bas.length ? '<p class="petit doux gras" style="margin:18px 2px 6px">Ceux qui dorment</p><p class="petit doux" style="margin:0 2px 6px">Les moins vendus de la période. Pensez à baisser le prix, à les mettre en avant, ou à ne plus en commander.</p>' +
      '<div class="liste rangs">' + bas.map((x, i) => ligneCl(x, i + 1, tri, true)).join('') + '</div>' : '');
}
const puceCl = () => '<button class="puce' + (S.f.stab === 'classement' ? ' on' : '') + '" data-a="onglet" data-c="stab" data-k="classement">Classement</button>';
const stockClBase = V.stock;
V.stock = function () {
  const h = stockClBase().replace(/<button class="puce( on)?" data-a="onglet" data-c="stab" data-k="mouvements">/, m => puceCl() + m);
  if (S.f.stab !== 'classement') return h;
  const i = h.indexOf('</div>', h.indexOf('<div class="puces">')) + 6;
  return h.slice(0, i) + '<div id="cll">' + contenuCl() + '</div>';
};
const majCl = () => { const el = $('#cll'); if (el) el.innerHTML = contenuCl(); };
CH.clper = v => { S.f.clper = v; majCl(); };
CH.cltri = v => { S.f.cltri = v; majCl(); };
