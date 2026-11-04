import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmi9aL4oXkqCokL_0nM70zyuexTQcrZj4",
  authDomain: "comite-f1488.firebaseapp.com",
  projectId: "comite-f1488",
  storageBucket: "comite-f1488.firebasestorage.app",
  messagingSenderId: "892199685134",
  appId: "1:892199685134:web:b25f78d61bd6245c68005f"
};

const app = initializeApp(firebaseConfig);
/* Données hors ligne : sur le site public, Firestore garde une copie locale (IndexedDB) des contenus déjà consultés.
   L'admin reste en mode normal pour toujours travailler sur des données à jour. */
let _db;
try {
  _db = /admin(\.html)?\/?$/i.test(location.pathname)
    ? getFirestore(app)
    : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) { _db = getFirestore(app); }
export const db = _db;
export const auth = getAuth(app);
