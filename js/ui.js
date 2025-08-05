import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

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
    // O padrão continua sendo Font Awesome
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

export function setupAnaliseModalListeners() {
    const modal = document.getElementById('analiseConcentracaoModal');
    if (!modal) return;
    document.getElementById('btn-fechar-analise').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target.id === 'analiseConcentracaoModal') { modal.style.display = 'none'; } });
}


// =========================================================
// SEÇÃO DE CÓDIGO COM AS NOVAS FUNCIONALIDADES E MELHORIAS
// =========================================================

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
            const statusIcon = getStatusIconHTML(statusConfig);
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

export function renderDisponibilidadeGeral() {
    const container = document.getElementById('disponibilidadeContainer');
    if (!container) return;

    const turnos = ['Quarta', 'Domingo Manhã', 'Domingo Noite', 'Sábado', 'Oração no WhatsApp'];
    let contentHTML = `
        <div style="grid-column: 1 / -1; display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <input type="checkbox" id="filtroOcultarDisponiveis" style="width: 18px; height: 18px;">
            <label for="filtroOcultarDisponiveis" style="font-weight: 500;">Ocultar colunas de membros disponíveis</label>
        </div>
    `;

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

    // Adiciona o listener para o filtro
    const filtroCheckbox = document.getElementById('filtroOcultarDisponiveis');
    if (filtroCheckbox) {
        filtroCheckbox.addEventListener('change', (e) => {
            container.classList.toggle('hide-available', e.target.checked);
        });
    }
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
            limparSugestoes();
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!e.target.classList.contains('dragging')) {
                e.target.classList.add('drag-over');
                atualizarSugestoesDeTroca(e.target.closest('.escala-card'));
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

function limparSugestoes() {
    document.querySelectorAll('.membro-card.suggestion').forEach(s => s.classList.remove('suggestion'));
}

function atualizarSugestoesDeTroca(cardAlvo) {
    limparSugestoes();
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvo.dataset.id);
    if (!diaAlvo) return;

    const membrosDisponiveis = membros.filter(m => {
        let isSuspended = false;
        if (diaAlvo.tipo === 'Quarta' || diaAlvo.tipo.startsWith('Domingo')) isSuspended = m.suspensao.cultos;
        else if (diaAlvo.tipo === 'Sábado') isSuspended = m.suspensao.sabado;

        const diaAtual = new Date(diaAlvo.data); diaAtual.setHours(0, 0, 0, 0);
        const restricaoTemp = todasAsRestricoes.some(r => {
            const rInicio = new Date(r.inicio); rInicio.setHours(0,0,0,0);
            const rFim = new Date(r.fim); rFim.setHours(0,0,0,0);
            return r.membro === m.nome && diaAtual >= rInicio && diaAtual <= rFim;
        });
        const restricaoPerm = todasAsRestricoesPerm.some(r => r.membro === m.nome && r.diaSemana === diaAlvo.tipo);
        return !isSuspended && !restricaoTemp && !restricaoPerm;
    });

    const nomesJaNoTurno = diaAlvo.selecionados.map(s => s.nome);
    const candidatos = membrosDisponiveis.filter(m => !nomesJaNoTurno.includes(m.nome));
    candidatos.sort((a, b) => (justificationDataAtual[a.nome]?.participations || 0) - (justificationDataAtual[b.nome]?.participations || 0));

    const melhoresCandidatos = candidatos.slice(0, 3).map(c => c.nome);
    if (melhoresCandidatos.length > 0) {
        document.querySelectorAll('.membro-card').forEach(card => {
            if (melhoresCandidatos.includes(card.textContent)) {
                card.classList.add('suggestion');
            }
        });
    }
}

function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaOrigem || !diaAlvo) return;
    
    // Validação de restrições do membro arrastado para o dia alvo
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    const diaAlvoData = new Date(diaAlvo.data); diaAlvoData.setHours(0,0,0,0);
    const temRestricaoTemp = todasAsRestricoes.some(r => r.membro === nomeArrastado && diaAlvoData >= new Date(r.inicio) && diaAlvoData <= new Date(r.fim));
    const temRestricaoPerm = todasAsRestricoesPerm.some(r => r.membro === nomeArrastado && r.diaSemana === diaAlvo.tipo);

    if (temRestricaoTemp || temRestricaoPerm) {
        showToast(`${nomeArrastado} tem uma restrição para ${diaAlvo.tipo} neste dia e não pode ser escalado.`, 'warning');
        return;
    }

    // Troca os membros no estado
    const membroAlvoObj = membros.find(m => m.nome === nomeAlvo);
    const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
    diaOrigem.selecionados.splice(indexOrigem, 1, membroAlvoObj);
    const indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    diaAlvo.selecionados.splice(indexAlvo, 1, membroArrastadoObj);

    // Atualiza as participações se a troca for entre dias diferentes
    if (cardOrigemId !== cardAlvoId) {
        justificationDataAtual[nomeArrastado].participations++;
        justificationDataAtual[nomeAlvo].participations--;
    }
    
    // Re-renderiza a UI
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
}
