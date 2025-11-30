// assets/js/main.js

// 1. IMPORTAÇÕES
import { auth } from './firebase-config.js'; // Nossa configuração central
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { initOrcamentos } from './orcamentos.js';
import { initPrecificacao } from './precificacao.js';

// 2. REFERÊNCIAS AOS ELEMENTOS DO DOM (Telas)
const screens = {
    auth: document.getElementById('auth-screen'),
    splash: document.getElementById('splash-screen'), // Nova referência
    hub: document.getElementById('hub-screen'),
    orcamentos: document.getElementById('module-orcamentos'),
    precificacao: document.getElementById('module-precificacao')
};

// Referências aos Botões e Inputs
const btnLogin = document.getElementById('loginBtn');
const btnLogout = document.getElementById('hubLogoutBtn');
const btnGoOrcamentos = document.getElementById('btn-go-orcamentos');
const btnGoPrecificacao = document.getElementById('btn-go-precificacao');
const btnsBackToHub = document.querySelectorAll('.btn-back-hub');
const authMessage = document.getElementById('auth-message');

// Variável para controlar se é a primeira carga
let isFirstLoad = true;

// 3. FUNÇÃO DE NAVEGAÇÃO (ROTEAMENTO BÁSICO)
function navigateTo(screenName) {
    // Esconde todas as telas
    Object.values(screens).forEach(el => {
        if(el) el.style.display = 'none';
    });

    // Mostra a tela desejada
    if(screens[screenName]) {
        // Se for splash, usa flex para centralizar
        if(screenName === 'splash') {
            screens[screenName].style.display = 'flex';
        } else {
            screens[screenName].style.display = 'block';
        }
    } else {
        console.error(`Tela "${screenName}" não encontrada.`);
    }
}

// 4. FUNÇÃO DE TRANSIÇÃO COM SPLASH SCREEN
function transitionToHub() {
    // Esconde Auth e mostra Splash
    navigateTo('splash');

    // Inicializa os módulos em segundo plano enquanto a splash roda
    initOrcamentos();
    initPrecificacao();

    // Aguarda 2.5 segundos (tempo da "experiência")
    setTimeout(() => {
        navigateTo('hub');
    }, 2500);
}

// 5. MONITOR DE ESTADO DE AUTENTICAÇÃO (O "Porteiro")
onAuthStateChanged(auth, (user) => {
    if (user) {
        // === USUÁRIO LOGADO ===
        console.log("Usuário autenticado:", user.email);
        
        // Atualiza interface do Hub
        const userDisplay = document.getElementById('user-email-display');
        if(userDisplay) userDisplay.textContent = user.email;

        // Lógica de Entrada:
        // Se for o primeiro carregamento da página ou se o usuário estava na tela de login
        if (isFirstLoad || screens.auth.style.display !== 'none') {
            transitionToHub();
        } else {
            // Se o usuário já estava navegando (ex: deu refresh num módulo),
            // podemos mandar direto pro Hub ou manter onde estava (aqui mandamos pro Hub por simplicidade)
            navigateTo('hub');
            initOrcamentos();
            initPrecificacao();
        }
        
        isFirstLoad = false;

    } else {
        // === USUÁRIO DESCONECTADO ===
        console.log("Nenhum usuário autenticado.");
        navigateTo('auth');
        isFirstLoad = false;
    }
});

// 6. LÓGICA DE LOGIN (Ação do botão Entrar)
if(btnLogin) {
    btnLogin.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            authMessage.textContent = "Por favor, preencha email e senha.";
            authMessage.style.color = "red";
            return;
        }

        authMessage.textContent = "Verificando credenciais...";
        authMessage.style.color = "#555";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged vai ser disparado automaticamente e chamará transitionToHub()
            authMessage.textContent = "";
        } catch (error) {
            console.error("Erro no login:", error);
            let msg = "Erro ao entrar.";
            if(error.code === 'auth/wrong-password') msg = "Senha incorreta.";
            if(error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            if(error.code === 'auth/invalid-email') msg = "Email inválido.";
            
            authMessage.textContent = msg;
            authMessage.style.color = "red";
        }
    });
}

// 7. LÓGICA DE LOGOUT (Sair do Sistema)
if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // O onAuthStateChanged vai redirecionar para 'auth'
        } catch (error) {
            console.error("Erro ao sair:", error);
            alert("Não foi possível sair no momento.");
        }
    });
}

// 8. NAVEGAÇÃO DO HUB (Botões dos Módulos)
if(btnGoOrcamentos) {
    btnGoOrcamentos.addEventListener('click', () => {
        navigateTo('orcamentos');
    });
}

if(btnGoPrecificacao) {
    btnGoPrecificacao.addEventListener('click', () => {
        navigateTo('precificacao');
    });
}

// 9. BOTÃO "VOLTAR AO MENU" (Presente nos módulos)
btnsBackToHub.forEach(btn => {
    btn.addEventListener('click', () => {
        navigateTo('hub');
    });
});