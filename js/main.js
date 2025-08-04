// =================================================================================
// PONTO DE ENTRADA PRINCIPAL (main.js)
// Orquestra a aplicação, inicializa o Firebase e configura todos os Event Listeners.
// =================================================================================

// --- Importações dos Módulos ---
import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import {
    membros,
    adicionarMembro, excluirMembro, atualizarSuspensaoMembro,
    adicionarRestricao, excluirRestricao,
    adicionarRestricaoPermanente, excluirRestricaoPermanente,
    carregarDados, salvarDados, limparDadosGlobais,
    exportarDados, importarDados
} from './data-manager.js';
import {
    showTab, toggleConjuge, showToast,
    atualizarListaMembros, atualizarSelectMembros,
    atualizarListaRestricoes, atualizarListaRestricoesPermanentes,
    abrirModalSuspensao, fecharModalSuspensao
} from './ui.js';


// --- Inicialização do Firebase ---
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


// --- Funções de Callback e Orquestração ---

/**
 * Agrupa todas as funções que atualizam a UI para serem chamadas de uma vez.
 */
function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

/**
 * Função executada com sucesso após o login de um usuário.
 */
function onLoginSuccess() {
    carregarDados(auth, database, () => {
        atualizarTodasAsListas();
        showToast("Dados carregados com sucesso!", "success");
    });
}


// --- Configuração dos Event Listeners ---
// Centraliza toda a interatividade da página.

function setupEventListeners() {
    // --- Navegação Principal ---
    document.getElementById('nav-auth').addEventListener('click', () => showTab('auth'));
    document.getElementById('nav-cadastro').addEventListener('click', () => showTab('cadastro'));
    document.getElementById('nav-restricoes').addEventListener('click', () => showTab('restricoes'));
    document.getElementById('nav-restricoes-permanentes').addEventListener('click', () => showTab('restricoesPermanentes'));
    document.getElementById('nav-escala').addEventListener('click', () => showTab('escala'));

    // --- Ações Globais (Exportar, Importar, Limpar) ---
    document.getElementById('btn-exportar-dados').addEventListener('click', exportarDados);
    document.getElementById('btn-importar-dados').addEventListener('click', () => document.getElementById('importarArquivo').click());
    document.getElementById('importarArquivo').addEventListener('change', (event) => importarDados(event, auth, database));
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

    // --- Autenticação ---
    document.getElementById('logout').addEventListener('click', () => handleLogout(auth));

    // --- Formulários de Cadastro e Restrição ---
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
        salvarDados(auth, database).then(atualizarListaRestricoes);
        e.target.reset();
    });

    document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
        e.preventDefault();
        const membro = document.getElementById('membroRestricaoPermanente').value;
        const diaSemana = document.getElementById('diaSemana').value;
        if (!membro) { alert('Selecione um membro!'); return; }

        adicionarRestricaoPermanente({ membro, diaSemana });
        salvarDados(auth, database).then(atualizarListaRestricoesPermanentes);
        e.target.reset();
    });

    // --- Interatividade da UI (Checkbox, Modal) ---
    document.getElementById('conjugeParticipa').addEventListener('change', toggleConjuge);

    document.getElementById('btnSalvarSuspensao').addEventListener('click', () => {
        const index = document.getElementById('membroIndexSuspensao').value;
        if (index === '') return;

        const novaSuspensao = {
            cultos: document.getElementById('suspenderCultos').checked,
            sabado: document.getElementById('suspenderSabado').checked,
            whatsapp: document.getElementById('suspenderWhatsapp').checked,
        };
        
        atualizarSuspensaoMembro(index, novaSuspensao);
        salvarDados(auth, database).then(atualizarListaMembros);
        fecharModalSuspensao();
    });
    
    document.getElementById('btnCancelarSuspensao').addEventListener('click', fecharModalSuspensao);
    
    // Delegação de eventos para botões na lista de membros (mais eficiente)
    document.getElementById('listaMembros').addEventListener('click', (e) => {
        if (e.target.matches('.btn-excluir-membro')) {
            const index = e.target.dataset.index;
            if (confirm(`Tem certeza que deseja excluir ${membros[index].nome}?`)) {
                excluirMembro(index);
                salvarDados(auth, database).then(atualizarTodasAsListas);
            }
        } else if (e.target.matches('.btn-gerenciar-suspensao')) {
            const index = e.target.dataset.index;
            abrirModalSuspensao(index);
        }
    });
}


// --- Inicialização da Aplicação ---
// A ordem é importante: primeiro configura a autenticação, depois o resto.
setupAuthListeners(auth, onLoginSuccess);
setupGeradorEscala(database, auth); // Passa dependências se o gerador precisar
setupEventListeners();
