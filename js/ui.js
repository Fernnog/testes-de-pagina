// js/ui.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

/**
 * Exibe a aba especificada e esconde as outras.
 * @param {string} tabId - O ID da aba a ser exibida.
 */
export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

/**
 * Alterna a visibilidade do campo de nome do cônjuge.
 */
export function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success' | 'warning'} type - O tipo de toast.
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

/**
 * Renderiza a lista de membros cadastrados na tela.
 */
export function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    membros.sort((a, b) => a.nome.localeCompare(b.nome));

    let maleCount = 0;
    let femaleCount = 0;

    if (membros.length === 0) {
        lista.innerHTML = '<li>Nenhum membro cadastrado.</li>';
    } else {
        lista.innerHTML = membros.map((m, index) => {
            if (m.genero === 'M') maleCount++;
            else if (m.genero === 'F') femaleCount++;

            const susp = m.suspensao;
            const isTotalmenteSuspenso = susp.cultos && susp.sabado && susp.whatsapp;
            const isParcialmenteSuspenso = !isTotalmenteSuspenso && (susp.cultos || susp.sabado || susp.whatsapp);

            let suspensaoTitle = '';
            if (isParcialmenteSuspenso) {
                let suspensoDe = [];
                if (susp.cultos) suspensoDe.push('Cultos');
                if (susp.sabado) suspensoDe.push('Sábado');
                if (susp.whatsapp) suspensoDe.push('WhatsApp');
                suspensaoTitle = `Suspenso de: ${suspensoDe.join(', ')}`;
            } else if (isTotalmenteSuspenso) {
                suspensaoTitle = 'Suspenso de todas as atividades.';
            }

            const genderSymbol = m.genero === 'M' ? '♂️' : '♀️';
            return `
                <li class="${isTotalmenteSuspenso ? 'suspended-member' : ''}">
                    <div>
                        <span class="gender-icon gender-${m.genero === 'M' ? 'male' : 'female'}">${genderSymbol}</span>
                        <span class="member-name ${isTotalmenteSuspenso ? 'suspended-text' : ''}">
                            ${m.nome}
                            ${(isParcialmenteSuspenso || isTotalmenteSuspenso) ? `<i class="fas fa-pause-circle" title="${suspensaoTitle}"></i>` : ''}
                        </span>
                    </div>
                    <div class="member-details">
                        ${m.conjuge ? `<span class="spouse-info">- Cônjuge: ${m.conjuge}</span>` : ''}
                    </div>
                    <div>
                        <button class="secondary-button" data-action="manage-suspension" data-index="${index}">Gerenciar Suspensão</button>
                        <button data-action="delete-member" data-index="${index}">Excluir</button>
                    </div>
                </li>`;
        }).join('');
    }

    document.getElementById('maleCount').textContent = maleCount;
    document.getElementById('femaleCount').textContent = femaleCount;
    document.getElementById('totalCount').textContent = membros.length;
}

/**
 * Atualiza os dropdowns de seleção de membros.
 */
export function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        select.innerHTML = '<option value="" disabled selected hidden>Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

/**
 * Renderiza a lista de restrições temporárias.
 */
export function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.length === 0 ? '<li>Nenhuma restrição cadastrada.</li>' : restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button data-action="delete-restriction" data-index="${index}">Excluir</button></li>`).join('');
}

/**
 * Renderiza a lista de restrições permanentes.
 */
export function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.length === 0 ? '<li>Nenhuma restrição cadastrada.</li>' : restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button data-action="delete-perm-restriction" data-index="${index}">Excluir</button></li>`).join('');
}

/**
 * Agrupa todas as funções de atualização de listas para uma atualização geral da UI.
 */
export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

/**
 * Abre o modal para gerenciar a suspensão de um membro.
 * @param {number} index - O índice do membro no array.
 */
export function abrirModalSuspensao(index) {
    const membro = membros[index];
    document.getElementById('membroIndexSuspensao').value = index;
    document.getElementById('modalTitle').textContent = `Gerenciar Suspensão: ${membro.nome}`;
    document.getElementById('suspenderCultos').checked = membro.suspensao.cultos;
    document.getElementById('suspenderSabado').checked = membro.suspensao.sabado;
    document.getElementById('suspenderWhatsapp').checked = membro.suspensao.whatsapp;
    document.getElementById('suspensaoModal').style.display = 'flex';
}

/**
 * Fecha o modal de suspensão.
 */
export function fecharModalSuspensao() {
    document.getElementById('suspensaoModal').style.display = 'none';
}


/**
 * Calcula e exibe o Índice de Equilíbrio da escala gerada.
 * @param {object} participacoes - O objeto com a contagem de participações de cada membro.
 */
export function exibirIndiceEquilibrio(participacoes) {
    const container = document.getElementById('balanceIndexContainer');
    const counts = Object.values(participacoes).map(p => p.count);
    
    // Só exibe se houver pelo menos 2 membros participando para ter uma base de comparação
    if (counts.filter(c => c > 0).length < 2) {
        container.style.display = 'none';
        return;
    }

    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (media === 0) { // Se ninguém participou, o equilíbrio é perfeito (100%) mas irrelevante
        container.style.display = 'none';
        return;
    }
    
    // Cálculo do desvio padrão
    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b, 0) / counts.length);
    
    // Converte o desvio padrão em uma pontuação de 0-100.
    // Quanto menor o desvio (mais próximo de 0), maior a pontuação.
    // O fator 30 é um multiplicador ajustável para a sensibilidade.
    const score = Math.max(0, 100 - (desvioPadrao * 30));

    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala</h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${score.toFixed(1)}%;" id="balanceBar">
                ${score.toFixed(1)}%
            </div>
        </div>
    `;
    container.style.display = 'block';

    const bar = document.getElementById('balanceBar');
    if (score < 50) {
        bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)'; // Vermelho
    } else if (score < 75) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)'; // Amarelo
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)'; // Verde
    }
}
