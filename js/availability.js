// Arquivo: js/availability.js
// RESPONSABILIDADE: Centralizar a lógica de verificação da disponibilidade de um membro.

import { restricoes, restricoesPermanentes } from './data-manager.js';

/**
 * Verifica o status de disponibilidade de um membro para um turno e data específicos.
 * @param {object} membro - O objeto do membro a ser verificado.
 * @param {string} turno - O nome do turno (ex: 'Quarta', 'Domingo Manhã').
 * @param {Date} [data] - A data específica a ser verificada (opcional, para restrições temporárias).
 * @returns {object} - Um objeto com o tipo de status (ex: 'disponivel', 'suspenso').
 */
export function checkMemberAvailabilityStatus(membro, turno, data) {
    // 1. Verificar suspensão
    let tipoSuspensao = '';
    if (turno === 'Quarta' || turno.startsWith('Domingo')) tipoSuspensao = 'cultos';
    else if (turno === 'Sábado') tipoSuspensao = 'sabado';
    else if (turno === 'Oração no WhatsApp') tipoSuspensao = 'whatsapp';

    if (tipoSuspensao && membro.suspensao[tipoSuspensao]) {
        return { type: 'suspenso' };
    }

    // 2. Verificar restrição permanente
    if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
        return { type: 'permanente' };
    }

    // 3. Verificar restrição temporária (apenas se uma data for fornecida)
    if (data) {
        const diaAtual = new Date(data);
        diaAtual.setHours(0, 0, 0, 0);
        
        const temRestricaoTemp = restricoes.some(r => {
            const rInicio = new Date(r.inicio); rInicio.setHours(0, 0, 0, 0);
            const rFim = new Date(r.fim); rFim.setHours(0, 0, 0, 0);
            return r.membro === membro.nome && diaAtual >= rInicio && diaAtual <= rFim;
        });
        
        if (temRestricaoTemp) {
            return { type: 'temporaria' };
        }
    }

    // 4. Se passar por tudo, está disponível
    return { type: 'disponivel' };
}
