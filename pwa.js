/* PWA — enregistrement du service worker + bouton « Installer l'application » */
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    /* quand une nouvelle version du site prend la main, on recharge une fois pour l'afficher tout de suite */
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return; reloaded = true; location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
        /* vérifie s'il existe une nouvelle version du service worker à chaque retour dans l'app */
        document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function (e) { console.warn('SW indisponible', e); });
    });
  }

  var isAdmin = /admin\.html$/i.test(location.pathname);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var DELAY = 14 * 24 * 3600 * 1000;                      /* la pastille réapparaît après 2 semaines */
  var K_INST = isAdmin ? 'pwaInstalledAdmin' : 'pwaInstalled', K_HIDE = isAdmin ? 'pwaHideAtAdmin' : 'pwaHideAt';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  if (standalone) { ls(K_INST, '1'); return; }            /* app ouverte en mode application = installée */
  if (ls(K_INST)) return;                                 /* déjà installée : on ne l'affiche plus jamais */
  var hideAt = parseInt(ls(K_HIDE) || '0', 10);
  if (hideAt && Date.now() - hideAt < DELAY) return;      /* fermée il y a moins de 2 semaines */

  var deferred = null;
  var label = isAdmin ? "Installer l'admin" : "Installer l'application";

  function bar(html, onclick) {
    if (document.getElementById('pwaBar')) return;
    var b = document.createElement('div');
    b.id = 'pwaBar';
    b.setAttribute('role', 'region');
    b.setAttribute('aria-label', 'Installation de l\'application');
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:.4rem;background:#0a2342;color:#fff;border:1.5px solid #c9a84c;border-radius:30px;padding:.35rem .4rem .35rem 1rem;box-shadow:0 6px 24px rgba(0,0,0,.35);font:600 .88rem "DM Sans",system-ui,sans-serif;max-width:calc(100vw - 24px)';
    b.innerHTML = '<span style="flex:1;min-width:0">' + html + '</span>' +
      (onclick ? '<button type="button" id="pwaGo" style="min-height:40px;border:0;border-radius:24px;background:#c9a84c;color:#0a2342;font:700 .85rem inherit;font-family:inherit;padding:0 1rem;cursor:pointer">Installer</button>' : '') +
      '<button type="button" id="pwaX" aria-label="Fermer" style="min-width:40px;min-height:40px;border:0;background:none;color:#fff;font-size:1.4rem;cursor:pointer">&times;</button>';
    document.body.appendChild(b);
    document.getElementById('pwaX').onclick = function () { ls(K_HIDE, String(Date.now())); b.remove(); };
    if (onclick) document.getElementById('pwaGo').onclick = onclick;
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    bar(label, function () {
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r && r.outcome === 'accepted') ls(K_INST, '1'); }).finally(function () { deferred = null; var b = document.getElementById('pwaBar'); if (b) b.remove(); });
    });
  });
  window.addEventListener('appinstalled', function () { ls(K_INST, '1'); var b = document.getElementById('pwaBar'); if (b) b.remove(); });

  /* iPhone / iPad : pas d'invite automatique, on explique le geste */
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    window.addEventListener('load', function () {
      setTimeout(function () { bar('Pour installer : touche <b>Partager</b> puis <b>Sur l\'écran d\'accueil</b>'); }, 2500);
    });
  }
})();


/* Bandeau « hors connexion » : les données déjà consultées restent affichées */
(function () {
  function show(on) {
    var b = document.getElementById('offBar');
    if (!on) { if (b) b.remove(); return; }
    if (b || !document.body) return;
    b = document.createElement('div'); b.id = 'offBar'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:#c9a84c;color:#0a2342;text-align:center;font:600 .8rem "DM Sans",system-ui,sans-serif;padding:calc(.3rem + env(safe-area-inset-top,0px)) .6rem .3rem';
    b.textContent = 'Hors connexion — affichage des dernières données enregistrées';
    document.body.appendChild(b);
  }
  window.addEventListener('offline', function () { show(true); });
  window.addEventListener('online', function () { show(false); });
  show(!navigator.onLine);
})();
