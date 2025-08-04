import { membros, restricoes, restricoesPermanentes } from './data-manager.js';

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
    `;
    container.style.display = 'block';

    const bar = document.getElementById('balanceBar');
    if (score < 50) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)';
    else if (score < 75) bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)';
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
}

export function renderJustificationReport(data) {
    const container = document.getElementById('justificationReportContainer');
    container.innerHTML = '<h4>Relatório de Justificativas</h4>';
    
    const sortedMembers = Object.entries(data).sort(([, a], [, b]) => b.participations - a.participations);

    const list = document.createElement('ul');
    list.className = 'justification-list';

    for (const [nome, stats] of sortedMembers) {
        const item = document.createElement('li');
        let statusClass = 'status-none';
        let iconClass = 'fa-times-circle';

        if (stats.participations > 4) { statusClass = 'status-high'; iconClass = 'fa-star'; }
        else if (stats.participations > 2) { statusClass = 'status-mid'; iconClass = 'fa-check-circle'; }
        else if (stats.participations > 0) { statusClass = 'status-low'; iconClass = 'fa-check'; }

        let justificationText = stats.reasonForAbsence 
            ? `Não pôde ser escalado(a). Motivo principal: ${stats.reasonForAbsence}`
            : `Esteve disponível em <strong>${stats.availableDays}</strong> dia(s).`;

        if (stats.participations > 0) {
            justificationText = `Participou <strong>${stats.participations}</strong> vez(es). ` + justificationText;
        }

        item.className = `justification-item ${statusClass}`;
        item.innerHTML = `
            <div class="justification-header">
                <span class="status-badge"><i class="fas ${iconClass}"></i></span>
                ${nome}
            </div>
            <p class="justification-text">${justificationText}</p>
        `;
        list.appendChild(item);
    }
    container.appendChild(list);
}

export function renderDiagnosticReport(data) {
    const container = document.getElementById('diagnosticReportContainer');
    container.innerHTML = `
        <h4><i class="fas fa-search-plus"></i> Diagnóstico de Desequilíbrio</h4>
        <p>A análise detectou uma grande concentração de participações. A tabela abaixo detalha a disponibilidade de todos os membros para o turno mais impactado: <strong>${data.shiftType}</strong>.</p>
        <table class="diagnostic-table">
            <thead>
                <tr>
                    <th>Membro</th>
                    <th>Status para este Turno</th>
                </tr>
            </thead>
            <tbody>
                ${data.memberStatus.map(member => `
                    <tr>
                        <td>${member.nome}</td>
                        <td class="status-cell ${member.status.class}">
                            <i class="fas ${member.status.icon}"></i>
                            ${member.status.text}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.style.display = 'block';
}
