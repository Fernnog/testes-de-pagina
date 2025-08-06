// js/member-actions.js

import {
    membros,
    excluirMembro as dmExcluirMembro,
    excluirRestricao as dmExcluirRestricao,
    excluirRestricaoPermanente as dmExcluirRestricaoPermanente,
    salvarDados
} from './data-manager.js';

import { atualizarTodasAsListas, showToast } from './ui.js';

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
