// ui.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

// --- ESTADO DA UI PÓS-GERAÇÃO ---
// Armazena a escala e os dados de justificação para manipulação em tempo real
let escalaAtual = [];
let justificationDataAtual = {};

// =================== CONFIGURAÇÃO VISUAL CENTRALIZADA ===================
const VISUAL_CONFIG = {
    turnos: {
        'Quarta':              { classe: 'turno-quarta' },
        'Domingo Manhã':       { classe: 'turno-domingo-manha' },
        'Domingo Noite':       { classe: 'turno-domingo-noite' },
        'Sábado':              { classe: 'turno-sabado' },
        'Oração no WhatsApp':  { classe: 'turno-oracao' }
    },
    status: {
        disponivel:   { icone: 'fa-check-circle',   classe: 'status-disponivel',    titulo: 'Disponível para este turno' },
        permanente:   { icone: 'fa-ban',            classe: 'status-restrito-perm', titulo: 'Possui restrição permanente para este turno' },
        temporaria:   { icone: 'fa-calendar-times', classe: 'status-restrito-temp', titulo: 'Possui restrição temporária (ex: férias) neste dia' },
        suspenso:     { icone: 'fa-pause-circle',   classe: 'status-suspenso',      titulo: 'Está suspenso desta categoria de escala' }
    }
};

// =================== FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA UI (EXISTENTES) ===================

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

export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

export function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

export function setupUiListeners() {
    document.getElementById('conjugeParticipa').addEventListener('change', toggleConjuge);
}

export function showToast(message, type = 'warning') { // Default para 'warning' para erros
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    const counts = Object.values(justificationData).map(p => p.participations);
    if (counts.length < 2) {
        container.style.display = 'none';
        return;
    }

    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (media === 0) {
        container.style.display = 'none';
        return;
    }

    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b) / counts.length);
    const score = Math.max(0, 100 - (desvioPadrao * 30));

    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala</h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${score.toFixed(1)}%;" id="balanceBar">
                ${score.toFixed(1)}%
            </div>
        </div>
        <small style="margin-top: 10px; display: inline-block;">Clique para ver análise detalhada.</small>
    `;
    container.style.display = 'block';

    const bar = document.getElementById('balanceBar');
    if (score < 50) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)';
    else if (score < 75) bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)';
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
}

// =================== NOVAS FUNÇÕES (PRIORIDADE 1 e 2) ===================

/**
 * Renderiza os botões de filtro com base nos turnos presentes na escala.
 * @param {Array} dias - A lista de dias da escala gerada.
 */
export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    
    // Limpa filtros antigos antes de renderizar novos
    container.innerHTML = '';
    
    // Cria um conjunto de turnos únicos para não repetir botões
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) return; // Não mostra filtros se só há um tipo de turno

    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}
    `;

    // Adiciona o listener para os botões de forma delegada
    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            container.querySelector('button.active').classList.remove('active');
            e.target.classList.add('active');
            const filtro = e.target.dataset.filter;
            filtrarCards(filtro);
        }
    });
}

/**
 * Aplica o filtro visual aos cards da escala, escondendo os que não correspondem.
 * @param {string} filtro - O turno a ser exibido, ou "all" para todos.
 */
function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        if (filtro === 'all' || card.dataset.turno === filtro) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

/**
 * Lógica central para remanejar um membro, incluindo validação de regras.
 * @param {string} nomeArrastado - Nome do membro sendo movido.
 * @param {string} nomeAlvo - Nome do membro que está sendo substituído.
 * @param {string} cardOrigemId - ID do card de onde o membro saiu.
 * @param {string} cardAlvoId - ID do card para onde o membro vai.
 */
function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    // Encontra os dias e membros no estado
    const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    const membroArrastado = membros.find(m => m.nome === nomeArrastado);
    const membroAlvo = membros.find(m => m.nome === nomeAlvo);
    
    // --- Lógica de Validação (Prioridade 2) ---
    const validarMovimento = (membro, dia) => {
        // 1. Validação de Suspensão
        let isSuspended = false;
        if (dia.tipo === 'Quarta' || dia.tipo.startsWith('Domingo')) isSuspended = membro.suspensao.cultos;
        else if (dia.tipo === 'Sábado') isSuspended = membro.suspensao.sabado;
        else if (dia.tipo === 'Oração no WhatsApp') isSuspended = membro.suspensao.whatsapp;
        if (isSuspended) {
            showToast(`${membro.nome} está suspenso para a categoria "${dia.tipo}".`);
            return false;
        }

        // 2. Validação de Restrição Permanente
        const restricaoPerm = restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === dia.tipo);
        if (restricaoPerm) {
            showToast(`${membro.nome} tem restrição permanente para "${dia.tipo}".`);
            return false;
        }

        // 3. Validação de Restrição Temporária
        const diaAtual = new Date(dia.data); diaAtual.setHours(0, 0, 0, 0);
        const restricaoTemp = restricoes.some(r => {
            const rInicio = new Date(r.inicio); rInicio.setHours(0, 0, 0, 0);
            const rFim = new Date(r.fim); rFim.setHours(0, 0, 0, 0);
            return r.membro === membro.nome && diaAtual >= rInicio && diaAtual <= rFim;
        });
        if (restricaoTemp) {
            showToast(`${membro.nome} tem restrição temporária nesta data.`);
            return false;
        }

        return true; // Movimento válido
    };

    if (!validarMovimento(membroArrastado, diaAlvo) || !validarMovimento(membroAlvo, diaOrigem)) {
        return; // Interrompe a troca se alguma validação falhar
    }

    // --- Atualização do Estado (Se a validação passou) ---
    const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
    diaOrigem.selecionados.splice(indexOrigem, 1, membroAlvo);
    
    const indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    diaAlvo.selecionados.splice(indexAlvo, 1, membroArrastado);
    
    // --- Re-renderização da UI ---
    showToast('Troca realizada com sucesso!', 'success');
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    configurarDragAndDrop(escalaAtual, justificationDataAtual);
}

/**
 * Configura todos os eventos de arrastar e soltar nos cards de membro.
 * @param {Array} dias - A lista de dias da escala.
 * @param {Object} justificationData - O objeto com as contagens de participação.
 */
export function configurarDragAndDrop(dias, justificationData) {
    escalaAtual = dias; // Salva o estado atual para manipulação
    justificationDataAtual = justificationData;

    const membrosCards = document.querySelectorAll('.membro-card');
    membrosCards.forEach(membro => {
        membro.setAttribute('draggable', true);

        membro.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                nome: e.target.textContent,
                cardOrigemId: e.target.closest('.escala-card').dataset.id
            }));
        });

        membro.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });

        membro.addEventListener('dragover', (e) => {
            e.preventDefault();
            const alvo = e.target.closest('.membro-card');
            if (alvo && !alvo.classList.contains('dragging')) {
                alvo.classList.add('drag-over');
            }
        });

        membro.addEventListener('dragleave', (e) => {
            const alvo = e.target.closest('.membro-card');
            if (alvo) {
                alvo.classList.remove('drag-over');
            }
        });

        membro.addEventListener('drop', (e) => {
            e.preventDefault();
            const alvo = e.target.closest('.membro-card');
            if (!alvo) return;
            
            alvo.classList.remove('drag-over');

            const dadosArrastados = JSON.parse(e.dataTransfer.getData('text/plain'));
            const nomeAlvo = alvo.textContent;
            const cardAlvoId = alvo.closest('.escala-card').dataset.id;
            
            if (dadosArrastados.cardOrigemId === cardAlvoId && dadosArrastados.nome === nomeAlvo) return;

            remanejarMembro(dadosArrastados.nome, nomeAlvo, dadosArrastados.cardOrigemId, cardAlvoId);
        });
    });
}

/**
 * Renderiza a escala gerada no formato de cards visuais. (ATUALIZADO)
 * @param {Array} dias - A lista de dias com os membros selecionados.
 */
export function renderEscalaEmCards(dias) {
    const container = document.getElementById('resultadoEscala');
    
    const filtroAtivoEl = document.querySelector('#escala-filtros button.active');
    const filtroAtivo = filtroAtivoEl ? filtroAtivoEl.dataset.filter : 'all';

    container.innerHTML = '';
    container.classList.add('escala-container');

    dias.forEach(dia => {
        if (dia.selecionados.length === 0) return;

        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { classe: '' };
        const isHidden = (filtroAtivo !== 'all' && dia.tipo !== filtroAtivo);
        
        const cardHTML = `
            <div class="escala-card ${turnoConfig.classe} ${isHidden ? 'hidden' : ''}" data-id="${dia.id}" data-turno="${dia.tipo}">
                <div class="escala-card__header">
                    <h4>${dia.tipo}</h4>
                    <span>${dia.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
                <div class="escala-card__body">
                    ${dia.selecionados.map(m => `<div class="membro-card">${m.nome}</div>`).join('')}
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

/**
 * Atualiza a função de exportação para ler os dados do estado atual.
 */
export function exportarEscalaXLSX() {
    // Se a escala foi gerada e possivelmente modificada, use `escalaAtual`.
    if (escalaAtual.length > 0) {
        const wb = XLSX.utils.book_new();
        const dadosEscala = [['Data', 'Turno', 'Membros']];
        
        escalaAtual.forEach(dia => {
            if (dia.selecionados.length > 0) {
                const data = dia.data.toLocaleDateString('pt-BR');
                const tipo = dia.tipo;
                const nomes = dia.selecionados.map(m => m.nome).join(', ');
                dadosEscala.push([data, tipo, nomes]);
            }
        });

        const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
        XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
        XLSX.writeFile(wb, 'escala_gerada.xlsx');
    } else {
        showToast('Não há escala gerada para exportar.', 'warning');
    }
}

// =================== FUNÇÕES DO MODAL (EXISTENTES) ===================

export function renderAnaliseConcentracao(analise) {
    const body = document.getElementById('analiseConcentracaoBody');
    body.innerHTML = Object.entries(analise).map(([turno, dados]) => {
        
        const listaMembrosHtml = dados.membrosDoTurno.map(membro => {
            const statusConfig = VISUAL_CONFIG.status[membro.status.type] || VISUAL_CONFIG.status.disponivel;
            const statusIcon = `<i class="fas ${statusConfig.icone} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
            return `
                <li>
                    <span><strong>${membro.nome}:</strong> ${membro.participacoes} vez(es)</span>
                    ${statusIcon}
                </li>`;
        }).join('');

        return `
            <div class="analise-turno-bloco">
                <h5>Turno: ${turno}</h5>
                <p>Total de participações neste turno durante o mês: <strong>${dados.totalParticipacoesNoTurno}</strong></p>
                <h6>Análise de Disponibilidade Individual:</h6>
                <ul>
                    ${listaMembrosHtml}
                </ul>
            </div>
        `;
    }).join('');

    document.getElementById('analiseConcentracaoModal').style.display = 'flex';
}

export function setupAnaliseModalListeners() {
    const modal = document.getElementById('analiseConcentracaoModal');
    if (!modal) return;
    
    document.getElementById('btn-fechar-analise').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target.id === 'analiseConcentracaoModal') {
            modal.style.display = 'none';
        }
    });
}
