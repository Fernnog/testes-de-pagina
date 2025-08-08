// ARQUIVO: main.js (Versão Final e Estável)

import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import { carregarDados, salvarDados } from './data-manager.js';
import {
    showTab,
    toggleConjuge,
    atualizarTodasAsListas,
    setupUiListeners,
    exportarEscalaXLSX,
    renderDisponibilidadeGeral
} from './ui.js';
import { setupSavedSchedulesListeners } from './saved-schedules-manager.js';
import {
    handleCadastroSubmit,
    handleRestricaoSubmit,
    handleRestricaoPermanenteSubmit,
    excluirMembro,
    excluirRestricao,
    excluirRestricaoPermanente,
    abrirModalSuspensao,
    salvarSuspensao,
    fecharModalSuspensao
} from './member-actions.js';
// Importa a nova função do arquivo isolado
import { setupXLSXImporter } from './file-importer.js';


document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DO FIREBASE ---
    const firebaseConfig = {
        apiKey: "AIzaSyDIXuruqM4M9oA_Rz3PSxVsXM1EEVVbprw",
        authDomain: "escaladeintercessao.firebaseapp.com",
        databaseURL: "https://escaladeintercessao-default-rtdb.firebaseio.com",
        projectId: "escaladeintercessao",
        storageBucket: "escaladeintercessao.firebasestorage.app",
        messagingSenderId: "875628397922",
        appId: "1:875628397922:web:219b624120eb9286e5d83b",
        measurementId: "G-9MGZ364KVZ"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    // --- FUNÇÕES DE ORQUESTRAÇÃO ---
    function onLoginSuccess() {
        carregarDados(auth, database, () => {
            atualizarTodasAsListas();
        });
    }

    function exposeFunctionsToGlobalScope() {
        window.excluirMembro = (index) => excluirMembro(index, auth, database);
        window.excluirRestricao = (index) => excluirRestricao(index, auth, database);
        window.excluirRestricaoPermanente = (index) => excluirRestricaoPermanente(index, auth, database);
        window.abrirModalSuspensao = abrirModalSuspensao;
    }

    function setupEventListeners() {
        
        // --- Listeners da Barra de Navegação ---
        document.getElementById('nav-auth').addEventListener('click', () => showTab('auth'));
        document.getElementById('nav-cadastro').addEventListener('click', () => showTab('cadastro'));
        document.getElementById('nav-disponibilidade').addEventListener('click', () => {
            showTab('disponibilidade');
            renderDisponibilidadeGeral();
        });
        document.getElementById('nav-restricoes').addEventListener('click', () => showTab('restricoes'));
        document.getElementById('nav-restricoes-permanentes').addEventListener('click', () => showTab('restricoesPermanentes'));
        document.getElementById('nav-escala').addEventListener('click', () => showTab('escala'));

        // --- Listeners dos Botões de Ação Globais ---
        document.getElementById('btn-exportar-xlsx').addEventListener('click', exportarEscalaXLSX);
        document.getElementById('logout').addEventListener('click', () => handleLogout(auth));

        // --- Listeners do Modal de Suspensão ---
        document.getElementById('btn-salvar-suspensao').addEventListener('click', () => salvarSuspensao(auth, database));
        document.getElementById('btn-cancelar-suspensao').addEventListener('click', fecharModalSuspensao);

        // --- Listeners de Submissão de Formulários (Refatorados) ---
        document.getElementById('formCadastro').addEventListener('submit', (e) => {
            handleCadastroSubmit(e, auth, database);
        });

        document.getElementById('formRestricao').addEventListener('submit', (e) => {
            handleRestricaoSubmit(e, auth, database);
        });

        document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
            handleRestricaoPermanenteSubmit(e, auth, database);
        });
    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    setupAuthListeners(auth, onLoginSuccess);
    setupGeradorEscala();
    setupUiListeners();
    setupEventListeners();
    setupSavedSchedulesListeners(auth, database);
    exposeFunctionsToGlobalScope();
    // Ativa o novo importador de planilhas
    setupXLSXImporter(); 
});