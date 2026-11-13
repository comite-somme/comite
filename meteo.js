/* meteo.js — météo prévue du lieu et de l'heure d'une compétition (fenêtre du calendrier).
   Source : Open-Meteo (gratuit, sans clé). Prévisions disponibles jusqu'à 15 jours avant la date.
   Aucune donnée personnelle envoyée : seulement le nom de la commune et la date. */
(function () {
  var box = document.getElementById('cal-modal-content');
  if (!box) return;

  var GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  var API = 'https://api.open-meteo.com/v1/forecast';
  var HORIZON = 15; /* jours de prévision disponibles */
  var cache = {};   /* lieu → coordonnées ; "lieu|date" → prévisions */

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };

  /* Codes météo OMM → libellé + pictogramme */
  var WMO = {
    0: ['Grand soleil', '☀️'], 1: ['Plutôt dégagé', '🌤️'], 2: ['Éclaircies', '⛅'], 3: ['Couvert', '☁️'],
    45: ['Brouillard', '🌫️'], 48: ['Brouillard givrant', '🌫️'],
    51: ['Bruine légère', '🌦️'], 53: ['Bruine', '🌦️'], 55: ['Bruine forte', '🌧️'], 56: ['Bruine verglaçante', '🌧️'], 57: ['Bruine verglaçante', '🌧️'],
    61: ['Pluie faible', '🌦️'], 63: ['Pluie', '🌧️'], 65: ['Pluie forte', '🌧️'], 66: ['Pluie verglaçante', '🌧️'], 67: ['Pluie verglaçante', '🌧️'],
    71: ['Neige faible', '🌨️'], 73: ['Neige', '🌨️'], 75: ['Neige forte', '❄️'], 77: ['Grésil', '🌨️'],
    80: ['Averses faibles', '🌦️'], 81: ['Averses', '🌧️'], 82: ['Fortes averses', '⛈️'], 85: ['Averses de neige', '🌨️'], 86: ['Fortes averses de neige', '❄️'],
    95: ['Orage', '⛈️'], 96: ['Orage et grêle', '⛈️'], 99: ['Orage et grêle', '⛈️']
  };

  var ICO = {
    temp: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    rain: '<path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    wind: '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>'
  };
  var ico = function (n) { return '<svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">' + ICO[n] + '</svg>'; };

  /* Noms de lieux du calendrier → noms de communes (« Feuquières (Boulodrome) », « ASPTT Amiens », « Roye et Friville »…) */
  function candidates(lieu) {
    var raw = String(lieu || ''), out = [];
    var dept = (/\((\d{2}|2A|2B)\)/i.exec(raw) || [])[1] || '';
    var parens = []; raw.replace(/\(([^)]*)\)/g, function (_, p) { if (!/^\d{2}$|^2[AB]$/i.test(p.trim())) parens.push(p); });
    var base = raw.replace(/\([^)]*\)/g, ' ').replace(/…|\.\.\./g, ' ');
    base = base.split(/\s+et\s+|\s*\/\s*/i)[0];
    base = base.replace(/\b(ASPTT|Boulodrome|Parc des Expositions|Esplanade)\b/gi, ' ')
      .replace(/\bSt\b\.?/gi, 'Saint').replace(/\bSte\b\.?/gi, 'Sainte').replace(/\s+/g, ' ').trim();
    if (base) out.push(base);
    parens.forEach(function (p) { p = p.trim(); if (p) out.push(p); });
    return { names: out.filter(function (n, i) { return n.length > 1 && out.indexOf(n) === i; }), dept: dept };
  }

  function pick(results, dept) {
    if (!results || !results.length) return null;
    var score = function (r) {
      var cp = (r.postcodes && r.postcodes[0]) || '';
      if (dept) return cp.indexOf(dept) === 0 ? 3 : 0;
      if (cp.indexOf('80') === 0) return 3;               /* Somme d'abord */
      if (r.admin1 === 'Hauts-de-France') return 2;
      return 1;
    };
    return results.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }

  function locate(lieu) {
    if (cache[lieu]) return cache[lieu];
    var c = candidates(lieu);
    cache[lieu] = c.names.reduce(function (p, name) {
      return p.then(function (found) {
        if (found) return found;
        return fetch(GEO + '?name=' + encodeURIComponent(name) + '&count=10&language=fr&format=json&countryCode=FR')
          .then(function (r) { return r.ok ? r.json() : {}; })
          .then(function (j) { var r = pick(j.results, c.dept); return r ? { lat: r.latitude, lon: r.longitude, nom: r.name } : null; });
      });
    }, Promise.resolve(null));
    return cache[lieu];
  }

  function forecast(pos, date) {
    var k = pos.lat + ',' + pos.lon + '|' + date;
    if (cache[k]) return cache[k];
    var url = API + '?latitude=' + pos.lat + '&longitude=' + pos.lon +
      '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
      '&timezone=Europe%2FParis&start_date=' + date + '&end_date=' + date;
    cache[k] = fetch(url).then(function (r) { if (!r.ok) throw new Error('meteo'); return r.json(); });
    return cache[k];
  }

  function startHour(heure) {
    var m = /(\d{1,2})\s*[hH:]\s*(\d{2})?/.exec(heure || '');
    return m && +m[1] < 24 ? +m[1] : null;
  }

  function daysFromToday(date) {
    var p = date.split('-').map(Number), t = new Date();
    return Math.round((new Date(p[0], p[1] - 1, p[2]) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
  }

  function conseil(t, rain, wind, code) {
    if (code >= 95) return '⛈️ Orage possible : prudence, suivez les consignes de l’organisateur.';
    if (rain >= 50) return '☔ Pluie probable : prévoyez un coupe-vent et de quoi vous abriter.';
    if (wind >= 40) return '💨 Vent soutenu : il peut gêner les lancers.';
    if (t >= 28) return '🥵 Forte chaleur : pensez à vous hydrater et à vous protéger du soleil.';
    if (t <= 3) return '🧥 Temps froid : prévoyez des vêtements chauds et des gants.';
    return '';
  }

  function render(el, lieuNom, e) {
    var d = e.daily, h = e.hourly, hr = startHour(el.dataset.heure);
    var i = hr != null && h && h.time && h.time.length > hr ? hr : null;
    var code = i != null ? h.weather_code[i] : d.weather_code[0];
    var t = Math.round(i != null ? h.temperature_2m[i] : d.temperature_2m_max[0]);
    var pluie = i != null && h.precipitation_probability[i] != null ? h.precipitation_probability[i] : d.precipitation_probability_max[0];
    var vent = Math.round(i != null ? h.wind_speed_10m[i] : d.wind_speed_10m_max[0]);
    var w = WMO[code] || ['Variable', '🌡️'];
    var quand = i != null ? 'à ' + pad(i) + 'h' : 'dans la journée';
    var tip = conseil(t, pluie || 0, vent, code);
    el.innerHTML =
      '<div class="ev-info">' +
        '<div class="ev-i"><span class="wx" aria-hidden="true">' + w[1] + '</span><div><small>Météo · ' + esc(quand) + '</small><b>' + esc(w[0]) + '</b></div></div>' +
        '<div class="ev-i">' + ico('temp') + '<div><small>Température</small><b>' + t + '° <span class="wx-sub">(' + Math.round(d.temperature_2m_min[0]) + '° / ' + Math.round(d.temperature_2m_max[0]) + '°)</span></b></div></div>' +
        '<div class="ev-i">' + ico('rain') + '<div><small>Risque de pluie</small><b>' + (pluie == null ? '—' : pluie + ' %') + '</b></div></div>' +
        '<div class="ev-i">' + ico('wind') + '<div><small>Vent</small><b>' + vent + ' km/h</b></div></div>' +
      '</div>' +
      (tip ? '<div class="ev-obs">' + esc(tip) + '</div>' : '') +
      '<div class="wx-src">Prévisions pour ' + esc(lieuNom) + ' · Open-Meteo</div>';
    el.classList.add('ok');
  }

  function note(el, txt) {
    el.innerHTML = '<div class="ev-obs wx-note">🌦️ ' + esc(txt) + '</div>';
    el.classList.add('ok');
  }

  function fill(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var date = el.dataset.date, lieu = el.dataset.lieu;
    var n = daysFromToday(date);
    if (n < 0) return;                     /* compétition passée : rien à afficher */
    if (n > HORIZON) { note(el, 'Prévisions météo disponibles à partir de 15 jours avant la compétition.'); return; }
    el.innerHTML = '<div class="wx-load">Chargement de la météo…</div>';
    el.classList.add('ok');
    locate(lieu).then(function (pos) {
      if (!pos) { el.innerHTML = ''; el.classList.remove('ok'); return; }
      return forecast(pos, date).then(function (j) {
        if (!j || !j.daily || !j.daily.time || !j.daily.time.length) { el.innerHTML = ''; el.classList.remove('ok'); return; }
        render(el, pos.nom, j);
      });
    }).catch(function () { el.innerHTML = ''; el.classList.remove('ok'); }); /* hors ligne / service indisponible : on n'affiche rien */
  }

  function scan() { box.querySelectorAll('.ev-meteo:not([data-done])').forEach(fill); }
  new MutationObserver(scan).observe(box, { childList: true, subtree: true });
  scan();
})();
