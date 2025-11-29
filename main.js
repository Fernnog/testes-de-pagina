import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { initOrcamentos } from './orcamentos.js';
import { initPrecificacao } from './precificacao.js';

// Elementos das telas
const screens = {
    auth: document.getElementById('auth-screen'),
    hub: document.getElementById('hub-screen'),
    orcamentos: document.getElementById('module-orcamentos'),
    precificacao: document.getElementById('module-precificacao')
};

// Função para mostrar apenas uma tela
function showScreen(screenName) {
    Object.values(screens).forEach(el => el.style.display = 'none');
    screens[screenName].style.display = 'block';
}

// Monitor de Autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Se logado, vai para o Hub e inicializa os módulos (carrega dados)
        showScreen('hub');
        initOrcamentos();   // Carrega dados do Firebase de orçamentos
        initPrecificacao(); // Carrega dados do Firebase de precificação
    } else {
        showScreen('auth');
    }
});

// Navegação do Hub
document.getElementById('btn-go-orcamentos').addEventListener('click', () => showScreen('orcamentos'));
document.getElementById('btn-go-precificacao').addEventListener('click', () => showScreen('precificacao'));

// Botões de Voltar ao Hub (adicionados nos headers dos módulos)
document.querySelectorAll('.btn-back-hub').forEach(btn => {
    btn.addEventListener('click', () => showScreen('hub'));
});
