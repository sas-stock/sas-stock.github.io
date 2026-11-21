/* SAS STOCK 2 — liaison Firebase (connexion Google + base Firestore) */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, doc, setDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, writeBatch, Timestamp, getDocs, getDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
const app = initializeApp({ apiKey: 'AIzaSyAiVF0_XRM8cxyMsV9S79b2sMl9KLVncWQ', authDomain: 'sas-stock-2d195.firebaseapp.com', projectId: 'sas-stock-2d195', storageBucket: 'sas-stock-2d195.firebasestorage.app', messagingSenderId: '98701020652', appId: '1:98701020652:web:f0779e040cc725d997c4c9' });
const auth = getAuth(app), db = getFirestore(app);
const U = u => u ? { uid: u.uid, email: u.email || '', nom: u.displayName || '' } : null;
const ms = t => t && t.toMillis ? t.toMillis() : 0;
window.FB = {
  onUser: cb => onAuthStateChanged(auth, u => cb(U(u))),
  connecter: () => signInWithPopup(auth, new GoogleAuthProvider()),
  deconnecter: () => signOut(auth),
  profil: u => setDoc(doc(db, 'boutiques', u.uid), { email: u.email, nom: u.nom, vu: serverTimestamp() }, { merge: true }),
  /* Ouverture d'une boutique : met à jour sa fiche et rend l'heure du serveur.
     « vu » est écrit par le serveur : il donne l'heure réelle, que la date du téléphone
     soit juste ou non, et il survit à l'effacement des données de l'application.
     « essai » n'est posé QU'À LA CRÉATION de la fiche, donc seulement pour un compte
     Google qui n'a jamais ouvert SAS STOCK. Une boutique qui existe déjà — client sous
     licence, licence expirée, licence jamais activée — n'en reçoit jamais : elle ne peut
     pas se fabriquer un essai gratuit en se reconnectant.
     Si les règles Firestore refusent la lecture, on rend null et l'application retombe
     sur son ancien garde-fou local. */
  ouverture: async u => {
    const ref = doc(db, 'boutiques', u.uid);
    try {
      const avant = await getDoc(ref);
      if (avant.exists()) await setDoc(ref, { email: u.email, nom: u.nom, vu: serverTimestamp() }, { merge: true });
      else await setDoc(ref, { email: u.email, nom: u.nom, vu: serverTimestamp(), essai: serverTimestamp() });
      const d = (await getDoc(ref)).data() || {};
      const now = ms(d.vu), essai = ms(d.essai);
      return now ? { now: now, essai: essai || null } : null;
    } catch (e) { return null; }
  },
  ecouterLicence: (uid, cb, err) => onSnapshot(doc(db, 'licences', uid), { includeMetadataChanges: true }, s => { if (s.metadata.hasPendingWrites || s.metadata.fromCache) return; cb(s.exists() && s.data().fin ? ms(s.data().fin) : null); }, err),
  ecouterDocs: (uid, depuis, cb, err) => onSnapshot(query(collection(db, 'boutiques', uid, 'docs'), where('m', '>', Timestamp.fromMillis(depuis)), orderBy('m')), s => {
    const out = [];
    s.docChanges().forEach(c => { if (c.type === 'removed' || c.doc.metadata.hasPendingWrites) return; const d = c.doc.data(); out.push({ k: c.doc.id, j: d.x ? null : d.j, m: ms(d.m) }); });
    if (!s.metadata.fromCache || out.length) cb(out);
  }, err),
  ecrire: (uid, lot, appareil) => { const b = writeBatch(db); lot.forEach(x => b.set(doc(db, 'boutiques', uid, 'docs', x.k), x.j == null ? { x: true, m: serverTimestamp(), a: appareil } : { j: x.j, m: serverTimestamp(), a: appareil })); return b.commit(); },
  boutiques: async () => {
    const [b, l] = await Promise.all([getDocs(collection(db, 'boutiques')), getDocs(collection(db, 'licences'))]), fin = {};
    l.forEach(d => { fin[d.id] = ms(d.data().fin) || null; });
    return b.docs.map(d => ({ uid: d.id, email: d.data().email || '', nom: d.data().nom || '', vu: ms(d.data().vu), essai: ms(d.data().essai) || null, fin: fin[d.id] || null }));
  },
  licence: (uid, finMs) => setDoc(doc(db, 'licences', uid), { fin: Timestamp.fromMillis(finMs), maj: serverTimestamp() }),
  lire: uid => getDocs(query(collection(db, 'boutiques', uid, 'docs'), where('m', '>', Timestamp.fromMillis(0)))).then(s => s.size)
};
dispatchEvent(new Event('fb-pret'));
