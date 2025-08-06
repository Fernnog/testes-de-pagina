// ARQUIVO: main.js (Versão Completa e Corrigida)
// DESCRIÇÃO: Este arquivo foi atualizado para remover os listeners de eventos dos botões obsoletos
// ("Exportar Dados", "Importar Dados", "Limpar Dados"). As importações de funções não utilizadas
// do 'data-manager.js' também foram removidas para alinhar o código com a nova interface.

/**
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO (main.js)
 * Responsabilidades:
 * 1. Importar todos os outros módulos.
 * 2. Esperar o carregamento da página (DOMContentLoaded).
 * 3. Inicializar o Firebase.
 * 4. Configurar todos os event listeners (cliques em botões, submissão de formulários).
 * 5. Orquestrar as chamadas entre os diferentes módulos (auth, data, ui, etc.).
 */

// ETAPA 1: As importações DEVEM estar no topo do arquivo, no escopo global.
import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import {
    carregarDados,
    salvarDados,
    adicionarMembro,
    adicionarRestricao,
    adicionarRestricaoPermanente,
    membros // Importa o array de membros para validação
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


// ETAPA 2: O código que interage com a página é envolvido pelo listener DOMContentLoaded.
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

    /**
     * Função chamada após um login bem-sucedido.
     * Carrega os dados do usuário e atualiza toda a interface.
     */
    function onLoginSuccess() {
        carregarDados(auth, database, () => {
            atualizarTodasAsListas();
        });
    }

    /**
     * Configura todos os event listeners da aplicação que não são
     * configurados dentro de outros módulos.
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

        // --- Listeners dos botões de import/export/limpar dados foram removidos ---

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
    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    setupAuthListeners(auth, onLoginSuccess);
    setupGeradorEscala();
    setupUiListeners(); 
    setupEventListeners(); 
});
