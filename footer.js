/* footer.js — pied de page commun à toutes les pages du site.
   Pour modifier un lien ou un texte du bas de page, ou changer l'année du calendrier : modifier ce seul fichier. */
(function () {
  var SAISON = 2027; /* année affichée dans « Calendrier … » */
  var an = new Date().getFullYear();
  var el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML =
    '<div class="footer-inner">' +
      '<div class="footer-brand">' +
        '<img src="logocomite.png" alt="Logo Comité de la Somme">' +
        '<p>Comité Départemental de la Somme (80) — Fédération Française de Pétanque et Jeu Provençal. Toutes les informations et résultats sur la pétanque de notre département.</p>' +
      '</div>' +
      '<div><h5>Rubriques</h5><ul class="footer-links">' +
        '<li><a href="comite.html">Le Comité</a></li>' +
        '<li><a href="clubs.html">Les Clubs</a></li>' +
        '<li><a href="calendrier.html">Calendrier ' + SAISON + '</a></li>' +
        '<li><a href="championnats.html">Championnats</a></li>' +
        '<li><a href="classement.html">Classements</a></li>' +
        '<li><a href="resultats.html">Résultats</a></li>' +
        '<li><a href="tirages.html">Tirages</a></li>' +
        '<li><a href="coupe-de-france.html">Coupe de France</a></li>' +
      '</ul></div>' +
      '<div><h5>Liens utiles</h5><ul class="footer-links">' +
        '<li><a href="annuaire.html">Annuaire</a></li>' +
        '<li><a href="documentations.html">Documentations</a></li>' +
        '<li><a href="archives.html">Archives</a></li>' +
        '<li><a href="index.html#contact">Contact</a></li>' +
        '<li><a href="confidentialite.html">Confidentialité</a></li>' +
      '</ul></div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '<span>© ' + an + ' Comité de la Somme FFPJP — 80000 Amiens · <a href="confidentialite.html">Confidentialité</a></span>' +
      '<span>Contact : <a href="mailto:CD80@petanque.fr">CD80@petanque.fr</a></span>' +
    '</div>';
})();
