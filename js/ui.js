import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
// <-- ALTERAÇÃO: Importa a nova função de verificação -->
import { checkMemberAvailability } from './availability.js';

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

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
}

export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    const counts = Object.values(justificationData).map(p => p.participations);
    if (counts.length < 2) { container.style.display = 'none'; return; }
    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (media === 0) { container.style.display = 'none'; return; }
    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b) / counts.length);
    const score = Math.max(0, 100 - (desvioPadrao * 30));
    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala</h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${score.toFixed(1)}%;" id="balanceBar">
                ${score.toFixed(1)}%
            </div>
        </div>
        <small style="margin-top: 10px; display: inline-block;">Clique para ver análise detalhada.</small>`;
    container.style.display = 'block';
    const bar = document.getElementById('balanceBar');
    if (score < 50) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)';
    else if (score < 75) bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)';
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
}

export function setupAnaliseModalListeners() {
    const modal = document.getElementById('analiseConcentracaoModal');
    if (!modal) return;
    document.getElementById('btn-fechar-analise').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target.id === 'analiseConcentracaoModal') { modal.style.display = 'none'; } });
}


// =========================================================
// SEÇÃO DE CÓDIGO COM AS NOVAS FUNCIONALIDADES E MELHORIAS
// =========================================================

/**
 * <-- ALTERAÇÃO: Função exportarEscalaXLSX corrigida e aprimorada -->
 * Exporta a escala visível para um arquivo XLSX, com membros em colunas separadas.
 */
export function exportarEscalaXLSX() {
    const listaCards = document.querySelectorAll('.escala-card:not(.hidden)');
    if (listaCards.length === 0) {
        showToast('Não há escala visível para exportar. Verifique os filtros.', 'warning');
        return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ['Data', 'Turno', 'Membro 1', 'Membro 2']; // Ajustado para o padrão de 2 membros
    const dadosEscala = [headers];

    listaCards.forEach(card => {
        const data = card.querySelector('.escala-card__header span').textContent.trim();
        const tipo = card.querySelector('.escala-card__header h4').textContent.trim();
        const membrosNodes = card.querySelectorAll('.membro-card');
        const nomes = Array.from(membrosNodes).map(node => node.textContent.trim());
        
        // Correção principal: espalha os nomes em colunas diferentes
        dadosEscala.push([data, tipo, ...nomes]);
    });

    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

/**
 * <-- ALTERAÇÃO: Nova função para renderizar o painel de disponibilidade com filtros -->
 * Gera o conteúdo do painel de disponibilidade geral com base no status de cada membro por turno.
 */
export function renderDisponibilidadeGeral() {
    const container = document.getElementById('disponibilidadeContainer');
    if (!container) return;

    const tab = container.closest('.tab');
    let filtrosContainer = tab.querySelector('.escala-filtros-container');
    if (!filtrosContainer) {
        filtrosContainer = document.createElement('div');
        filtrosContainer.className = 'escala-filtros-container';
        container.before(filtrosContainer);
    }
    
    // Renderiza os filtros
    filtrosContainer.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        <button data-filter="disponivel">Apenas Disponíveis</button>
        <button data-filter="restrito">Apenas Com Restrição</button>
    `;

    // Renderiza o conteúdo principal
    const turnos = ['Quarta', 'Domingo Manhã', 'Domingo Noite', 'Sábado'];
    let contentHTML = '';

    membros.sort((a, b) => a.nome.localeCompare(b.nome));

    turnos.forEach(turno => {
        const membrosDoTurnoHTML = membros.map(membro => {
            // Usa a nova função centralizada para verificar o status
            const status = checkMemberAvailability(membro, turno);
            const statusConfig = VISUAL_CONFIG.status[status.type];
            const statusIcon = `<i class="fas ${statusConfig.icone} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
            
            // Adiciona a classe do status ao <li> para facilitar a filtragem
            return `<li class="status-item-${status.type}">${membro.nome} ${statusIcon}</li>`;
        }).join('');

        contentHTML += `
            <div class="disponibilidade-turno-bloco">
                <h5>${turno}</h5>
                <ul>${membrosDoTurnoHTML}</ul>
            </div>
        `;
    });
    container.innerHTML = contentHTML;

    // Adiciona o listener para os filtros
    filtrosContainer.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        filtrosContainer.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');
        const filtro = e.target.dataset.filter;
        
        tab.querySelectorAll('.disponibilidade-turno-bloco ul li').forEach(li => {
            let mostrar = false;
            if (filtro === 'all') {
                mostrar = true;
            } else if (filtro === 'disponivel') {
                mostrar = li.classList.contains('status-item-disponivel');
            } else if (filtro === 'restrito') {
                mostrar = li.classList.contains('status-item-suspenso') || li.classList.contains('status-item-permanente');
            }
            li.style.display = mostrar ? 'flex' : 'none';
        });
    });
}

// ============================================================
// === O RESTANTE DO ARQUIVO (DRAG & DROP) PERMANECE O MESMO ===
// ============================================================

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
                <div class="escala-card__body">
                    ${dia.selecionados.map(m => `<div class="membro-card" draggable="true">${m.nome}</div>`).join('')}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            container.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filtrarCards(e.target.dataset.filter);
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
    });
}

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
                <p>Total de participações no mês: <strong>${dados.totalParticipacoesNoTurno}</strong></p>
                <p>Membros disponíveis para este turno: <strong>${dados.membrosDisponiveis}</strong></p>
                <h6>Análise de Disponibilidade Individual:</h6>
                <ul>${listaMembrosHtml}</ul>
            </div>`;
    }).join('');
    document.getElementById('analiseConcentracaoModal').style.display = 'flex';
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
            e.dataTransfer.setData('text/plain', JSON.stringify({
                nome: e.target.textContent,
                cardOrigemId: e.target.closest('.escala-card').dataset.id
            }));
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
            const dadosArrastados = JSON.parse(e.dataTransfer.getData('text/plain'));
            const nomeAlvo = e.target.textContent;
            const cardAlvoId = e.target.closest('.escala-card').dataset.id;
            
            if (dadosArrastados.cardOrigemId === cardAlvoId && dadosArrastados.nome === nomeAlvo) return;
            remanejarMembro(dadosArrastados.nome, nomeAlvo, dadosArrastados.cardOrigemId, cardAlvoId);
        });
    });
}

function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaOrigem || !diaAlvo) return;
    
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    const statusNoAlvo = checkMemberAvailability(membroArrastadoObj, diaAlvo.tipo, diaAlvo.data);
    
    if (statusNoAlvo.type !== 'disponivel') {
        showToast(`${nomeArrastado} tem uma restrição (${statusNoAlvo.type}) para este dia e não pode ser escalado.`, 'warning');
        return;
    }

    const membroAlvoObj = membros.find(m => m.nome === nomeAlvo);
    const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
    diaOrigem.selecionados.splice(indexOrigem, 1, membroAlvoObj);
    const indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    diaAlvo.selecionados.splice(indexAlvo, 1, membroArrastadoObj);

    if (cardOrigemId !== cardAlvoId) {
        justificationDataAtual[nomeArrastado].participations++;
        justificationDataAtual[nomeAlvo].participations--;
    }
    
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
}
