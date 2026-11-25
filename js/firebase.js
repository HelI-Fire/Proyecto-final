import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQqo2dLbWiOA-eMKg_J8QSARiLxxAr8w4",
  authDomain: "prices-e658a.firebaseapp.com",
  projectId: "prices-e658a",
  storageBucket: "prices-e658a.firebasestorage.app",
  messagingSenderId: "730532704149",
  appId: "1:730532704149:web:401554f006715987d1509c"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
