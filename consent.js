/* SAS STOCK — consentement et mesure d'audience.
   La mesure d'audience (Cloudflare Web Analytics : sans cookie, sans publicité) ne se charge
   qu'après « Accepter ». Le stockage nécessaire à l'application (connexion, données hors ligne)
   n'a pas besoin d'accord. Laisser CF_JETON vide désactive toute mesure. */
(function () {
  'use strict';
  var CF_JETON = '5273129ed97d42c4a36fd1e42d0ca612';
  var CLE = 'sasConsentement';

  function lire() { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } }
  function ecrire(v) { try { localStorage.setItem(CLE, JSON.stringify({ v: v, le: Date.now() })); } catch (e) {} }

  function mesurer() {
    if (!CF_JETON || document.getElementById('cfBeacon')) return;
    if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return;
    var s = document.createElement('script');
    s.id = 'cfBeacon'; s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_JETON, spa: true }));
    document.head.appendChild(s);
  }

  var CSS = '#sasCookies{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9999;' +
    'max-width:560px;margin:0 auto;background:#10261F;color:#fff;border-radius:16px;padding:16px 18px;' +
    'box-shadow:0 12px 40px rgba(0,0,0,.35);font:14.5px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#sasCookies p{margin:0 0 12px;color:#DCE8E1}' +
    '#sasCookies a{color:#fff;font-weight:700}' +
    '#sasCookies .sc-b{display:flex;gap:10px;flex-wrap:wrap}' +
    '#sasCookies button{flex:1 1 120px;border:0;border-radius:99px;padding:11px 16px;font:inherit;font-weight:800;cursor:pointer}' +
    '#sasCookies .sc-non{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45)}' +
    '#sasCookies .sc-oui{background:#F2A413;color:#1A1203}' +
    '#sasCookies button:focus-visible{outline:3px solid #F2A413;outline-offset:2px}';

  function fermer() { var b = document.getElementById('sasCookies'); if (b) b.remove(); }

  function bandeau() {
    if (document.getElementById('sasCookies')) return;
    if (!document.getElementById('sasCookiesStyle')) {
      var st = document.createElement('style'); st.id = 'sasCookiesStyle'; st.textContent = CSS; document.head.appendChild(st);
    }
    var b = document.createElement('div');
    b.id = 'sasCookies'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Cookies et mesure d’audience');
    b.innerHTML = '<p>Nous gardons seulement ce qui fait marcher SAS STOCK (connexion, données hors ligne). ' +
      'Avec votre accord, nous comptons aussi les visites du site, sans cookie publicitaire. ' +
      '<a href="/confidentialite.html#cookies">En savoir plus</a></p>' +
      '<div class="sc-b"><button type="button" class="sc-non">Refuser</button><button type="button" class="sc-oui">Accepter</button></div>';
    b.querySelector('.sc-non').addEventListener('click', function () { ecrire('non'); fermer(); });
    b.querySelector('.sc-oui').addEventListener('click', function () { ecrire('oui'); fermer(); mesurer(); });
    document.body.appendChild(b);
    /* le visiteur se connecte à sa boutique : le bandeau s'efface sans rien décider, il reviendra sur le site */
    if (document.getElementById('app')) {
      var t = setInterval(function () {
        if (!document.getElementById('sasCookies')) return clearInterval(t);
        if (!document.querySelector('.vit')) { clearInterval(t); fermer(); }
      }, 500);
    }
  }

  /* lien « Gérer les cookies » : rouvre le bandeau */
  window.sasCookies = function () { bandeau(); var o = document.querySelector('#sasCookies .sc-oui'); if (o) o.focus(); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cookies]');
    if (a) { e.preventDefault(); window.sasCookies(); }
  });

  /* Le bandeau ne s'affiche que sur les pages du site (accueil visiteur, téléchargement, conditions…),
     jamais par-dessus l'application d'une boutique connectée ni par-dessus la démonstration. */
  function pageDuSite() {
    if (document.getElementById('app')) return !!document.querySelector('.vit');
    return !document.querySelector('.nav');
  }
  function demarrer() {
    var c = lire();
    if (c && c.v === 'oui') { mesurer(); return; }
    if (c) return;
    var essais = 0;
    (function attendre() {
      if (pageDuSite()) return bandeau();
      if (document.getElementById('app') && ++essais < 20) setTimeout(attendre, 500);
    })();
  }
  function lancer() { setTimeout(demarrer, 900); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
})();
