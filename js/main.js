// Arquivo: js/main.js
// Objetivo: Orquestrar a aplicação, inicializar os módulos e configurar todos os event listeners.

import { setupAuthListeners, handleLogout } from './auth.js';
import { setupScheduleGenerator } from './schedule-generator.js';
import * as data from './data-manager.js';
import * as ui from './ui.js';

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

// Passa as instâncias do Firebase para os módulos que precisam delas
data.setFirebase(database);
ui.setFirebase(XLSX); // Passa a lib XLSX para o módulo de UI


// --- FUNÇÃO DE CALLBACK PÓS-LOGIN ---
function onLoginSuccess() {
    data.carregarDados(auth, () => {
        ui.atualizarTodasAsListas(data.getState());
        ui.showToast('Dados carregados com sucesso!', 'success');
    });
}


// --- CONFIGURAÇÃO CENTRAL DE EVENT LISTENERS ---
function setupEventListeners() {
    // 1. Listeners da Barra de Navegação
    document.getElementById('nav-auth').addEventListener('click', () => ui.showTab('auth'));
    document.getElementById('nav-cadastro').addEventListener('click', () => ui.showTab('cadastro'));
    document.getElementById('nav-restricoes').addEventListener('click', () => ui.showTab('restricoes'));
    document.getElementById('nav-restricoes-permanentes').addEventListener('click', () => ui.showTab('restricoesPermanentes'));
    document.getElementById('nav-escala').addEventListener('click', () => ui.showTab('escala'));

    // 2. Listeners de Botões de Ação Globais
    document.getElementById('btn-exportar-dados').addEventListener('click', data.exportarDados);
    document.getElementById('btn-importar-dados').addEventListener('click', () => document.getElementById('importarArquivo').click());
    document.getElementById('importarArquivo').addEventListener('change', (event) => data.importarDados(event, auth));
    document.getElementById('logout').addEventListener('click', () => handleLogout(auth));
    document.getElementById('btn-limpar-dados').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            data.limparDadosGlobais();
            data.salvarDados(auth).then(() => {
                ui.atualizarTodasAsListas(data.getState());
                document.getElementById('resultadoEscala').innerHTML = '<div id="balanceIndexContainer" style="display: none;"></div>';
                ui.showToast('Todos os dados foram limpos.', 'warning');
            });
        }
    });

    // 3. Listener do Formulário de Cadastro de Membros
    document.getElementById('formCadastro').addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
        const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

        if (nomeConjuge && !data.membros.some(m => m.nome === nomeConjuge)) {
            alert('O cônjuge deve estar cadastrado como membro!');
            return;
        }

        const novoMembro = {
            nome,
            genero: document.getElementById('genero').value,
            conjuge: nomeConjuge,
            suspensao: { cultos: false, sabado: false, whatsapp: false }
        };
        data.adicionarMembro(novoMembro);
        data.salvarDados(auth).then(() => {
            ui.atualizarTodasAsListas(data.getState());
            ui.showToast(`Membro ${nome} cadastrado com sucesso!`, 'success');
        });
        e.target.reset();
        ui.toggleConjuge();
    });

    // 4. Listener para Ações na Lista de Membros (Excluir / Suspender) - Usando Event Delegation
    document.getElementById('listaMembros').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const li = target.closest('li');
        const index = parseInt(li.dataset.index, 10);
        
        if (target.textContent.includes('Excluir')) {
            if (confirm(`Tem certeza que deseja excluir ${data.membros[index].nome}?`)) {
                data.excluirMembro(index);
                data.salvarDados(auth).then(() => {
                    ui.atualizarTodasAsListas(data.getState());
                    ui.showToast('Membro excluído.', 'warning');
                });
            }
        } else if (target.textContent.includes('Gerenciar Suspensão')) {
            ui.abrirModalSuspensao(index, data.membros[index]);
        }
    });

    // 5. Listeners do Modal de Suspensão
    document.getElementById('btn-salvar-suspensao').addEventListener('click', () => {
        const index = document.getElementById('membroIndexSuspensao').value;
        data.atualizarSuspensaoMembro(index, {
            cultos: document.getElementById('suspenderCultos').checked,
            sabado: document.getElementById('suspenderSabado').checked,
            whatsapp: document.getElementById('suspenderWhatsapp').checked
        });
        data.salvarDados(auth).then(() => {
            ui.atualizarTodasAsListas(data.getState());
            ui.showToast('Status de suspensão atualizado.', 'success');
        });
        document.getElementById('suspensaoModal').style.display = 'none';
    });
    document.getElementById('btn-cancelar-suspensao').addEventListener('click', () => {
        document.getElementById('suspensaoModal').style.display = 'none';
    });

    // 6. Listener para o botão de Exportar XLSX
    document.getElementById('btn-exportar-xlsx').addEventListener('click', ui.exportarEscalaXLSX);
    
    // 7. Outros listeners que controlam a UI
    document.getElementById('conjugeParticipa').addEventListener('change', ui.toggleConjuge);

    // Adicione aqui os listeners dos outros formulários (Restrição, Restrição Permanente)
    // seguindo o mesmo padrão do formulário de cadastro.
}


// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners(auth, onLoginSuccess);
    setupScheduleGenerator(data, ui, auth);
    setupEventListeners();
});
