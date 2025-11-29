// assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // Opcional

const firebaseConfig = {
  apiKey: "AIzaSyC4xXSGw91MPLbC3ikCsdJ4pkNu1GZTqKQ",
  authDomain: "teste-da-perola.firebaseapp.com",
  projectId: "teste-da-perola",
  storageBucket: "teste-da-perola.firebasestorage.app",
  messagingSenderId: "845747978306",
  appId: "1:845747978306:web:90314c25caf38106bc6ddb",
  measurementId: "G-BLJ0S9GZLE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

// Exportamos as instâncias para serem usadas nos outros arquivos
export { app, auth, db };
