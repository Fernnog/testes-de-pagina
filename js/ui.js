/**
 * js/ui.js
 * 
 * Este módulo é responsável por toda a manipulação do DOM (a parte visual da página).
 * Ele lê o estado do data-manager e atualiza a interface de acordo, mas não modifica
 * o estado diretamente. Ele também fornece funções para serem chamadas por outros módulos
 * para controlar a visibilidade de elementos e exibir notificações.
 */

// Importa o estado da aplicação. Este módulo é apenas um "leitor" desses dados.
import { membros, restricoes, restricoesPermanentes } from './data-manager.js';


// -----------------------------------------------------------------------------
// --- SEÇÃO DE FUNÇÕES PRIVADAS ---
// Funções auxiliares que são usadas apenas dentro deste módulo.
// Elas não são exportadas e, portanto, "invisíveis" para outros arquivos.
// -----------------------------------------------------------------------------

/**
 * Renderiza a lista de membros cadastrados na tela, incluindo seus status de suspensão.
 * Adiciona atributos 'data-*' nos botões para permitir que o main.js adicione interatividade.
 */
function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    membros.sort((a, b) => a.nome.localeCompare(b.nome));

    let maleCount = 0;
    let femaleCount = 0;

    if (!lista) return;

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
        
        // Adicionamos 'data-index' e 'data-action' para o Event Delegation em main.js
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
 * Atualiza os menus suspensos ('<select>') que listam os membros.
 */
function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Selecione um membro</option>' +
                membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
        }
    });
}

/**
 * Renderiza a lista de restrições temporárias cadastradas.
 */
function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    if (!lista) return;
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button data-action="excluir-restricao" data-index="${index}">Excluir</button></li>`).join('');
}

/**
 * Renderiza a lista de restrições permanentes cadastradas.
 */
function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    if (!lista) return;
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button data-action="excluir-restricao-permanente" data-index="${index}">Excluir</button></li>`).join('');
}


// -----------------------------------------------------------------------------
// --- SEÇÃO DE FUNÇÕES PÚBLICAS (API) ---
// Funções exportadas para serem usadas por outros módulos (especialmente main.js).
// -----------------------------------------------------------------------------

/**
 * Função "mestre" que chama todas as funções de atualização da UI.
 * Simplifica o código em main.js, que só precisa chamar esta função.
 */
export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

/**
 * Controla a visibilidade das abas principais da aplicação.
 * @param {string} tabId O ID da aba a ser exibida.
 */
export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    const tabToShow = document.getElementById(tabId);
    if (tabToShow) {
        tabToShow.style.display = 'block';
    }
}

/**
 * Alterna a visibilidade do campo de nome do cônjuge no formulário de cadastro.
 */
export function toggleConjuge() {
    const conjugeField = document.getElementById('conjugeField');
    if (conjugeField) {
        conjugeField.style.display = document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
    }
}

/**
 * Exibe notificações (toasts) no canto da tela para dar feedback ao usuário.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo de toast ('success' ou 'warning').
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

/**
 * Calcula e exibe o "Índice de Equilíbrio" da escala gerada.
 * @param {Object} participacoes O objeto contendo a contagem de participações de cada membro.
 */
export function exibirIndiceEquilibrio(participacoes) {
    const container = document.getElementById('balanceIndexContainer');
    if (!container) return;

    const counts = Object.values(participacoes).map(p => p.count);
    if (counts.length < 2) {
        container.style.display = 'none';
        return;
    }

    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (media === 0) { // Se ninguém participou, o equilíbrio é perfeito.
        container.style.display = 'none';
        return;
    }
    
    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b) / counts.length);
    const score = Math.max(0, 100 - (desvioPadrao / media) * 100);

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
    } else if (score < 80) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)'; // Amarelo
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)'; // Verde
    }
}

/**
 * Agrupa os listeners de eventos que são puramente internos à UI.
 * Deve ser chamado uma única vez pelo main.js.
 */
export function setupUiListeners() {
    const conjugeCheckbox = document.getElementById('conjugeParticipa');
    if (conjugeCheckbox) {
        conjugeCheckbox.addEventListener('change', toggleConjuge);
    }
}
