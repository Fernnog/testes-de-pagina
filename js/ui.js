import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

// =================== CONFIGURAÇÃO VISUAL CENTRALIZADA (PRIORIDADE 2) ===================
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
// =======================================================================================


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
    if (media === 0) { // Se ninguém participou, não mostra o índice.
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


// ====================== FUNÇÕES NOVAS OU ATUALIZADAS (PRIORIDADE 1) ======================

/**
 * Renderiza a escala gerada no formato de cards visuais.
 * @param {Array} dias - A lista de dias com os membros selecionados.
 */
export function renderEscalaEmCards(dias) {
    const container = document.getElementById('resultadoEscala');
    
    // Limpa o conteúdo anterior e adiciona a classe de container de grid
    container.innerHTML = '';
    container.classList.add('escala-container');

    dias.forEach(dia => {
        if (dia.selecionados.length === 0) return;

        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { classe: '' };
        
        const cardHTML = `
            <div class="escala-card ${turnoConfig.classe}">
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
 * Renderiza o conteúdo do modal de análise de concentração com detalhes e ícones de status.
 * @param {Object} analise - O objeto de análise gerado por `analisarConcentracao`.
 */
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

/**
 * Atualiza a função de exportação para ler os dados da nova estrutura de cards.
 */
export function exportarEscalaXLSX() {
    const listaCards = document.querySelectorAll('.escala-card');
    if (listaCards.length === 0) {
        showToast('Não há escala gerada para exportar.', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();
    const dadosEscala = [['Data', 'Turno', 'Membros']];
    
    listaCards.forEach(card => {
        const data = card.querySelector('.escala-card__header span').textContent.trim();
        const tipo = card.querySelector('.escala-card__header h4').textContent.trim();
        const membrosNodes = card.querySelectorAll('.membro-card');
        const nomes = Array.from(membrosNodes).map(node => node.textContent.trim()).join(', ');
        dadosEscala.push([data, tipo, nomes]);
    });

    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

/**
 * Configura os listeners do modal de análise de concentração.
 */
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
