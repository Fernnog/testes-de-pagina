// assets/js/main.js

// 1. IMPORTAÇÕES
import { auth } from './firebase-config.js'; 
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { initOrcamentos } from './orcamentos.js';
import { initPrecificacao } from './precificacao.js';

// 2. REFERÊNCIAS AOS ELEMENTOS DO DOM (Telas)
const screens = {
    auth: document.getElementById('auth-screen'),
    hub: document.getElementById('hub-screen'),
    orcamentos: document.getElementById('module-orcamentos'),
    precificacao: document.getElementById('module-precificacao'),
    splash: document.getElementById('splash-screen') // Referência nova
};

// Referências aos Botões e Inputs
const btnLogin = document.getElementById('loginBtn');
const btnLogout = document.getElementById('hubLogoutBtn');
const btnGoOrcamentos = document.getElementById('btn-go-orcamentos');
const btnGoPrecificacao = document.getElementById('btn-go-precificacao');
const btnsBackToHub = document.querySelectorAll('.btn-back-hub');
const authMessage = document.getElementById('auth-message');

// 3. FUNÇÃO DE NAVEGAÇÃO (ROTEAMENTO)
function navigateTo(screenName) {
    // Esconde todas as telas
    Object.values(screens).forEach(el => {
        if(el) el.style.display = 'none';
    });

    // Mostra a tela desejada
    if(screens[screenName]) {
        screens[screenName].style.display = 'block';
    } else {
        console.error(`Tela "${screenName}" não encontrada.`);
    }
}

// 3.1 FUNÇÃO AUXILIAR: SPLASH SCREEN (Prioridade 2)
// Exibe o splash por 2.5s antes de executar a ação de callback (ir para hub)
function showSplashScreen(onComplete) {
    if(screens.splash) {
        // Garante que o Auth está oculto
        if(screens.auth) screens.auth.style.display = 'none';
        
        // Mostra Splash
        screens.splash.style.display = 'flex';
        
        // Aguarda 2.5 segundos (tempo para ler a frase e causar impacto)
        setTimeout(() => {
            screens.splash.style.display = 'none';
            if(onComplete) onComplete();
        }, 2500);
    } else {
        // Fallback se não existir elemento splash
        if(onComplete) onComplete();
    }
}

// 4. MONITOR DE ESTADO DE AUTENTICAÇÃO (O "Porteiro")
onAuthStateChanged(auth, (user) => {
    if (user) {
        // === USUÁRIO LOGADO ===
        console.log("Usuário autenticado:", user.email);
        
        // Atualiza interface do Hub
        const userDisplay = document.getElementById('user-email-display');
        if(userDisplay) userDisplay.textContent = user.email;

        // LÓGICA DE TRANSIÇÃO (Prioridade 2):
        // Se a tela de login ainda estiver visível, significa que o usuário acabou de entrar.
        // Nesse caso, mostramos o Splash. Se for um refresh (login oculto), vai direto.
        const isLoginVisible = screens.auth && screens.auth.style.display !== 'none';

        if (isLoginVisible) {
            showSplashScreen(() => {
                navigateTo('hub');
                initOrcamentos();
                initPrecificacao();
            });
        } else {
            // Navegação direta (refresh ou já logado)
            navigateTo('hub');
            initOrcamentos();
            initPrecificacao();
        }

    } else {
        // === USUÁRIO DESCONECTADO ===
        console.log("Nenhum usuário autenticado.");
        navigateTo('auth');
    }
});

// 5. LÓGICA DE LOGIN (Ação do botão Entrar)
if(btnLogin) {
    btnLogin.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            authMessage.textContent = "Por favor, preencha email e senha.";
            authMessage.style.color = "red";
            return;
        }

        // UX: Feedback de Carregamento (Sugestão do Arquiteto)
        const originalBtnText = btnLogin.textContent;
        btnLogin.textContent = "Entrando...";
        btnLogin.disabled = true;
        btnLogin.style.opacity = "0.7";
        
        authMessage.textContent = "";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged vai lidar com o redirecionamento e Splash automaticamente
        } catch (error) {
            console.error("Erro no login:", error);
            let msg = "Erro ao entrar.";
            if(error.code === 'auth/wrong-password') msg = "Senha incorreta.";
            if(error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            if(error.code === 'auth/invalid-email') msg = "Email inválido.";
            
            authMessage.textContent = msg;
            authMessage.style.color = "red";
            
            // Restaura botão em caso de erro
            btnLogin.textContent = originalBtnText;
            btnLogin.disabled = false;
            btnLogin.style.opacity = "1";
        }
    });
}

// 6. LÓGICA DE LOGOUT (Sair do Sistema)
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

// 7. NAVEGAÇÃO DO HUB (Botões dos Módulos)
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

// 8. BOTÃO "VOLTAR AO MENU" (Presente nos módulos)
btnsBackToHub.forEach(btn => {
    btn.addEventListener('click', () => {
        navigateTo('hub');
    });
});

// 9. REGISTRO PWA (Prioridade 4)
// Verifica se o navegador suporta Service Workers e registra
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registrado com sucesso.', reg))
            .catch((err) => console.log('Erro ao registrar Service Worker:', err));
    });
}