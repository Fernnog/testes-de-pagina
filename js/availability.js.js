// ============================================================================
// MÓDULO DE DISPONIBILIDADE (availability.js)
// Responsável por ser a única fonte de verdade para a disponibilidade de um membro
// em um determinado turno e data.
// ============================================================================

import { restricoes, restricoesPermanentes } from './data-manager.js';

/**
 * Verifica o status de disponibilidade de um membro para um turno específico,
 * considerando suspensões e restrições permanentes e temporárias.
 * 
 * @param {object} membro O objeto do membro a ser verificado.
 * @param {string} turno O nome do turno (ex: 'Quarta', 'Domingo Manhã').
 * @param {Date|null} data A data específica do evento. Se for null, restrições temporárias são ignoradas.
 * @returns {{type: string}} Um objeto com o status de disponibilidade. 
 *                           Possíveis tipos: 'disponivel', 'suspenso', 'permanente', 'temporaria'.
 */
export function checkMemberAvailability(membro, turno, data) {
    // 1. Verificar Suspensão
    // A suspensão tem a maior prioridade.
    let tipoSuspencao;
    if (turno === 'Quarta' || turno.startsWith('Domingo')) {
        tipoSuspencao = 'cultos';
    } else if (turno === 'Sábado') {
        tipoSuspencao = 'sabado';
    } else if (turno === 'Oração no WhatsApp') {
        tipoSuspencao = 'whatsapp';
    }

    if (membro.suspensao[tipoSuspencao]) {
        return { type: 'suspenso' };
    }

    // 2. Verificar Restrição Permanente
    // Válida para qualquer data, então verificamos antes da temporária.
    const temRestricaoPerm = restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno);
    if (temRestricaoPerm) {
        return { type: 'permanente' };
    }

    // 3. Verificar Restrição Temporária (apenas se uma data for fornecida)
    if (data) {
        const diaAtual = new Date(data);
        diaAtual.setHours(0, 0, 0, 0); // Normaliza para ignorar a hora

        const temRestricaoTemp = restricoes.some(r => {
            const rInicio = new Date(r.inicio);
            rInicio.setHours(0, 0, 0, 0);
            const rFim = new Date(r.fim);
            rFim.setHours(0, 0, 0, 0);

            return r.membro === membro.nome && diaAtual >= rInicio && diaAtual <= rFim;
        });

        if (temRestricaoTemp) {
            return { type: 'temporaria' };
        }
    }

    // 4. Se passou por todas as verificações, está disponível.
    return { type: 'disponivel' };
}

/**
 * Verifica se dois membros são compatíveis para formar uma dupla (mesmo gênero ou cônjuges).
 * @param {object} membroA - O primeiro membro.
 * @param {object} membroB - O segundo membro.
 * @returns {boolean}
 */
export function saoCompativeis(membroA, membroB) {
    if (!membroA || !membroB) return false;
    return (
        membroA.genero === membroB.genero ||
        membroA.conjuge === membroB.nome ||
        membroB.conjuge === membroA.nome
    );
}