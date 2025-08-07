// js/member-actions.js

import {
    membros,
    adicionarMembro,
    excluirMembro as dmExcluirMembro,
    adicionarRestricao,
    excluirRestricao as dmExcluirRestricao,
    adicionarRestricaoPermanente,
    excluirRestricaoPermanente as dmExcluirRestricaoPermanente,
    salvarDados
} from './data-manager.js';

import { atualizarTodasAsListas, showToast, toggleConjuge } from './ui.js';

// --- AÇÕES DE CADASTRO E RESTRIÇÃO (LÓGICA MOVIDA DE main.js) ---

/**
 * Processa a submissão do formulário de cadastro de membros.
 * @param {Event} e - O evento de submissão do formulário.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function handleCadastroSubmit(e, auth, database) {
    e.preventDefault();
    const nome = document.getElementById('nome').value;
    const genero = document.getElementById('genero').value;
    const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
    const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

    if (nomeConjuge && !membros.some(m => m.nome === nomeConjuge)) {
        showToast('O cônjuge deve estar cadastrado como membro!', 'error');
        return;
    }

    adicionarMembro({
        nome,
        genero,
        conjuge: nomeConjuge,
        suspensao: { cultos: false, sabado: false, whatsapp: false }
    });
    
    salvarDados(auth, database)
        .then(() => {
            atualizarTodasAsListas();
            showToast('Membro cadastrado com sucesso!', 'success');
        })
        .catch(err => showToast(`Erro ao cadastrar membro: ${err.message}`, 'error'));

    e.target.reset();
    toggleConjuge();
}

/**
 * Processa a submissão do formulário de restrição temporária.
 * @param {Event} e - O evento de submissão do formulário.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function handleRestricaoSubmit(e, auth, database) {
    e.preventDefault();
    const membro = document.getElementById('membroRestricao').value;
    const dataInicioStr = document.getElementById('dataInicio').value;
    const dataFimStr = document.getElementById('dataFim').value;
    const inicio = new Date(dataInicioStr + 'T12:00:00');
    const fim = new Date(dataFimStr + 'T12:00:00');

    if (!membro) { showToast('Selecione um membro!', 'warning'); return; }
    if (fim < inicio) { showToast('A data de fim deve ser posterior à data de início!', 'error'); return; }

    adicionarRestricao({ membro, inicio: inicio.toISOString(), fim: fim.toISOString() });
    
    salvarDados(auth, database)
        .then(() => {
            atualizarTodasAsListas();
            showToast('Restrição temporária registrada.', 'success');
        })
        .catch(err => showToast(`Erro ao salvar restrição: ${err.message}`, 'error'));
    
    e.target.reset();
}

/**
 * Processa a submissão do formulário de restrição permanente.
 * @param {Event} e - O evento de submissão do formulário.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function handleRestricaoPermanenteSubmit(e, auth, database) {
    e.preventDefault();
    const membro = document.getElementById('membroRestricaoPermanente').value;
    const diaSemana = document.getElementById('diaSemana').value;
    if (!membro) { showToast('Selecione um membro!', 'warning'); return; }

    adicionarRestricaoPermanente({ membro, diaSemana });

    salvarDados(auth, database)
        .then(() => {
            atualizarTodasAsListas();
            showToast('Restrição permanente registrada.', 'success');
        })
        .catch(err => showToast(`Erro ao salvar restrição: ${err.message}`, 'error'));

    e.target.reset();
}


// --- AÇÕES DE EXCLUSÃO E SUSPENSÃO ---

/**
 * Exclui um membro da lista principal.
 * @param {number} index - O índice do membro a ser excluído.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function excluirMembro(index, auth, database) {
    if (confirm(`Tem certeza que deseja excluir ${membros[index].nome}? Esta ação não pode ser desfeita.`)) {
        dmExcluirMembro(index);
        salvarDados(auth, database)
            .then(() => {
                atualizarTodasAsListas();
                showToast('Membro excluído com sucesso.', 'success');
            })
            .catch(err => showToast(`Erro ao excluir membro: ${err.message}`, 'error'));
    }
}

/**
 * Exclui uma restrição temporária.
 * @param {number} index - O índice da restrição a ser excluída.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function excluirRestricao(index, auth, database) {
    dmExcluirRestricao(index);
    salvarDados(auth, database).then(atualizarTodasAsListas);
}

/**
 * Exclui uma restrição permanente.
 * @param {number} index - O índice da restrição a ser excluída.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function excluirRestricaoPermanente(index, auth, database) {
    dmExcluirRestricaoPermanente(index);
    salvarDados(auth, database).then(atualizarTodasAsListas);
}

/**
 * Abre e preenche o modal para gerenciamento de suspensão de um membro.
 * @param {number} index - O índice do membro.
 */
export function abrirModalSuspensao(index) {
    const membro = membros[index];
    if (!membro) return;

    document.getElementById('membroIndexSuspensao').value = index;
    document.getElementById('modalTitle').textContent = `Gerenciar Suspensão: ${membro.nome}`;
    document.getElementById('suspenderCultos').checked = membro.suspensao.cultos;
    document.getElementById('suspenderSabado').checked = membro.suspensao.sabado;
    document.getElementById('suspenderWhatsapp').checked = membro.suspensao.whatsapp;
    document.getElementById('suspensaoModal').style.display = 'flex';
}

/**
 * Salva o estado de suspensão modificado no modal.
 * @param {firebase.auth.Auth} auth - Instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - Instância do banco de dados do Firebase.
 */
export function salvarSuspensao(auth, database) {
    const index = document.getElementById('membroIndexSuspensao').value;
    if (index === '' || !membros[index]) return;

    membros[index].suspensao.cultos = document.getElementById('suspenderCultos').checked;
    membros[index].suspensao.sabado = document.getElementById('suspenderSabado').checked;
    membros[index].suspensao.whatsapp = document.getElementById('suspenderWhatsapp').checked;

    salvarDados(auth, database)
        .then(() => {
            atualizarTodasAsListas();
            showToast('Suspensão atualizada com sucesso.', 'success');
        })
        .catch(err => showToast(`Erro ao salvar suspensão: ${err.message}`, 'error'));

    fecharModalSuspensao();
}

/**
 * Fecha o modal de suspensão.
 */
export function fecharModalSuspensao() {
    document.getElementById('suspensaoModal').style.display = 'none';
}
