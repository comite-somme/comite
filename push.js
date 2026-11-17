/* push.js — fenêtre « NOTIFICATIONS » (Firebase Cloud Messaging).
   N'apparaît que si l'admin a activé l'option (Infos du site › Notifications push) et saisi la clé VAPID,
   uniquement dans l'application installée, et une fois par mois (y compris pour ceux qui ont déjà activé,
   afin qu'ils confirment s'ils veulent toujours recevoir les notifications). */
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/', KEY = 'pushToken', ASK = 'pushAskAt', REC = 'pushRecAt', SINCE = 'pushSince';
const DAY = 24 * 3600 * 1000, MONTH = 30 * DAY;
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

async function messaging() {
  const { getApp } = await import(SDK + 'firebase-app.js');
  const { getMessaging, getToken, deleteToken } = await import(SDK + 'firebase-messaging.js');
  return { m: getMessaging(getApp()), getToken, deleteToken };
}

(async () => {
  try {
    if (!('serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    if (/admin(\.html)?\/?$/i.test(location.pathname)) return;
    /* la fenêtre n'existe que dans l'application installée, jamais dans le navigateur */
    const inApp = ['standalone', 'window-controls-overlay'].some(m => { try { return matchMedia('(display-mode: ' + m + ')').matches; } catch (e) { return false; } })
      || navigator.standalone === true
      || (() => { try { if (/[?&]source=pwa\b/.test(location.search)) sessionStorage.setItem('inPwa', '1'); return !!sessionStorage.getItem('inPwa'); } catch (e) { return false; } })();
    if (!inApp) return;
    const s = (await getDoc(doc(db, 'settings', 'general'))).data() || {};
    const vapidKey = String(s.vapidKey || '').trim();
    if (!s.pushActif || !vapidKey) return;                 // option coupée dans l'admin : rien n'est affiché
    if (Notification.permission === 'denied') return;      // bloquées dans le navigateur : impossible de les réactiver d'ici

    const isOn = () => Notification.permission === 'granted' && !!ls(KEY);
    /* Compteur de l'admin : le jeton est enregistré (ou rafraîchi) dans la base. creeLe = 1re activation sur cet appareil. */
    const rec = t => setDoc(doc(db, 'push_tokens', t), { token: t, creeLe: parseInt(ls(SINCE) || '0', 10) || Date.now(), vuLe: Date.now(), ua: navigator.userAgent.slice(0, 120) }, { merge: true });
    const token = async () => { const { m, getToken } = await messaging(); const reg = await navigator.serviceWorker.ready; return getToken(m, { vapidKey, serviceWorkerRegistration: reg }); };

    async function enable() {
      if (await Notification.requestPermission() !== 'granted') return 'Notifications refusées';
      const t = await token(); if (!t) throw new Error('Jeton indisponible');
      ls(SINCE, String(Date.now()));
      try { await rec(t); ls(REC, String(Date.now())); } catch (e) { console.warn('Jeton non enregistré dans la base (comptage admin) :', e && (e.code || e.message)); }   // les notifications fonctionnent quand même
      ls(KEY, t); return '✅ Notifications activées';
    }
    async function disable() {
      const t = ls(KEY);
      try { const { m, deleteToken } = await messaging(); await deleteToken(m); } catch (e) {}
      try { if (t) await deleteDoc(doc(db, 'push_tokens', t)); } catch (e) {}
      lsDel(KEY); lsDel(REC); lsDel(SINCE);
      return 'Notifications désactivées';
    }

    /* ---------- Fenêtre au centre de l'écran ---------- */
    function popup() {
      const on = isOn();
      const ov = document.createElement('div');
      ov.id = 'pushPop';
      ov.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,15,30,.65);';
      const box = document.createElement('div');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'pushPopT');
      box.style.cssText = 'width:min(340px,100%);box-sizing:border-box;background:#0a2342;color:#fff;border:2px solid #c9a84c;border-radius:16px;padding:1.6rem 1.3rem 1.3rem;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:"DM Sans",system-ui,sans-serif;';
      const h = document.createElement('div');
      h.id = 'pushPopT'; h.textContent = 'NOTIFICATIONS';
      h.style.cssText = 'font-family:"Bebas Neue","DM Sans",system-ui,sans-serif;font-size:2rem;letter-spacing:.08em;color:#c9a84c;line-height:1.1;margin-bottom:.6rem;';
      const p = document.createElement('p');
      p.textContent = on
        ? 'Les notifications sont activées sur cet appareil. Souhaitez-vous continuer à les recevoir ?'
        : 'Recevez les actualités du Comité (résultats, calendrier, informations) directement sur votre appareil.';
      p.style.cssText = 'margin:0 0 1.2rem;font-size:.92rem;line-height:1.45;color:rgba(255,255,255,.85);';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:.6rem;';
      const btn = (txt, gold) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = txt;
        b.style.cssText = 'flex:1;min-height:46px;border-radius:30px;font:700 .9rem "DM Sans",system-ui,sans-serif;cursor:pointer;padding:0 .8rem;' +
          (gold ? 'background:#c9a84c;color:#0a2342;border:2px solid #c9a84c;' : 'background:transparent;color:#fff;border:2px solid rgba(255,255,255,.45);');
        return b;
      };
      const main = btn(on ? 'Désactiver' : 'Activer', true), other = btn(on ? 'Garder' : 'Refuser', false);
      const close = () => ov.remove();
      const done = msg => { p.textContent = msg; row.remove(); setTimeout(close, 2200); };
      other.onclick = close;
      main.onclick = async () => {
        main.disabled = other.disabled = true;
        try { done(await (on ? disable() : enable())); } catch (e) { console.warn(e); done('Action impossible'); }
      };
      row.append(main, other);
      box.append(h, p, row); ov.append(box); document.body.append(ov);
      main.focus();
    }

    /* Affichage : une fois par mois (la date est notée dès l'affichage, donc pas de répétition d'une page à l'autre) */
    const last = parseInt(ls(ASK) || '0', 10) || 0;
    if (Date.now() - last >= MONTH) { ls(ASK, String(Date.now())); setTimeout(popup, 1200); }

    /* Appareil déjà abonné : on (ré)enregistre le jeton s'il a changé ou s'il n'a pas été enregistré depuis plus d'un jour.
       Cela rattrape les abonnements faits avant, ou quand l'écriture avait échoué. */
    if (isOn()) token().then(async t => {
      if (!t || !isOn()) return;
      const changed = t !== ls(KEY); if (changed) ls(KEY, t);
      if (changed || Date.now() - (parseInt(ls(REC) || '0', 10) || 0) > DAY) {
        try { await rec(t); ls(REC, String(Date.now())); } catch (e) { console.warn('Jeton non enregistré dans la base (comptage admin) :', e && (e.code || e.message)); }
      }
    }).catch(() => {});
  } catch (e) { console.warn('Notifications indisponibles', e); }
})();
