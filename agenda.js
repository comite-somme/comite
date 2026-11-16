/* agenda.js — « Ajouter à mon agenda » (.ics) : bouton global + bouton dans la fenêtre d'une compétition */
const pad = n => String(n).padStart(2, '0');
const txt = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = l => { const o = []; while (l.length > 60) { o.push(l.slice(0, 60)); l = ' ' + l.slice(60); } o.push(l); return o; };
const heure = h => { const m = /(\d{1,2})\s*[hH:]\s*(\d{2})?/.exec(h || ''); return m && +m[1] < 20 ? [+m[1], +(m[2] || 0)] : null; };
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const stamp = () => { const n = new Date(); return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`; };
const fd = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`;
const fdt = x => `${fd(x)}T${pad(x.getHours())}${pad(x.getMinutes())}00`;

function vevent(e) {
  const [y, m, d] = String(e.date || '').split('-').map(Number);
  if (!y || !m || !d) return [];
  const t = heure(e.heure), L = ['BEGIN:VEVENT', `UID:${e.date}-${slug(e.titre)}@cd80-petanque`, `DTSTAMP:${stamp()}`];
  if (t) L.push(`DTSTART:${fdt(new Date(y, m - 1, d, t[0], t[1]))}`, `DTEND:${fdt(new Date(y, m - 1, d, t[0] + 4, t[1]))}`);
  else L.push(`DTSTART;VALUE=DATE:${fd(new Date(y, m - 1, d))}`, `DTEND;VALUE=DATE:${fd(new Date(y, m - 1, d + 1))}`);
  L.push(`SUMMARY:${txt([e.titre, e.formation].filter(Boolean).join(' — '))}`);
  if (e.lieu) L.push(`LOCATION:${txt(e.lieu)}`);
  const desc = [e.formation && 'Formation : ' + e.formation, e.obs, e.lien, e.lien2].filter(Boolean).join('\n');
  if (desc) L.push(`DESCRIPTION:${txt(desc)}`);
  L.push('END:VEVENT');
  return L;
}

export function buildIcs(list) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Comité de la Somme de pétanque//Calendrier//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Comité de la Somme de pétanque'];
  list.forEach(e => L.push(...vevent(e)));
  L.push('END:VCALENDAR');
  return L.flatMap(fold).join('\r\n') + '\r\n';
}

function download(list, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildIcs(list)], { type: 'text/calendar;charset=utf-8' }));
  a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

if (typeof document !== 'undefined' && document.querySelector) {
  const $ = (s, r = document) => r.querySelector(s);
  const evs = () => (window.CMS_CAL && window.CMS_CAL.EVENTS) || [];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const bar = $('.dl-btns');
  if (bar) {
    bar.insertAdjacentHTML('beforeend', '<button type="button" id="icsAll" class="dl-btn dl-btn-or">📅 Ajouter tout le calendrier à mon agenda</button>');
    $('#icsAll').onclick = () => {
      const l = evs().filter(e => e.date);
      if (!l.length) return alert('Le calendrier est en cours de chargement, réessayez dans un instant.');
      download(l, 'calendrier-cd80.ics');
    };
  }

  const addButtons = root => {
    root.querySelectorAll('[data-ev-date]').forEach(el => {
      if (el.querySelector('.ics-btn')) return;
      const e = evs().find(x => x.date === el.dataset.evDate && x.titre === el.dataset.evTitre);
      if (!e) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ics-btn'; b.textContent = '📅 Ajouter à mon agenda';
      b.onclick = () => download([e], (slug(e.titre) || 'competition') + '.ics');
      const links = el.querySelector('.cal-links');
      links ? el.insertBefore(b, links) : el.append(b);
    });
  };
  ['cal-modal-content', 'cal-list'].forEach(id => {
    const box = document.getElementById(id);
    if (!box) return;
    new MutationObserver(() => addButtons(box)).observe(box, { childList: true, subtree: true });
    addButtons(box);
  });
}
