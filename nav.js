/* nav.js — menu hamburger (tiroir à gauche) partagé par toutes les pages.
   Pour ajouter/retirer une rubrique : modifier uniquement la liste PAGES ci-dessous. */
(function () {
  var PAGES = [
    { href: 'index.html',          label: 'Accueil',         icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>' },
    { href: 'comite.html',         label: 'Le Comité',       icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>' },
    { href: 'clubs.html',          label: 'Les Clubs',       icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
    { href: 'calendrier.html',     label: 'Calendrier',      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    { href: 'championnats.html',   label: 'Championnats',    icon: '<path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 3h12v6a6 6 0 0 1-12 0z"/><path d="M12 15v4M8 21h8"/>' },
    { href: 'cdc.html',            label: 'Champ. des Clubs',icon: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>' },
    { href: 'classement.html',     label: 'Classements',     icon: '<path d="M18 20V10M12 20V4M6 20v-6"/>' },
    { href: 'coupe-de-france.html', label: 'Coupe de France', icon: '<circle cx=\"12\" cy=\"8\" r=\"6\"/><path d=\"M15.5 13L17 22l-5-3-5 3 1.5-9\"/>' },
    { href: 'documentations.html', label: 'Documentations',  icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V22h16"/>' },
    { href: 'annuaire.html',       label: 'Annuaire',        icon: '<path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="10" r="2.5"/><path d="M7.5 16c.6-2 2.4-3 4.5-3s3.9 1 4.5 3"/>' },
    { href: 'archives.html',       label: 'Archives',        icon: '<path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><path d="M10 12h4"/>' },
    { href: 'index.html#contact',  label: 'Contact',         icon: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M22 6l-10 7L2 6"/>', noActive: true },
    { href: 'confidentialite.html',label: 'Confidentialité', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' }
  ];

  var ham = document.getElementById('hamburger');
  var bar = document.getElementById('navbar');
  if (!ham || !bar) return;

  var current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Bouton à gauche (comme l'admin), puis le logo
  bar.insertBefore(ham, bar.firstChild);
  ham.setAttribute('aria-controls', 'drawer');
  ham.setAttribute('aria-expanded', 'false');
  ham.setAttribute('aria-label', 'Ouvrir le menu');

  var items = PAGES.map(function (p) {
    var on = !p.noActive && p.href.toLowerCase() === current;
    return '<a href="' + p.href + '"' + (on ? ' class="on" aria-current="page"' : '') + '>' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p.icon + '</svg>' +
      '<span>' + p.label + '</span></a>';
  }).join('');

  var scrim = document.createElement('div');
  scrim.id = 'nav-scrim';
  scrim.hidden = true;

  var drawer = document.createElement('nav');
  drawer.id = 'drawer';
  drawer.setAttribute('aria-label', 'Menu principal');
  drawer.setAttribute('inert', '');
  drawer.innerHTML =
    '<div class="dh"><b>Menu</b><button id="dclose" type="button" aria-label="Fermer le menu">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="dlinks">' + items + '</div>';

  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  function isOpen() { return drawer.classList.contains('open'); }
  function setOpen(open) {
    drawer.classList.toggle('open', open);
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', String(open));
    ham.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    scrim.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { drawer.removeAttribute('inert'); (drawer.querySelector('.on') || drawer.querySelector('a')).focus(); }
    else drawer.setAttribute('inert', '');
  }

  ham.addEventListener('click', function () { setOpen(!isOpen()); });
  document.getElementById('dclose').addEventListener('click', function () { setOpen(false); ham.focus(); });
  scrim.addEventListener('click', function () { setOpen(false); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); ham.focus(); }
  });
  // Boutons de page qui ouvrent le menu
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-menu]');
    if (t) { e.preventDefault(); setOpen(true); }
  });
})();
