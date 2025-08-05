import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
// ARQUIVO: ui.js
// RESPONSABILIDADE: Gerenciar todas as interações e atualizações da interface do usuário (DOM).
// Não contém lógica de negócio, apenas recebe dados e os exibe.

// Configuração visual centralizada para ícones e classes, facilitando a manutenção.
const VISUAL_CONFIG = {
    turnos: {
        'Quarta':              { classe: 'turno-quarta' },
        'Domingo Manhã':       { classe: 'turno-domingo-manha' },
        'Domingo Noite':       { classe: 'turno-domingo-noite' },
        'Sábado':              { classe: 'turno-sabado' },
        'Oração no WhatsApp':  { classe: 'turno-oracao' }
    },
    status: {
        disponivel:   { type: 'fa', value: 'fa-check-circle',   classe: 'status-disponivel',    titulo: 'Disponível para este turno' },
        permanente:   { type: 'emoji', value: '⛔',              classe: 'status-restrito-perm', titulo: 'Possui restrição permanente para este turno' },
        temporaria:   { type: 'emoji', value: '🚫',              classe: 'status-restrito-temp', titulo: 'Possui restrição temporária (ex: férias) neste dia' },
        suspenso:     { type: 'fa', value: 'fa-pause-circle',   classe: 'status-suspenso',      titulo: 'Está suspenso desta categoria de escala' }
    }
};

/**
 * Gera o HTML para um ícone de status com base na configuração.
 * @param {object} statusConfig - A configuração do status de VISUAL_CONFIG.
 * @returns {string} O HTML do ícone.
 */
function getStatusIconHTML(statusConfig) {
    if (!statusConfig) return ''; // Retorno seguro caso a configuração não exista
    if (statusConfig.type === 'emoji') {
        return `<span class="status-icon status-emoji ${statusConfig.classe}" title="${statusConfig.titulo}">${statusConfig.value}</span>`;
    }
    return `<i class="fas ${statusConfig.value} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
}

// --- Armazenamento de estado da UI para manipulação da escala ---
let escalaAtual = [];
let analiseAtual = {};

// =========================================================
// === SEÇÃO DE FUNÇÕES DE RENDERIZAÇÃO DE LISTAS E DADOS ===
// =========================================================

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
            if(susp.cultos) suspensoDe.push('Cultos');
            if(susp.sabado) suspensoDe.push('Sábado');
            if(susp.whatsapp) suspensoDe.push('WhatsApp');
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
                    <button class="secondary-button" onclick="abrirModalSuspensao(${index})">Gerenciar Suspensão</button>
                    <button onclick="excluirMembro(${index})">Excluir</button>
                </div>
            </li>`;
    }).join('');
    document.getElementById('maleCount').textContent = maleCount;
    document.getElementById('femaleCount').textContent = femaleCount;
    document.getElementById('totalCount').textContent = membros.length;
}

function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button onclick="excluirRestricao(${index})">Excluir</button></li>`).join('');
}

function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}

/**
 * Função central que chama todas as funções de atualização de listas.
 */
export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

// =====================================================
// === SEÇÃO DE CONTROLE GERAL DA UI E INTERATIVIDADE ===
// =====================================================

export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    const tabToShow = document.getElementById(tabId);
    if (tabToShow) {
        tabToShow.style.display = 'block';
    }
}

export function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

export function setupUiListeners() {
    document.getElementById('conjugeParticipa').addEventListener('change', toggleConjuge);
}

/**
 * PRIORITY 2: Exibe uma notificação flutuante (toast).
 * Esta função será usada para fornecer feedback de "salvamento automático".
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success', 'warning', 'error').
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // O toast se remove automaticamente após 5 segundos.
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ===================================================================
// === SEÇÃO DE GERAÇÃO DA ESCALA (VISUALIZAÇÃO, FILTROS, DRAG & DROP) ===
// ===================================================================

export function renderEscalaEmCards(dias) {
    escalaAtual = dias; // Atualiza o estado local da escala
    const container = document.getElementById('resultadoEscala');
    container.innerHTML = '';
    container.classList.add('escala-container');
    dias.forEach(dia => {
        if (dia.selecionados.length === 0) return;
        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { classe: '' };
        const cardHTML = `
            <div class="escala-card ${turnoConfig.classe}" data-id="${dia.id}" data-turno="${dia.tipo}">
                <div class="escala-card__header">
                    <h4>${dia.tipo}</h4>
                    <span>${dia.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
                <div class="escala-card__body">
                    ${dia.selecionados.map(m => `<div class="membro-card" draggable="true" data-nome="${m.nome}">${m.nome}</div>`).join('')}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
    // Reconfigura o drag and drop para os novos cards
    configurarDragAndDrop();
}

/**
 * PRIORITY 1: Renderiza o novo painel de análise lateral.
 * @param {object} analise - O objeto de análise gerado pelo schedule-generator.
 * @param {string} filtroTurno - O filtro de turno atualmente ativo ('all', 'Quarta', etc.).
 */
export function renderPainelAnalise(analise, filtroTurno = 'all') {
    analiseAtual = analise; // Armazena a análise completa
    const container = document.getElementById('painelAnaliseLateral');
    if (!container) return;

    const turnosParaAnalisar = filtroTurno === 'all'
        ? Object.keys(analise)
        : (analise[filtroTurno] ? [filtroTurno] : []);

    let membrosAgregados = {};
    membros.forEach(m => {
        membrosAgregados[m.nome] = { participacoes: 0, status: null, restricaoInfo: '' };
    });

    turnosParaAnalisar.forEach(turno => {
        analise[turno].membrosDoTurno.forEach(membroAnalisado => {
            membrosAgregados[membroAnalisado.nome].participacoes += membroAnalisado.participacoes;
            
            // Prioriza o status mais restritivo para exibição
            if (!membrosAgregados[membroAnalisado.nome].status || membroAnalisado.status.type !== 'disponivel') {
                membrosAgregados[membroAnalisado.nome].status = membroAnalisado.status;
            }
        });
    });

    // Adiciona informações de restrição temporária
    restricoes.forEach(r => {
        if (membrosAgregados[r.membro]) {
             const inicio = new Date(r.inicio).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
             const fim = new Date(r.fim).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
             membrosAgregados[r.membro].restricaoInfo = `(${inicio} a ${fim})`;
        }
    });

    const listaMembrosOrdenada = Object.entries(membrosAgregados).sort((a, b) => b[1].participacoes - a[1].participacoes);

    const listaHtml = listaMembrosOrdenada.map(([nome, dados]) => {
        const statusConfig = VISUAL_CONFIG.status[dados.status?.type || 'disponivel'];
        const statusIcon = getStatusIconHTML(statusConfig);
        const infoExtra = dados.status?.type === 'temporaria' ? `<span class="restriction-info">${dados.restricaoInfo}</span>` : '';
        
        return `<li>
                    <span>
                        <strong>${nome}:</strong> ${dados.participacoes} vez(es)
                        ${infoExtra}
                    </span>
                    ${statusIcon}
                </li>`;
    }).join('');

    container.innerHTML = `<h4>Análise de Equilíbrio</h4><ul>${listaHtml}</ul>`;
}


/**
 * PRIORITY 1: Modificado para atualizar o painel lateral ao filtrar.
 * @param {Array} dias - A lista de dias da escala.
 * @param {object} analise - O relatório de análise de concentração.
 */
export function renderizarFiltros(dias, analise) {
    const container = document.getElementById('escala-filtros');
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    
    container.innerHTML = `<button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    
    // Delegação de evento para performance
    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            container.querySelector('.active')?.classList.remove('active');
            e.target.classList.add('active');
            const filtro = e.target.dataset.filter;
            filtrarCards(filtro);
            renderPainelAnalise(analise, filtro); // Atualiza o painel lateral
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
    });
}

/**
 * PRIORITY 1: Lógica de arrastar e soltar implementada como SWAP (troca).
 */
function configurarDragAndDrop() {
    const membrosCards = document.querySelectorAll('.membro-card');
    membrosCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    const dragData = {
        nome: e.target.dataset.nome,
        cardOrigemId: e.target.closest('.escala-card').dataset.id
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.membro-card');
    if (dropTarget && !dropTarget.classList.contains('dragging')) {
        dropTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const dropTarget = e.target.closest('.membro-card');
    if (dropTarget) {
        dropTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.membro-card');
    if (!dropTarget) return;

    dropTarget.classList.remove('drag-over');
    const dadosArrastados = JSON.parse(e.dataTransfer.getData('application/json'));
    const nomeAlvo = dropTarget.dataset.nome;
    const cardAlvoId = dropTarget.closest('.escala-card').dataset.id;
    
    if (dadosArrastados.cardOrigemId === cardAlvoId && dadosArrastados.nome === nomeAlvo) return;
    
    remanejarMembro(dadosArrastados.nome, nomeAlvo, dadosArrastados.cardOrigemId, cardAlvoId);
}

/**
 * PRIORITY 1: Lógica de troca de membros (swap) entre cards.
 * @param {string} nomeArrastado - Nome do membro sendo movido.
 * @param {string} nomeAlvo - Nome do membro que está no local de destino.
 * @param {string} cardOrigemId - ID do card de origem.
 * @param {string} cardAlvoId - ID do card de destino.
 */
function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaOrigem || !diaAlvo) return;
    
    // A lógica de uma troca (swap) é a mais segura para manter a integridade da escala.
    const membroArrastadoObj = diaOrigem.selecionados.find(m => m.nome === nomeArrastado);
    const membroAlvoObj = diaAlvo.selecionados.find(m => m.nome === nomeAlvo);

    // Validação bidirecional para a troca
    // (Esta é uma simplificação. Uma validação completa usaria a função 'checkMemberAvailability')
    const restricaoArrastado = restricoesPermanentes.some(r => r.membro === nomeArrastado && r.diaSemana === diaAlvo.tipo);
    const restricaoAlvo = restricoesPermanentes.some(r => r.membro === nomeAlvo && r.diaSemana === diaOrigem.tipo);
    if(restricaoArrastado || restricaoAlvo) {
        showToast(`A troca não pode ser realizada devido a restrições permanentes.`, 'warning');
        return;
    }

    // Realiza a troca no estado da escala
    const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
    const indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    
    diaOrigem.selecionados.splice(indexOrigem, 1, membroAlvoObj);
    diaAlvo.selecionados.splice(indexAlvo, 1, membroArrastadoObj);

    // Re-renderiza a UI para refletir a troca
    renderEscalaEmCards(escalaAtual);
    
    // Atualiza o painel de análise para refletir a nova distribuição
    const filtroAtivo = document.querySelector('#escala-filtros button.active')?.dataset.filter || 'all';
    renderPainelAnalise(analiseAtual, filtroAtivo);
    showToast(`Troca entre ${nomeArrastado} e ${nomeAlvo} realizada.`, 'success');
}


export function exportarEscalaXLSX() {
    const listaCards = document.querySelectorAll('.escala-card:not(.hidden)');
    if (listaCards.length === 0) {
        showToast('Não há escala visível para exportar. Verifique os filtros.', 'warning');
        return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ['Data', 'Turno', 'Membro 1', 'Membro 2', 'Membro 3'];
    const dadosEscala = [headers];
    listaCards.forEach(card => {
        const data = card.querySelector('.escala-card__header span').textContent.trim();
        const tipo = card.querySelector('.escala-card__header h4').textContent.trim();
        const membrosNodes = card.querySelectorAll('.membro-card');
        const nomes = Array.from(membrosNodes).map(node => node.textContent.trim());
        const row = [data, tipo, ...nomes];
        while (row.length < headers.length) {
            row.push('');
        }
        dadosEscala.push(row);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}
