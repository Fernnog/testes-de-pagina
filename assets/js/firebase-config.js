// assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // Opcional

const firebaseConfig = {
  apiKey: "AIzaSyCVwI8jMseTiXQbLF9789M1OrCo2xCZugQ",
  authDomain: "perola-rara-atelier.firebaseapp.com",
  projectId: "perola-rara-atelier",
  storageBucket: "perola-rara-atelier.firebasestorage.app",
  messagingSenderId: "469831378664",
  appId: "1:469831378664:web:93faf8030a9132bd380b5d",
  measurementId: "G-YCK2WYD6BN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

// Exportamos as instâncias para serem usadas nos outros arquivos
export { app, auth, db };
