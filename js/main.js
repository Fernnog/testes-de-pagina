// ARQUIVO: main.js (Versão Completa e Corrigida)

/**
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO (main.js)
 * Responsabilidades:
 * 1. Importar todos os outros módulos.
 * 2. Esperar o carregamento da página (DOMContentLoaded).
 * 3. Inicializar o Firebase.
 * 4. Configurar todos os event listeners (cliques em botões, submissão de formulários).
 * 5. Orquestrar as chamadas entre os diferentes módulos (auth, data, ui, etc.).
 */

import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import {
    carregarDados,
    salvarDados,
    adicionarMembro,
    adicionarRestricao,
    adicionarRestricaoPermanente,
    membros
} from './data-manager.js';
import {
    showTab,
    toggleConjuge,
    atualizarTodasAsListas,
    setupUiListeners,
    showToast,
    exportarEscalaXLSX,
    renderDisponibilidadeGeral
} from './ui.js';
import { setupSavedSchedulesListeners } from './saved-schedules-manager.js';
// NOVA IMPORTAÇÃO: Importa as funções de ação do novo módulo.
import * as memberActions from './member-actions.js';


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

    /**
     * Configura todos os event listeners da aplicação.
     */
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

        // --- Listeners de Submissão de Formulários ---
        document.getElementById('formCadastro').addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const genero = document.getElementById('genero').value;
            const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
            const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

            if (nomeConjuge && !membros.some(m => m.nome === nomeConjuge)) {
                alert('O cônjuge deve estar cadastrado como membro!');
                return;
            }

            adicionarMembro({
                nome,
                genero,
                conjuge: nomeConjuge,
                suspensao: { cultos: false, sabado: false, whatsapp: false }
            });
            
            salvarDados(auth, database).then(atualizarTodasAsListas);
            e.target.reset();
            toggleConjuge();
        });

        document.getElementById('formRestricao').addEventListener('submit', (e) => {
            e.preventDefault();
            const membro = document.getElementById('membroRestricao').value;
            const dataInicioStr = document.getElementById('dataInicio').value;
            const dataFimStr = document.getElementById('dataFim').value;
            const inicio = new Date(dataInicioStr + 'T12:00:00');
            const fim = new Date(dataFimStr + 'T12:00:00');

            if (!membro) { alert('Selecione um membro!'); return; }
            if (fim < inicio) { alert('A data de fim deve ser posterior à data de início!'); return; }

            adicionarRestricao({ membro, inicio: inicio.toISOString(), fim: fim.toISOString() });
            
            salvarDados(auth, database).then(atualizarTodasAsListas);
            e.target.reset();
        });

        document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
            e.preventDefault();
            const membro = document.getElementById('membroRestricaoPermanente').value;
            const diaSemana = document.getElementById('diaSemana').value;
            if (!membro) { alert('Selecione um membro!'); return; }

            adicionarRestricaoPermanente({ membro, diaSemana });

            salvarDados(auth, database).then(atualizarTodasAsListas);
            e.target.reset();
        });

        // --- MODIFICADO: Listeners de Ação por Delegação de Eventos ---
        // Um único listener para a lista de membros que gerencia todas as ações.
        document.getElementById('listaMembros').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const index = parseInt(button.dataset.index, 10);

            if (action === 'delete-member') {
                memberActions.excluirMembro(index, auth, database);
            } else if (action === 'manage-suspension') {
                memberActions.abrirModalSuspensao(index);
            }
        });

        // Listener para a lista de restrições temporárias.
        document.getElementById('listaRestricoes').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="delete-restriction"]');
            if (!button) return;
            const index = parseInt(button.dataset.index, 10);
            memberActions.excluirRestricao(index, auth, database);
        });

        // Listener para a lista de restrições permanentes.
        document.getElementById('listaRestricoesPermanentes').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="delete-perm-restriction"]');
            if (!button) return;
            const index = parseInt(button.dataset.index, 10);
            memberActions.excluirRestricaoPermanente(index, auth, database);
        });

        // Listeners para os botões do Modal de Suspensão.
        document.getElementById('btn-salvar-suspensao').addEventListener('click', () => {
            memberActions.salvarSuspensao(auth, database);
        });
        document.getElementById('btn-cancelar-suspensao').addEventListener('click', memberActions.fecharModalSuspensao);
    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    setupAuthListeners(auth, onLoginSuccess);
    setupGeradorEscala();
    setupUiListeners(); 
    setupEventListeners(); 
    setupSavedSchedulesListeners(auth, database);
});
