// Arquivo: js/main.js
// Responsabilidade: Orquestrar a aplicação, inicializar os módulos e configurar todos os eventos da interface.

// --- 1. IMPORTAÇÕES DOS MÓDULOS ---
// Importa as funções necessárias de cada módulo especializado.

import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import {
    carregarDados,
    salvarDados,
    limparDadosGlobais,
    exportarDados,
    importarDados,
    adicionarMembro,
    adicionarRestricao,
    adicionarRestricaoPermanente,
    membros // Importa o array de membros para validação do cônjuge
} from './data-manager.js';
import {
    showTab,
    toggleConjuge,
    atualizarTodasAsListas,
    setupUiListeners,
    showToast
} from './ui.js';

// --- 2. INICIALIZAÇÃO DO FIREBASE ---
// Configuração e inicialização dos serviços do Firebase. Este é o ponto central de conexão com o back-end.

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

// --- 3. FUNÇÕES DE FLUXO PRINCIPAL ---
// Funções que controlam o fluxo de inicialização e carregamento de dados.

/**
 * Função chamada após o login bem-sucedido.
 * Ela aciona o carregamento dos dados do usuário e, ao concluir, atualiza toda a interface.
 */
function onLoginSuccess() {
    carregarDados(auth, database, () => {
        atualizarTodasAsListas();
    });
}

/**
 * Configura todos os 'event listeners' da aplicação.
 * Esta função centraliza a lógica que torna a página interativa, ligando os elementos HTML ao JavaScript.
 */
function setupEventListeners() {
    // --- Listeners da Barra de Navegação ---
    document.getElementById('nav-auth').addEventListener('click', () => showTab('auth'));
    document.getElementById('nav-cadastro').addEventListener('click', () => showTab('cadastro'));
    document.getElementById('nav-restricoes').addEventListener('click', () => showTab('restricoes'));
    document.getElementById('nav-restricoes-permanentes').addEventListener('click', () => showTab('restricoesPermanentes'));
    document.getElementById('nav-escala').addEventListener('click', () => showTab('escala'));

    // --- Listeners dos Botões de Ação Globais ---
    document.getElementById('logout').addEventListener('click', () => handleLogout(auth));
    document.getElementById('btn-exportar-dados').addEventListener('click', exportarDados);
    
    document.getElementById('btn-importar-dados').addEventListener('click', () => {
        document.getElementById('importarArquivo').click();
    });
    document.getElementById('importarArquivo').addEventListener('change', (event) => {
        importarDados(event, auth, database);
    });

    document.getElementById('btn-limpar-dados').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            limparDadosGlobais();
            salvarDados(auth, database).then(() => {
                atualizarTodasAsListas();
                document.getElementById('resultadoEscala').innerHTML = '';
                showToast('Todos os dados foram limpos.', 'success');
            });
        }
    });

    // --- Listeners dos Formulários ---
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
        toggleConjuge(); // Reseta o campo do cônjuge visualmente
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
    
    // Configura listeners menores e específicos da UI, como o toggle do cônjuge.
    setupUiListeners();
}

// --- 4. INICIALIZAÇÃO DA APLICAÇÃO ---
// Ponto de partida que aciona toda a lógica da aplicação.

setupAuthListeners(auth, onLoginSuccess);
setupGeradorEscala();
setupEventListeners();
