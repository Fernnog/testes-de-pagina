// src/ui/splash-screen-ui.js

/**
 * @file splash-screen-ui.js
 * @description Lógica de UI para a tela de carregamento (splash screen).
 * Encapsula a manipulação do DOM para mostrar e esconder a tela de inicialização.
 */

// --- 1. CACHE DE ELEMENTOS DO DOM ---

/**
 * Referência ao elemento principal da splash screen.
 * @type {HTMLElement|null}
 */
let splashScreenElement = null;

// --- 2. FUNÇÕES PÚBLICAS ---

/**
 * Inicializa o módulo da splash screen.
 * Seleciona e armazena a referência ao elemento do DOM.
 * Deve ser chamado uma vez, no início da aplicação.
 */
function init() {
    splashScreenElement = document.getElementById('splash-screen');
    if (!splashScreenElement) {
        console.warn("Elemento da Splash Screen (#splash-screen) não encontrado no DOM.");
    }
}

/**
 * Esconde a splash screen adicionando a classe 'hidden'.
 * A classe 'hidden' aciona a transição de fade-out definida no CSS.
 */
function hide() {
    if (splashScreenElement) {
        splashScreenElement.classList.add('hidden');
    }
}

/**
 * Mostra a splash screen removendo a classe 'hidden'.
 * Função útil caso seja necessário reexibir a tela de carregamento em algum momento.
 */
function show() {
    if (splashScreenElement) {
        splashScreenElement.classList.remove('hidden');
    }
}

// --- 3. EXPORTAÇÕES DO MÓDULO ---

export {
    init,
    hide,
    show
};
