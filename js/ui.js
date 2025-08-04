//
// MÓDULO DE INTERFACE DO USUÁRIO (ui.js)
// Responsável por toda a manipulação do DOM (atualizar listas, mostrar/ocultar elementos, etc.).
//

// Importa os dados necessários para renderizar as listas.
import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

/**
 * Exibe a aba especificada e oculta as outras.
 * @param {string} tabId - O ID do elemento da aba a ser exibida.
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
 * Abre e preenche o modal para gerenciar a suspensão de um membro.
 * @param {number} index - O índice do membro no array 'membros'.
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
 * Atualiza a lista de membros exibida na tela.
 */
function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    membros.sort((a, b) => a.nome.localeCompare(b.nome));

    let maleCount = 0;
    let femaleCount = 0;

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
                    <button class="secondary-button" data-action="suspender" data-index="${index}">Gerenciar Suspensão</button>
                    <button data-action="excluir-membro" data-index="${index}">Excluir</button>
                </div>
            </li>`;
    }).join('');

    document.getElementById('maleCount').textContent = maleCount;
    document.getElementById('femaleCount').textContent = femaleCount;
    document.getElementById('totalCount').textContent = membros.length;
}

/**
 * Atualiza os menus <select> com a lista de membros.
 */
function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

/**
 * Atualiza a lista de restrições temporárias exibida na tela.
 */
function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(r.fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        <button data-action="excluir-restricao" data-index="${index}">Excluir</button></li>`).join('');
}

/**
 * Atualiza a lista de restrições permanentes exibida na tela.
 */
function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button data-action="excluir-restricao-perm" data-index="${index}">Excluir</button></li>`).join('');
}

/**
 * Função "mestra" que chama todas as funções de atualização da UI de uma só vez.
 */
export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success' ou 'warning').
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000); // O toast desaparece após 5 segundos
}

/**
 * Calcula e exibe o Índice de Equilíbrio da escala gerada.
 * @param {Object} participacoes - O objeto com a contagem de participações de cada membro.
 */
export function exibirIndiceEquilibrio(participacoes) {
    const container = document.getElementById('balanceIndexContainer');
    const counts = Object.values(participacoes).map(p => p.count);
    if (counts.length < 2) {
        container.style.display = 'none';
        return;
    }

    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (media === 0) { // Se ninguém participou, o equilíbrio é perfeito (100%) mas trivial.
        container.style.display = 'none';
        return;
    }
    
    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b) / counts.length);
    const coeficienteDeVariacao = desvioPadrao / media;
    
    // Converte o coeficiente de variação em um score de 0-100.
    // Quanto menor o coeficiente (menos variação), maior a pontuação.
    const score = Math.max(0, 100 * (1 - coeficienteDeVariacao));

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
    if (score < 50) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)'; // Vermelho
    else if (score < 75) bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)'; // Amarelo
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)'; // Verde
}

/**
 * Configura os listeners de eventos para elementos da UI que não disparam lógica de dados complexa.
 */
export function setupUiListeners() {
    // Listener para o checkbox de cônjuge
    document.getElementById('conjugeParticipa').addEventListener('change', toggleConjuge);

    // Listener para o botão de cancelar no modal
    document.querySelector('#suspensaoModal button[onclick*="none"]').addEventListener('click', fecharModalSuspensao);
}
