// assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // Opcional

const firebaseConfig = {
    // COLOQUE AQUI AS CREDENCIAIS DA SUA NOVA BASE UNIFICADA
    apiKey: "SUA_NOVA_API_KEY",
    authDomain: "seu-novo-projeto.firebaseapp.com",
    projectId: "seu-novo-projeto",
    storageBucket: "seu-novo-projeto.firebasestorage.app",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

// Exportamos as instâncias para serem usadas nos outros arquivos
export { app, auth, db };
