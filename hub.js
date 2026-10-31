/* hub.js — page à 2 niveaux de boutons (partie → rubrique) alimentée par Firestore.
   Chaque document porte un champ « section » = "<partie>-<rubrique>" (ex : dep-tirages),
   choisi dans l'admin. Il peut contenir du texte, un lien (PDF…) et/ou un tableau Excel. */
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^(https?:\/\/|mailto:|[\w\-./]+\.\w+$)/i.test(u || '') ? u : '';
const fdate = j => j ? new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fix = c => String(c ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const count = (n, m) => `${n} ${m}${n > 1 ? 's' : ''}`;

export function initHub(cfg) {
  const root = $(cfg.root);
  let docs = [], failed = false, cur = null;
  const fromHash = () => {
    const h = location.hash.slice(1), g = cfg.groups.find(x => h.startsWith(x.k + '-')) || cfg.groups[0];
    const r = g.rubriques.find(x => h === g.k + '-' + x.k) || g.rubriques[0];
    return { g: g.k, r: r.k };
  };
  let st = fromHash();

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="tbDlg" aria-labelledby="tbT"><div class="tb-in">
      <div class="tb-head"><h2 id="tbT"></h2><button type="button" class="tb-x" id="tbClose" aria-label="Fermer">&times;</button></div>
      <div class="tb-bar"><select id="tbS" aria-label="Choisir la feuille"></select>
        <input id="tbQ" type="search" placeholder="Rechercher dans le tableau…" aria-label="Rechercher dans le tableau">
        <button type="button" class="hub-act" id="tbDl">Télécharger en Excel</button></div>
      <div class="tb-wrap" id="tbW"></div></div></dialog>`);

  function draw() {
    const g = cfg.groups.find(x => x.k === st.g), r = g.rubriques.find(x => x.k === st.r);
    root.innerHTML = `
      <p class="hub-label">${esc(cfg.label)}</p>
      <div class="hub-groups" role="tablist" aria-label="${esc(cfg.label)}">${cfg.groups.map(x => `<button type="button" class="hub-g" role="tab" data-g="${x.k}" aria-selected="${x.k === st.g}">${esc(x.titre)}</button>`).join('')}</div>
      <div class="hub-subs" role="tablist" aria-label="Rubriques">${g.rubriques.map(x => `<button type="button" class="hub-s" role="tab" data-r="${x.k}" aria-selected="${x.k === st.r}">${esc(x.titre)}</button>`).join('')}</div>
      <div class="hub-panel" role="tabpanel"><header><h2><small>${esc(g.titre)}</small>${esc(r.titre)}</h2></header><div class="hub-body">${body()}</div></div>`;
  }

  function body() {
    const l = docs.filter(x => x.section === st.g + '-' + st.r);
    if (!l.length) return `<div class="hub-empty">${failed ? 'Cette rubrique est momentanément indisponible.' : 'Rien de publié pour le moment.'}</div>`;
    const grp = {}; l.forEach(x => (grp[x.saison || 'Sans saison'] ||= []).push(x));
    return Object.keys(grp).sort((a, b) => b.localeCompare(a, 'fr')).map(k => `<div class="hub-yr">${esc(k)}</div>` +
      grp[k].sort((a, b) => (b.jour || '').localeCompare(a.jour || '') || (a.ordre ?? 99) - (b.ordre ?? 99)).map(x => {
        const n = (x.feuilles || []).length, u = safeUrl(x.lien), meta = [fdate(x.jour), x.lieu].filter(Boolean).map(esc).join(' · ');
        const acts = (n ? `<button type="button" class="hub-act" data-open="${x._i}">Consulter le tableau</button>` : '') +
          (u ? `<a class="hub-act${n ? ' alt' : ''}" href="${esc(u)}" target="_blank" rel="noopener">${esc(x.lienTexte || 'Consulter')}</a>` : '');
        return `<div class="hub-doc"><b>${esc(x.titre)}</b>${meta ? `<small>${meta}</small>` : ''}${x.description ? `<div class="txt">${esc(x.description)}</div>` : ''}${acts ? `<div class="hub-acts">${acts}</div>` : ''}</div>`;
      }).join('')).join('');
  }

  root.addEventListener('click', e => {
    const g = e.target.closest('[data-g]'), r = e.target.closest('[data-r]'), o = e.target.closest('[data-open]');
    if (o) return openTable(docs[+o.dataset.open]);
    if (g) st = { g: g.dataset.g, r: cfg.groups.find(x => x.k === g.dataset.g).rubriques[0].k };
    else if (r) st.r = r.dataset.r; else return;
    history.replaceState(null, '', '#' + st.g + '-' + st.r); draw();
  });
  window.addEventListener('hashchange', () => { st = fromHash(); draw(); });

  /* ── Fenêtre du tableau ── */
  function clean(s) {
    const cols = (s.colonnes || []).map(fix), rows = (s.lignes || []).map(r => r.v.map(fix));
    const keep = cols.map((c, i) => c || rows.some(r => r[i]));
    return { cols: cols.filter((_, i) => keep[i]), rows: rows.map(r => r.filter((_, i) => keep[i])).filter(r => r.some(Boolean)) };
  }
  function sheet() {
    const s = cur.feuilles[+$('#tbS').value] || cur.feuilles[0], q = $('#tbQ').value.toLowerCase().trim(), d = clean(s);
    const l = d.rows.filter(r => !q || r.join(' ').toLowerCase().includes(q));
    $('#tbW').innerHTML = `<table><thead><tr>${d.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
      l.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') + `</tbody></table><p class="tb-n">${count(l.length, 'ligne')}${q ? ' trouvée' + (l.length > 1 ? 's' : '') : ''}</p>`;
  }
  function openTable(x) {
    cur = x; $('#tbT').textContent = x.titre; $('#tbQ').value = '';
    $('#tbS').innerHTML = x.feuilles.map((s, i) => `<option value="${i}">${esc(s.nom)}</option>`).join('');
    $('#tbS').hidden = x.feuilles.length < 2;
    sheet(); $('#tbW').scrollTop = 0; $('#tbDlg').showModal();
  }
  const loadX = () => window.XLSX ? Promise.resolve() : new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = () => ko(new Error('x')); document.head.append(s); });
  async function download() {
    const b = $('#tbDl'); b.disabled = true;
    try {
      await loadX(); const wb = XLSX.utils.book_new(), used = new Set();
      cur.feuilles.forEach((s, i) => {
        const n = (String(s.nom || '').replace(/[:\\/?*\[\]]/g, ' ').trim().slice(0, 28)) || 'Feuille ' + (i + 1); let k = n, j = 2;
        while (used.has(k.toLowerCase())) k = n + ' ' + j++; used.add(k.toLowerCase());
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.colonnes, ...s.lignes.map(l => l.v)]), k);
      });
      XLSX.writeFile(wb, (cur.titre || cfg.col).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.xlsx');
    } catch { alert('Téléchargement impossible : vérifie ta connexion.'); }
    finally { b.disabled = false; }
  }
  $('#tbS').oninput = sheet; $('#tbQ').oninput = sheet; $('#tbDl').onclick = download;
  $('#tbClose').onclick = () => $('#tbDlg').close();
  $('#tbDlg').onclick = e => { if (e.target === $('#tbDlg')) $('#tbDlg').close(); };

  draw();
  getDocs(collection(db, cfg.col))
    .then(s => { docs = s.docs.map(d => d.data()).map((x, i) => ({ ...x, _i: i })); draw(); })
    .catch(() => { failed = true; draw(); });
}
