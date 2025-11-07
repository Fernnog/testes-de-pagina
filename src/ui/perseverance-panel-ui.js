/**
 * @file perseverance-panel-ui.js
 * @description Módulo de UI para gerenciar o Painel de Perseverança.
 * É responsável por renderizar a sequência de dias, o recorde, a barra de progresso
 * e os ícones de marcos (milestones) com base nos dados do usuário.
 */

// Importa os elementos do DOM necessários para este painel
import {
    perseveranceSection,
    currentDaysText,
    recordDaysText,
    perseveranceProgressFill,
} from './dom-elements.js';

// NOVA IMPORTAÇÃO: Traz a lógica de cálculo do módulo de utilitários
import { calculateCumulativeMilestones } from '../utils/milestone-helpers.js';


// --- Funções Privadas de Renderização ---

/**
 * Atualiza a barra de progresso visual com base na sequência atual e no recorde.
 * (Esta função permanece inalterada)
 * @param {number} current - A sequência atual de dias.
 * @param {number} longest - O recorde de dias.
 */
function _renderProgressBar(current, longest) {
    let percentage = longest > 0 ? (current / longest) * 100 : 0;
    percentage = Math.min(100, Math.max(0, percentage)); // Garante que a % esteja entre 0 e 100

    perseveranceProgressFill.style.width = percentage + '%';
    currentDaysText.textContent = current;
    recordDaysText.textContent = longest;
}

/**
 * Renderiza os marcos de perseverança no DOM, incluindo a lógica corrigida da coroa.
 * A lógica de cálculo dos outros marcos foi abstraída para o `milestone-helpers.js`.
 * (Esta é a versão final e corrigida da função)
 * @param {number} current - A sequência atual de dias.
 * @param {number} longest - O recorde de dias.
 */
function _renderMilestoneIcons(current, longest) {
    // Seleção dos elementos do DOM
    const crownIcon = perseveranceSection.querySelector('.record-crown');
    const container = document.getElementById('cumulative-milestones-container');
    
    if (!container || !crownIcon) {
        console.error("Elementos essenciais para os marcos não encontrados.");
        return;
    }

    // 1. Limpa o conteúdo dinâmico anterior
    container.innerHTML = '';
    
    // 2. LÓGICA DA COROA (CORRIGIDA)
    // Por padrão, a coroa é escondida e seu estilo de "conquista" é removido.
    crownIcon.style.display = 'none';
    crownIcon.classList.remove('achieved');

    // A coroa só será exibida se a condição for atendida.
    if (longest > 0 && current >= longest) {
        crownIcon.style.display = 'inline-block'; // Torna a coroa visível
        crownIcon.classList.add('achieved');      // Aplica a animação
    }

    // 3. Obtém os marcos calculados chamando a função do helper
    const achievedMilestones = calculateCumulativeMilestones(current);

    // 4. Renderiza os marcos recebidos no DOM
    achievedMilestones.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'milestone-item';

        const iconEl = document.createElement('span');
        iconEl.className = 'icon achieved'; // Aplica a classe para animação
        iconEl.textContent = item.icon;
        itemEl.appendChild(iconEl);

        if (item.count > 1) {
            const counterEl = document.createElement('span');
            counterEl.className = 'counter';
            counterEl.textContent = `x${item.count}`;
            itemEl.appendChild(counterEl);
        }
        
        container.appendChild(itemEl);
    });
}


// --- Funções Públicas (API do Módulo) ---
// (Estas funções permanecem inalteradas)

/**
 * Inicializa o módulo. Atualmente não requer callbacks.
 */
export function init() {
    // Nenhuma inicialização de listener necessária, pois o painel é apenas para exibição.
}

/**
 * Renderiza todo o painel de perseverança com base nos dados do usuário.
 * @param {object} userInfo - O objeto de dados do usuário contendo as informações da sequência.
 *                           Espera-se que tenha `currentStreak` e `longestStreak`.
 */
export function render(userInfo) {
    if (!userInfo || typeof userInfo.currentStreak === 'undefined' || typeof userInfo.longestStreak === 'undefined') {
        hide();
        return;
    }

    const consecutiveDays = userInfo.currentStreak || 0;
    const recordDays = userInfo.longestStreak || 0;

    _renderProgressBar(consecutiveDays, recordDays);
    _renderMilestoneIcons(consecutiveDays, recordDays);

    show();
}

/**
 * Mostra o painel de perseverança.
 */
export function show() {
    perseveranceSection.style.display = 'block';
}

/**
 * Esconde o painel de perseverança.
 */
export function hide() {
    perseveranceSection.style.display = 'none';
}