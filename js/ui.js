import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { checkMemberAvailability } from './availability.js'; // Importa a função de validação
import { analisarConcentracao } from './schedule-generator.js'; // Importa a função de análise

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

function getStatusIconHTML(statusConfig) {
    if (statusConfig.type === 'emoji') {
        return `<span class="status-icon status-emoji ${statusConfig.classe}" title="${statusConfig.titulo}">${statusConfig.value}</span>`;
    }
    return `<i class="fas ${statusConfig.value} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
}

// --- Armazenamento de estado para manipulação da UI ---
let escalaAtual = [];
let justificationDataAtual = {};
let todasAsRestricoes = [];
let todasAsRestricoesPerm = [];

// =========================================================
// === SEÇÃO DE CÓDIGO SEM ALTERAÇÕES (EXISTENTE E ESTÁVEL) ===
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
        dadosEscala.push([data, tipo, ...nomes]);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

// =========================================================
// SEÇÃO DE CÓDIGO COM AS NOVAS FUNCIONALIDADES E MELHORIAS
// =========================================================

/**
 * Renderiza o painel lateral com a análise de equilíbrio da escala.
 * @param {Object} analise - O objeto de análise gerado por `analisarConcentracao`.
 * @param {string} filtroTurno - O turno atualmente selecionado no filtro ('all' para todos).
 */
export function renderPainelAnalise(analise, filtroTurno = 'all') {
    const container = document.getElementById('painelAnaliseLateral');
    if (!container) return;

    const turnosParaAnalisar = filtroTurno === 'all' 
        ? Object.keys(analise) 
        : [filtroTurno];

    let membrosAgregados = {};
    membros.forEach(m => {
        membrosAgregados[m.nome] = { participacoes: 0, status: null, temRestricaoTemp: false };
    });

    turnosParaAnalisar.forEach(turno => {
        if (!analise[turno]) return;
        analise[turno].membrosDoTurno.forEach(membroAnalisado => {
            membrosAgregados[membroAnalisado.nome].participacoes += membroAnalisado.participacoes;
            if (!membrosAgregados[membroAnalisado.nome].status || membroAnalisado.status.type !== 'disponivel') {
                membrosAgregados[membroAnalisado.nome].status = membroAnalisado.status;
            }
            if (membroAnalisado.status.type === 'temporaria') {
                membrosAgregados[membroAnalisado.nome].temRestricaoTemp = true;
            }
        });
    });

    const listaMembrosOrdenada = Object.entries(membrosAgregados).sort((a, b) => b[1].participacoes - a[1].participacoes);

    const listaHtml = listaMembrosOrdenada.map(([nome, dados]) => {
        let infoExtra = '';
        if (dados.temRestricaoTemp) {
            const restricao = restricoes.find(r => r.membro === nome);
            if (restricao) {
                const inicio = new Date(restricao.inicio).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                const fim = new Date(restricao.fim).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                infoExtra = `<span class="restriction-info">(${inicio} a ${fim})</span>`;
            }
        }
        const statusIcon = getStatusIconHTML(VISUAL_CONFIG.status[dados.status?.type || 'disponivel']);
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

export function renderEscalaEmCards(dias) {
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
                <div class="escala-card__body" data-card-body-id="${dia.id}">
                    ${dia.selecionados.map(m => `<div class="membro-card" draggable="true" data-nome="${m.nome}">${m.nome}</div>`).join('')}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

export function renderizarFiltros(dias, analise) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    
    // Limpa listeners antigos para evitar duplicação
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    newContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            newContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            const filtro = e.target.dataset.filter;
            filtrarCards(filtro);
            renderPainelAnalise(analise, filtro);
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
    });
}

/**
 * Configura todos os listeners de arrastar e soltar para a escala gerada.
 * @param {Array} dias - O estado atual da escala.
 * @param {Object} justificationData - O estado atual das contagens de participação.
 * @param {Array} restricoesAtuais - A lista de restrições temporárias.
 * @param {Array} restricoesPermAtuais - A lista de restrições permanentes.
 */
export function configurarDragAndDrop(dias, justificationData, restricoesAtuais, restricoesPermAtuais) {
    escalaAtual = dias;
    justificationDataAtual = justificationData;
    todasAsRestricoes = restricoesAtuais;
    todasAsRestricoesPerm = restricoesPermAtuais;

    const cardsDeDia = document.querySelectorAll('.escala-card');
    cardsDeDia.forEach(cardDia => {
        cardDia.addEventListener('dragover', e => {
            e.preventDefault();
            const membroArrastadoNome = JSON.parse(e.dataTransfer.getData('text/plain') || '{}').nome;
            if (!membroArrastadoNome) return;

            const diaAlvo = escalaAtual.find(d => d.id === cardDia.dataset.id);
            if (!diaAlvo) return;

            const membroArrastadoObj = membros.find(m => m.nome === membroArrastadoNome);
            const status = checkMemberAvailability(membroArrastadoObj, diaAlvo.tipo, diaAlvo.data);

            cardDia.classList.remove('drop-valid', 'drop-invalid');
            cardDia.classList.add(status.type === 'disponivel' ? 'drop-valid' : 'drop-invalid');
        });

        cardDia.addEventListener('dragleave', e => {
            e.currentTarget.classList.remove('drop-valid', 'drop-invalid');
        });

        cardDia.addEventListener('drop', e => {
            e.preventDefault();
            e.currentTarget.classList.remove('drop-valid', 'drop-invalid');
            
            const membroCardAlvo = e.target.closest('.membro-card');
            if (!membroCardAlvo) return;
            
            const dadosArrastados = JSON.parse(e.dataTransfer.getData('text/plain'));
            const nomeAlvo = membroCardAlvo.dataset.nome;
            const cardAlvoId = e.currentTarget.dataset.id;
            
            if (dadosArrastados.cardOrigemId === cardAlvoId && dadosArrastados.nome === nomeAlvo) return;

            remanejarMembro(dadosArrastados.nome, nomeAlvo, dadosArrastados.cardOrigemId, cardAlvoId);
        });
    });

    document.querySelectorAll('.membro-card').forEach(membroCard => {
        membroCard.addEventListener('dragstart', e => {
            e.stopPropagation();
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                nome: e.target.dataset.nome,
                cardOrigemId: e.target.closest('.escala-card').dataset.id
            }));
        });
        membroCard.addEventListener('dragend', e => e.target.classList.remove('dragging'));
    });
}

/**
 * Lida com a lógica de substituição de um membro por outro na escala.
 * @param {string} nomeArrastado - Nome do membro sendo movido.
 * @param {string} nomeAlvo - Nome do membro sendo substituído.
 * @param {string} cardOrigemId - ID do card de onde o membro saiu.
 * @param {string} cardAlvoId - ID do card para onde o membro vai.
 */
function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaOrigem || !diaAlvo) return;
    
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    const status = checkMemberAvailability(membroArrastadoObj, diaAlvo.tipo, diaAlvo.data);

    if (status.type !== 'disponivel') {
        showToast(`${nomeArrastado} não pode ser escalado aqui. Motivo: ${status.type}.`, 'error');
        return;
    }

    // Lógica de substituição (não de troca)
    const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
    if (indexOrigem > -1) {
        diaOrigem.selecionados.splice(indexOrigem, 1);
        justificationDataAtual[nomeArrastado].participations--;
    }

    const indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    if (indexAlvo > -1) {
        diaAlvo.selecionados.splice(indexAlvo, 1, membroArrastadoObj);
        justificationDataAtual[nomeAlvo].participations--;
        justificationDataAtual[nomeArrastado].participations++;
    }
    
    // Re-renderiza a UI com os dados atualizados
    renderEscalaEmCards(escalaAtual);
    const novoRelatorio = analisarConcentracao(escalaAtual);
    const filtroAtivo = document.querySelector('#escala-filtros .active')?.dataset.filter || 'all';
    renderPainelAnalise(novoRelatorio, filtroAtivo);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    showToast(`${nomeArrastado} substituiu ${nomeAlvo}.`, 'success');
}
