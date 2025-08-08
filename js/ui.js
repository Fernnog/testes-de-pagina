// js/ui.js

import { membros, restricoes, restricoesPermanentes, escalasSalvas } from './data-manager.js';
import { saoCompativeis } from './availability.js';

// =========================================================
// === SEÇÃO DE CONFIGURAÇÃO E ESTADO ===
// =========================================================

const VISUAL_CONFIG = {
    turnos: {
        'Quarta':              { cardClass: 'turno-quarta', indicatorClass: 'indicator-quarta' },
        'Domingo Manhã':       { cardClass: 'turno-domingo-manha', indicatorClass: 'indicator-domingo-manha' },
        'Domingo Noite':       { cardClass: 'turno-domingo-noite', indicatorClass: 'indicator-domingo-noite' },
        'Sábado':              { cardClass: 'turno-sabado', indicatorClass: 'indicator-sabado' },
        'Oração no WhatsApp':  { cardClass: 'turno-oracao', indicatorClass: 'indicator-oracao' }
    },
    status: {
        disponivel:   { type: 'fa', value: 'fa-check-circle',   classe: 'status-disponivel',    titulo: 'Disponível para este turno' },
        permanente:   { type: 'emoji', value: '⛔',              classe: 'status-restrito-perm', titulo: 'Possui restrição permanente para este turno' },
        temporaria:   { type: 'emoji', value: '🚫',              classe: 'status-restrito-temp', titulo: 'Possui restrição temporária (ex: férias) neste dia' },
        suspenso:     { type: 'fa', value: 'fa-pause-circle',   classe: 'status-suspenso',      titulo: 'Está suspenso desta categoria de escala' }
    }
};

function getStatusIconHTML(statusConfig) {
    if (statusConfig.type === 'emoji') {
        return `<span class="status-icon status-emoji ${statusConfig.classe}" title="${statusConfig.titulo}">${statusConfig.value}</span>`;
    }
    return `<i class="fas ${statusConfig.value} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
}

// Armazenamento de estado para manipulação da UI
export let escalaAtual = [];
let justificationDataAtual = {};
let todasAsRestricoes = [];
let todasAsRestricoesPerm = [];


// =========================================================
// === SEÇÃO DE FUNÇÕES DE ATUALIZAÇÃO DA UI ===
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
                    <button class="secondary-button" onclick="window.abrirModalSuspensao(${index})">Gerenciar Suspensão</button>
                    <button onclick="window.excluirMembro(${index})">Excluir</button>
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
        <button onclick="window.excluirRestricao(${index})">Excluir</button></li>`).join('');
}

function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="window.excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}

function atualizarListaEscalasSalvas() {
    const lista = document.getElementById('listaEscalasSalvas');
    if (!lista) return;

    escalasSalvas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    
    lista.innerHTML = escalasSalvas.map(escala => `
        <li data-id="${escala.id}">
            <span>${escala.nome}</span>
            <div>
                <button class="secondary-button" data-action="load">Carregar</button>
                <button class="secondary-button" data-action="rename">Renomear</button>
                <button data-action="delete">Excluir</button>
            </div>
        </li>
    `).join('');
}

export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
    atualizarListaEscalasSalvas();
}

export function abrirModalAcaoEscala(action, escalaId = null, escalaNome = '') {
    const modal = document.getElementById('escalaActionModal');
    const title = document.getElementById('escalaModalTitle');
    const body = document.getElementById('escalaModalBody');
    document.getElementById('escalaModalAction').value = action;
    document.getElementById('escalaModalId').value = escalaId;

    if (action === 'save' || action === 'rename') {
        title.textContent = action === 'save' ? 'Salvar Escala' : 'Renomear Escala';
        const defaultName = (action === 'save')
            ? `Escala de ${new Date().toLocaleDateString('pt-BR')}`
            : escalaNome;
        body.innerHTML = `
            <div class="input-group">
                <input type="text" id="escalaModalInputName" value="${defaultName}" required placeholder=" ">
                <label for="escalaModalInputName">Nome da Escala</label>
            </div>`;
    } else if (action === 'delete') {
        title.textContent = 'Confirmar Exclusão';
        body.innerHTML = `<p>Você tem certeza que deseja excluir a escala "<strong>${escalaNome}</strong>"? Esta ação não pode ser desfeita.</p>`;
    }

    modal.style.display = 'flex';
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

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
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
        while (row.length < headers.length) { row.push(''); }
        dadosEscala.push(row);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}


// =========================================================================
// === SEÇÃO DE FUNÇÕES DE RENDERIZAÇÃO DA ESCALA E ANÁLISE ===
// =========================================================================

function _analisarConcentracao(diasGerados) {
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
        const membrosDoTurno = [];
        let totalParticipacoesNoTurno = 0;
        let membrosDisponiveisCount = 0;

        membros.forEach(membro => {
            let isDisponivel = true;
            let status = { type: 'disponivel' };
            
            if (membro.suspensao.cultos) {
                isDisponivel = false;
                status = { type: 'suspenso' };
            } else if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
                isDisponivel = false;
            }
            
            if (isDisponivel) {
                membrosDisponiveisCount++;
            }

            const participacoes = diasGerados.filter(d => d.tipo === turno && d.selecionados.some(s => s.nome === membro.nome)).length;
            totalParticipacoesNoTurno += participacoes;

            membrosDoTurno.push({
                nome: membro.nome,
                participacoes: participacoes,
                status: status
            });
        });

        analise[turno] = {
            totalParticipacoesNoTurno: totalParticipacoesNoTurno,
            membrosDisponiveis: membrosDisponiveisCount,
            membrosDoTurno: membrosDoTurno.sort((a, b) => b.participacoes - a.participacoes)
        };
    });
    return analise;
}

export function renderAnaliseConcentracao(filtro = 'all') {
    const container = document.getElementById('diagnosticReportContainer');
    if (!container) return;

    const analise = _analisarConcentracao(escalaAtual);
    let contentHTML = '';

    if (filtro === 'all') {
        const participacoesGlobais = {};
        membros.forEach(m => {
            participacoesGlobais[m.nome] = { total: 0 };
        });

        escalaAtual.forEach(dia => {
            dia.selecionados.forEach(membro => {
                const nomeMembro = membro.nome;
                if (participacoesGlobais[nomeMembro]) {
                    participacoesGlobais[nomeMembro].total++;
                    participacoesGlobais[nomeMembro][dia.tipo] = (participacoesGlobais[nomeMembro][dia.tipo] || 0) + 1;
                }
            });
        });

        const listaMembrosHtml = Object.entries(participacoesGlobais)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([nome, dados]) => {
                let maxTurnoCount = 0;
                const dadosTurnos = Object.entries(dados).filter(([key]) => key !== 'total');
                
                dadosTurnos.forEach(([, contagem]) => {
                    if (contagem > maxTurnoCount) maxTurnoCount = contagem;
                });

                const isUnbalanced = dados.total > 2 && (maxTurnoCount / dados.total > 0.7);
                const balanceAlertHtml = isUnbalanced 
                    ? `<i class="fas fa-exclamation-triangle balance-warning" title="Atenção: Participação concentrada em um único tipo de turno."></i>` 
                    : '';

                const breakdownHtml = dadosTurnos
                    .map(([turno, contagem]) => {
                        const indicatorClass = VISUAL_CONFIG.turnos[turno]?.indicatorClass || '';
                        return `<span class="turn-detail" title="${contagem} participação(ões) em: ${turno}">
                                    <span class="turn-indicator ${indicatorClass}"></span> ${contagem}
                                </span>`;
                    }).join('');

                return `<li>
                            <span>
                                <strong>${nome}:</strong> ${dados.total} vez(es)
                                ${balanceAlertHtml}
                            </span>
                            ${breakdownHtml ? `<div class="analysis-details">(${breakdownHtml})</div>` : ''}
                        </li>`;
            })
            .join('');

        contentHTML = `
            <div class="analysis-content">
                <div class="analise-turno-bloco">
                    <h5>Análise Global Consolidada</h5>
                    <p>Total de participações e detalhamento por turno. Passe o mouse sobre os números para ver os detalhes.</p>
                    <ul>${listaMembrosHtml}</ul>
                </div>
            </div>`;

    } else {
        // Lógica para filtros específicos
        const turnosParaRenderizar = [filtro];
        contentHTML = turnosParaRenderizar
            .filter(turno => analise[turno])
            .map(turno => {
                const dados = analise[turno];
                const listaMembrosHtml = dados.membrosDoTurno.map(membro => {
                    const statusConfig = VISUAL_CONFIG.status[membro.status.type];
                    const statusIcon = getStatusIconHTML(statusConfig);
                    return `<li><span><strong>${membro.nome}:</strong> ${membro.participacoes} vez(es)</span>${statusIcon}</li>`;
                }).join('');
                return `<div class="analise-turno-bloco"><h5>Análise: ${turno}</h5><p>Total de participações: <strong>${dados.totalParticipacoesNoTurno}</strong> | Membros disponíveis: <strong>${dados.membrosDisponiveis}</strong></p><ul>${listaMembrosHtml || '<li>Nenhuma análise disponível.</li>'}</ul></div>`;
            }).join('');
        contentHTML = contentHTML ? `<div class="analysis-content">${contentHTML}</div>` : '';
    }

    container.innerHTML = contentHTML;
    container.style.display = contentHTML ? 'block' : 'none';
}

export function renderEscalaEmCards(dias) {
    const diasValidos = dias.filter(dia => dia && dia.data instanceof Date);
    if (dias.length !== diasValidos.length) {
        console.warn('Itens de dia inválidos foram filtrados e não serão renderizados.');
    }

    escalaAtual = diasValidos;
    const container = document.getElementById('resultadoEscala');
    container.innerHTML = '';
    container.classList.add('escala-container');

    diasValidos.forEach(dia => {
        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { cardClass: '' };
        const cardHTML = `
            <div class="escala-card ${turnoConfig.cardClass}" data-id="${dia.id}" data-turno="${dia.tipo}">
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
}

/**
 * [NOVA FUNÇÃO ADICIONADA]
 * Calcula e exibe o índice de equilíbrio da escala com base nas participações.
 * @param {object} justificationData - Objeto com as contagens de participação de cada membro.
 */
export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    if (!container) return;

    const counts = Object.values(justificationData).map(d => d.participations);
    if (counts.length === 0) {
        container.style.display = 'none';
        return;
    }

    const totalParticipations = counts.reduce((sum, count) => sum + count, 0);
    if (totalParticipations === 0) {
        container.style.display = 'none';
        return;
    }
    
    const mean = totalParticipations / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Converte o desvio padrão em um percentual de equilíbrio.
    // Quanto menor o desvio, mais perto de 100%.
    let balancePercentage = Math.max(0, 100 - (stdDev / mean) * 100);
    balancePercentage = Math.min(100, balancePercentage);

    container.style.display = 'block';
    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala <small>(clique para ver o relatório)</small></h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${balancePercentage.toFixed(2)}%;">
                ${balancePercentage.toFixed(0)}%
            </div>
        </div>
    `;

    const bar = container.querySelector('.balance-bar-foreground');
    if (balancePercentage < 60) {
        bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
    } else if (balancePercentage < 85) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #ffda58)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
    }
}

export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    newContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            newContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            const filtroSelecionado = e.target.dataset.filter;
            
            filtrarCards(filtroSelecionado);
            renderAnaliseConcentracao(filtroSelecionado);
            
            if (filtroSelecionado === 'all') {
                const resultadoContainer = document.getElementById('resultadoEscala');
                if (resultadoContainer) {
                    resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                const firstVisibleCard = document.querySelector(`.escala-card[data-turno="${filtroSelecionado}"]`);
                if (firstVisibleCard) {
                    firstVisibleCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
    });
}

export function renderDisponibilidadeGeral() {
    const container = document.getElementById('disponibilidadeContainer');
    if (!container) return;

    const turnos = ['Quarta', 'Domingo Manhã', 'Domingo Noite', 'Sábado', 'Oração no WhatsApp'];
    
    let contentHTML = '';
    turnos.forEach(turno => {
        const listaDisponiveis = [];
        const listaIndisponiveis = [];

        membros.forEach(membro => {
            let status = { type: 'disponivel' };
            let isDisponivel = true;
            
            let suspensaoKey;
            if (turno === 'Sábado') suspensaoKey = 'sabado';
            else if (turno === 'Oração no WhatsApp') suspensaoKey = 'whatsapp';
            else suspensaoKey = 'cultos';

            if (membro.suspensao[suspensaoKey]) {
                status = { type: 'suspenso' };
                isDisponivel = false;
            } else if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
                isDisponivel = false;
            }

            const statusConfig = VISUAL_CONFIG.status[status.type];
            const statusIcon = getStatusIconHTML(statusConfig);
            const membroHTML = `<li><span>${membro.nome}</span>${statusIcon}</li>`;

            if (isDisponivel) {
                listaDisponiveis.push(membroHTML);
            } else {
                listaIndisponiveis.push(membroHTML);
            }
        });

        contentHTML += `
            <div class="disponibilidade-turno-bloco">
                <h5>Turno: ${turno}</h5>
                <div class="list-container">
                    <div class="list-wrapper disponiveis">
                        <h6>Disponíveis (${listaDisponiveis.length})</h6>
                        <ul>${listaDisponiveis.join('') || '<li>Nenhum membro disponível.</li>'}</ul>
                    </div>
                    <div class="list-wrapper indisponiveis">
                        <h6>Indisponíveis (${listaIndisponiveis.length})</h6>
                        <ul>${listaIndisponiveis.join('') || '<li>Nenhum membro indisponível.</li>'}</ul>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = contentHTML;
}

// =========================================================================
// === SEÇÃO DE DRAG & DROP ===
// =========================================================================

function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaAlvo) return;

    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    if (!membroArrastadoObj) return;

    if (diaAlvo.selecionados.some(m => m.nome === nomeArrastado)) {
        showToast(`${nomeArrastado} já está escalado(a) neste dia. Ação cancelada.`, 'warning');
        return;
    }

    const diaAlvoData = new Date(diaAlvo.data); diaAlvoData.setHours(0,0,0,0);
    const temRestricaoTemp = todasAsRestricoes.some(r => r.membro === nomeArrastado && diaAlvoData >= new Date(r.inicio) && diaAlvoData <= new Date(r.fim));
    const temRestricaoPerm = todasAsRestricoesPerm.some(r => r.membro === nomeArrastado && r.diaSemana === diaAlvo.tipo);

    if (temRestricaoTemp || temRestricaoPerm) {
        showToast(`${nomeArrastado} tem uma restrição para ${diaAlvo.tipo} neste dia.`, 'error');
        return;
    }

    const outrosMembrosNoCard = diaAlvo.selecionados.filter(m => m.nome !== nomeAlvo);
    let isCompativel = true;
    for (const companheiro of outrosMembrosNoCard) {
        if (!saoCompativeis(membroArrastadoObj, companheiro)) {
            isCompativel = false;
            break;
        }
    }

    if (!isCompativel) {
        showToast('Ação inválida. A dupla formada não segue a regra de mesmo gênero ou cônjuges.', 'error');
        return;
    }

    const indexAlvoDestino = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    if (indexAlvoDestino === -1) return;

    diaAlvo.selecionados.splice(indexAlvoDestino, 1, membroArrastadoObj);

    if (justificationDataAtual[nomeAlvo]) {
        justificationDataAtual[nomeAlvo].participations--;
    }
    if (justificationDataAtual[nomeArrastado]) {
        justificationDataAtual[nomeArrastado].participations++;
    }

    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    
    const filtroAtivo = document.querySelector('#escala-filtros button.active')?.dataset.filter || 'all';
    renderAnaliseConcentracao(filtroAtivo);

    showToast(`${nomeArrastado} foi adicionado(a) à escala, substituindo ${nomeAlvo}.`, 'success');
}


export function configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes) {
    escalaAtual = dias;
    justificationDataAtual = justificationData;
    todasAsRestricoes = restricoes;
    todasAsRestricoesPerm = restricoesPermanentes;

    const membrosCards = document.querySelectorAll('.membro-card');
    membrosCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.nome);
            e.dataTransfer.setData('card-id', e.target.closest('.escala-card').dataset.id);
        });

        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!e.target.classList.contains('dragging')) {
                e.target.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.target.classList.remove('drag-over');
            const nomeArrastado = e.dataTransfer.getData('text/plain');
            const cardOrigemId = e.dataTransfer.getData('card-id');
            const nomeAlvo = e.target.dataset.nome;
            const cardAlvoId = e.target.closest('.escala-card').dataset.id;
            
            if (nomeArrastado === nomeAlvo) return;
            
            remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId);
        });
    });
}
