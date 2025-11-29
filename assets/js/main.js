// assets/js/main.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Mapeamento das telas (Sections no HTML)
const screens = {
    auth: document.getElementById('auth-screen'),
    hub: document.getElementById('hub-screen'),
    orcamentos: document.getElementById('module-orcamentos'),
    precificacao: document.getElementById('module-precificacao')
};

// Botões de Navegação
const btnLogout = document.getElementById('hubLogoutBtn');
const btnGoOrcamentos = document.getElementById('btn-go-orcamentos');
const btnGoPrecificacao = document.getElementById('btn-go-precificacao');
const btnsBackToHub = document.querySelectorAll('.btn-back-hub');

// Função para exibir uma tela específica e esconder as outras
function navigateTo(screenName) {
    console.log(`Navegando para: ${screenName}`);
    
    // Esconde todas
    Object.values(screens).forEach(el => {
        if(el) el.style.display = 'none';
    });

    // Mostra a desejada
    if(screens[screenName]) {
        screens[screenName].style.display = 'block';
    }
}

// Monitor de Autenticação (Centralizado)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado: Mostra o Hub Inicial
        document.getElementById('user-email-display').textContent = user.email;
        navigateTo('hub');
    } else {
        // Usuário não logado: Mostra Login
        navigateTo('auth');
    }
});

// Eventos de Clique
if(btnGoOrcamentos) {
    btnGoOrcamentos.addEventListener('click', () => navigateTo('orcamentos'));
}

if(btnGoPrecificacao) {
    btnGoPrecificacao.addEventListener('click', () => navigateTo('precificacao'));
}

btnsBackToHub.forEach(btn => {
    btn.addEventListener('click', () => navigateTo('hub'));
});

// Logout Global
if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // O onAuthStateChanged vai capturar e mandar para 'auth' automaticamente
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    });
}
