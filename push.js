/* push.js — bouton « Activer les notifications » (Firebase Cloud Messaging).
   N'apparaît que si l'admin a activé l'option (Infos du site › Notifications push) et saisi la clé VAPID. */
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/', KEY = 'pushToken';

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
    const s = (await getDoc(doc(db, 'settings', 'general'))).data() || {};
    const vapidKey = String(s.vapidKey || '').trim();
    if (!s.pushActif || !vapidKey) return;                 // option coupée dans l'admin : rien n'est affiché
    if (Notification.permission === 'denied') return;

    const isOn = () => Notification.permission === 'granted' && !!localStorage.getItem(KEY);
    const rec = t => setDoc(doc(db, 'push_tokens', t), { token: t, creeLe: Date.now(), ua: navigator.userAgent.slice(0, 120) });
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'pushBtn';
    b.style.cssText = 'position:fixed;right:12px;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 62px);z-index:9000;min-height:40px;border:1.5px solid #c9a84c;border-radius:30px;background:#0a2342;color:#fff;font:600 .8rem "DM Sans",system-ui,sans-serif;padding:0 .9rem;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:calc(100vw - 24px)';
    const render = () => { b.textContent = isOn() ? '🔔 Notifications activées · désactiver' : '🔔 Activer les notifications'; b.setAttribute('aria-pressed', String(isOn())); };
    const flash = t => { b.textContent = t; setTimeout(render, 3500); };
    const token = async () => { const { m, getToken } = await messaging(); const reg = await navigator.serviceWorker.ready; return getToken(m, { vapidKey, serviceWorkerRegistration: reg }); };

    async function enable() {
      if (await Notification.requestPermission() !== 'granted') return flash('Notifications refusées');
      const t = await token(); if (!t) throw new Error('Jeton indisponible');
      try { await rec(t); } catch (e) { console.warn('Enregistrement du jeton', e); }
      localStorage.setItem(KEY, t); flash('✅ Notifications activées');
    }
    async function disable() {
      const t = localStorage.getItem(KEY);
      try { const { m, deleteToken } = await messaging(); await deleteToken(m); } catch (e) {}
      try { if (t) await deleteDoc(doc(db, 'push_tokens', t)); } catch (e) {}
      localStorage.removeItem(KEY); flash('Notifications désactivées');
    }
    b.onclick = async () => { b.disabled = true; try { await (isOn() ? disable() : enable()); } catch (e) { console.warn(e); flash('Activation impossible'); } b.disabled = false; };
    document.body.append(b); render();
    if (isOn()) token().then(t => { if (t && t !== localStorage.getItem(KEY)) { localStorage.setItem(KEY, t); rec(t).catch(() => {}); } }).catch(() => {});
  } catch (e) { console.warn('Notifications indisponibles', e); }
})();
