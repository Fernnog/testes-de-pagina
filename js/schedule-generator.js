import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderJustificationReport, renderDiagnosticReport } from './ui.js';

/**
 * Seleciona um índice aleatório de um array de pesos.
 * @param {number[]} weights - Array de pesos.
 * @returns {number} - O índice selecionado.
 */
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) { return i; }
    }
    return weights.length - 1;
}

/**
 * Seleciona membros de forma ponderada, favorecendo quem participou menos.
 * @param {object[]} membrosDisponiveis - Lista de membros aptos.
 * @param {number} quantidadeNecessaria - Quantidade de membros a selecionar.
 * @param {object} participacoes - Objeto com a contagem de participações.
 * @returns {object[]} - Array com os membros selecionados.
 */
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.participations || 0;
        return Math.pow(0.2, count);
    });
    
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    if (somaPesos === 0) return [];
    
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    const selecionados = [];
    const disponiveis = [...membrosDisponiveis];
    let pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indiceSorteado = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indiceSorteado, 1)[0];
        pesosTemp.splice(indiceSorteado, 1);
        
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}

/**
 * Analisa o desequilíbrio e, se necessário, dispara a renderização do diagnóstico.
 * @param {object} justificationData - Dados de participações e disponibilidade.
 * @param {object[]} membros - Lista completa de membros.
 * @param {object[]} restricoes - Lista de restrições temporárias.
 * @param {object[]} restricoesPermanentes - Lista de restrições permanentes.
 */
function analyzeAndDiagnoseImbalance(justificationData, membros, restricoes, restricoesPermanentes) {
    const availableMembersParticipation = Object.values(justificationData).filter(d => d.availableDays > 0);
    if (availableMembersParticipation.length < 2) return;

    const counts = availableMembersParticipation.map(d => d.participations);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);

    if (maxCount - minCount > 2) {
        let mostImpactedShift = 'Não determinado';
        const memberWithMaxParticipation = Object.values(justificationData).find(d => d.participations === maxCount);
        if (memberWithMaxParticipation && memberWithMaxParticipation.mostFrequentShift) {
            mostImpactedShift = memberWithMaxParticipation.mostFrequentShift;
        }

        const diagnosticData = {
            shiftType: mostImpactedShift,
            memberStatus: []
        };

        membros.forEach(membro => {
            let status = { text: 'Disponível', class: 'status-available', icon: 'fa-check-circle' };

            const isSuspended = (mostImpactedShift.startsWith('Domingo') || mostImpactedShift === 'Quarta') ? membro.suspensao.cultos : (mostImpactedShift === 'Sábado' ? membro.suspensao.sabado : membro.suspensao.whatsapp);
            const isRestrictedPerm = restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === mostImpactedShift);
            const isRestrictedTemp = restricoes.some(r => r.membro === membro.nome);

            if (isRestrictedPerm) {
                status = { text: 'Restrição Permanente', class: 'status-restricted-perm', icon: 'fa-ban' };
            } else if (isSuspended) {
                status = { text: 'Suspenso(a) deste tipo', class: 'status-suspended', icon: 'fa-pause-circle' };
            } else if (isRestrictedTemp) {
                status = { text: 'Possui restrição temporária no mês', class: 'status-restricted-temp', icon: 'fa-calendar-times' };
            }

            diagnosticData.memberStatus.push({ nome: membro.nome, status });
        });
        
        renderDiagnosticReport(diagnosticData);
    }
}

/**
 * Configura o listener do formulário de geração de escala.
 */
export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        // MODIFICAÇÃO: A limpeza dos relatórios foi removida daqui e centralizada em main.js
        // para garantir a ordem correta de execução e evitar código duplicado.

        const gerarCultos = document.getElementById('escalaCultos').checked;
        const gerarSabado = document.getElementById('escalaSabado').checked;
        const gerarOração = document.getElementById('escalaOração').checked;
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = {
                participations: 0,
                availableDays: 0,
                reasonForAbsence: null,
                shiftCounts: {},
                mostFrequentShift: null
            };
        });

        const dias = [];
        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);

        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });
            if (gerarCultos) {
                if (diaSemana === 'quarta-feira') dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
                if (diaSemana === 'domingo') {
                    dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                    dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
                }
            }
            if (gerarSabado && diaSemana === 'sábado') dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
            if (gerarOração) dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
        }

        dias.forEach(dia => {
            membros.forEach(m => {
                const tipo = dia.tipo;
                let isSuspended = false;
                if (tipo === 'Quarta' || tipo.startsWith('Domingo')) isSuspended = m.suspensao.cultos;
                else if (tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;

                const restricaoTemp = restricoes.some(r => r.membro === m.nome && new Date(dia.data) >= new Date(r.inicio) && new Date(dia.data) <= new Date(r.fim));
                const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === tipo);

                if (isSuspended) {
                    if (!justificationData[m.nome].reasonForAbsence) justificationData[m.nome].reasonForAbsence = 'Suspenso(a) de atividades.';
                } else if (restricaoTemp) {
                    if (!justificationData[m.nome].reasonForAbsence) justificationData[m.nome].reasonForAbsence = 'Em período de restrição temporária.';
                } else if (restricaoPerm) {
                    if (!justificationData[m.nome].reasonForAbsence) justificationData[m.nome].reasonForAbsence = 'Possui restrição permanente para este tipo de dia.';
                } else {
                    justificationData[m.nome].availableDays++;
                }
            });
            
            let membrosDisponiveis = membros.filter(m => {
                let isSuspended = false;
                if (dia.tipo === 'Quarta' || dia.tipo.startsWith('Domingo')) isSuspended = m.suspensao.cultos;
                else if (dia.tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (dia.tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;
                const restricaoTemp = restricoes.some(r => r.membro === m.nome && new Date(dia.data) >= new Date(r.inicio) && new Date(dia.data) <= new Date(r.fim));
                const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
                return !isSuspended && !restricaoTemp && !restricaoPerm;
            });
            
            const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
            if (membrosDisponiveis.length >= qtdNecessaria) {
                let selecionados = [];
                if (qtdNecessaria === 1) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData);
                } else {
                    const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData)[0];
                    if (primeiro) {
                        const membrosCompatíveis = membrosDisponiveis.filter(m => m.nome !== primeiro.nome && (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome));
                        const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, justificationData)[0];
                        if (segundo) selecionados = [primeiro, segundo];
                    }
                }
                if (selecionados.length === qtdNecessaria) {
                    dia.selecionados = selecionados;
                }
            }
        });

        dias.forEach(dia => {
            dia.selecionados.forEach(membro => {
                justificationData[membro.nome].participations++;
                const shiftType = dia.tipo;
                justificationData[membro.nome].shiftCounts[shiftType] = (justificationData[membro.nome].shiftCounts[shiftType] || 0) + 1;
            });
        });
        
        for (const memberData of Object.values(justificationData)) {
            if (Object.keys(memberData.shiftCounts).length > 0) {
                memberData.mostFrequentShift = Object.entries(memberData.shiftCounts).sort(([, a], [, b]) => b - a)[0][0];
            }
        }

        const resultadoContainer = document.getElementById('resultadoEscala');
        let escalaHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3><ul>`;
        dias.forEach(dia => {
            if (dia.selecionados.length > 0) {
                escalaHTML += `<li>${dia.data.toLocaleDateString('pt-BR')} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
            }
        });
        escalaHTML += '</ul>';
        resultadoContainer.innerHTML = escalaHTML;

        exibirIndiceEquilibrio(justificationData);
        renderJustificationReport(justificationData);
        analyzeAndDiagnoseImbalance(justificationData, membros, restricoes, restricoesPermanentes);
    });
}
