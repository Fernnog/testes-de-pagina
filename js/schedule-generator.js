// js/schedule-generator.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { showToast, exibirIndiceEquilibrio } from './ui.js';

/**
 * Retorna um índice aleatório de um array de pesos normalizados.
 * @param {number[]} weights - Array de pesos normalizados (soma deve ser 1).
 * @returns {number} O índice sorteado.
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
 * Seleciona membros disponíveis com base em pesos para garantir uma distribuição mais justa.
 * @param {Array<object>} membrosDisponiveis - Membros que podem ser selecionados.
 * @param {number} quantidadeNecessaria - Quantidade de membros a selecionar.
 * @param {object} participacoes - Objeto com a contagem de participações.
 * @returns {Array<object>} Um array com os membros selecionados.
 */
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // Algoritmo de peso exponencial: penaliza drasticamente quem já participou.
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.count || 0;
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
        
        // Remove o peso correspondente ao membro selecionado
        const pesoRemovido = pesosTemp.splice(indiceSorteado, 1)[0];
        
        // Renormaliza os pesos restantes para a próxima seleção, se houver.
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}

/**
 * Configura o listener do formulário de geração de escala.
 */
export function setupScheduleGenerator() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();
        const gerarCultos = document.getElementById('escalaCultos').checked;
        const gerarSabado = document.getElementById('escalaSabado').checked;
        const gerarOração = document.getElementById('escalaOração').checked;
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);
        const resultado = document.getElementById('resultadoEscala');

        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);
        resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

        const dias = [];
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

        const participacoes = {};
        membros.forEach(m => {
            participacoes[m.nome] = { count: 0, lastDate: null };
        });

        dias.forEach(dia => {
            let membrosDisponiveis = membros.filter(m => {
                let isSuspended = false;
                if (['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(dia.tipo)) isSuspended = m.suspensao.cultos;
                else if (dia.tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (dia.tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;

                const restricaoTemp = restricoes.some(r => r.membro === m.nome && new Date(dia.data) >= new Date(r.inicio) && new Date(dia.data) <= new Date(r.fim));
                const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
                return !isSuspended && !restricaoTemp && !restricaoPerm;
            });
            
            if (dia.tipo === 'Oração no WhatsApp') {
                const tresDiasAtras = new Date(dia.data);
                tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
                membrosDisponiveis = membrosDisponiveis.filter(m => {
                    const lastParticipation = participacoes[m.nome].lastDate;
                    return !lastParticipation || lastParticipation < tresDiasAtras;
                });
            }
            
            const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
            if (membrosDisponiveis.length < qtdNecessaria) return;

            let selecionados = [];
            if (qtdNecessaria === 1) {
                selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
            } else {
                const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes)[0];
                if (!primeiro) return;
                const membrosCompatíveis = membrosDisponiveis.filter(m =>
                    m.nome !== primeiro.nome && (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
                );
                const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes)[0];
                if (segundo) selecionados = [primeiro, segundo];
            }

            if (selecionados.length === qtdNecessaria) {
                dia.selecionados = selecionados;
                selecionados.forEach(m => {
                    participacoes[m.nome].count++;
                    participacoes[m.nome].lastDate = new Date(dia.data);
                });
            }
        });
        
        let diasTotaisGerados = dias.length;
        let diasPreenchidos = dias.filter(d => d.selecionados.length > 0).length;

        if (diasPreenchidos < diasTotaisGerados && diasTotaisGerados > 0) {
            showToast(`Atenção: ${diasTotaisGerados - diasPreenchidos} data(s) não foram preenchidas.`, 'warning');
        } else if (diasTotaisGerados > 0) {
            showToast('Escala gerada com sucesso!', 'success');
        }

        let escalaHTML = '<ul>';
        dias.forEach(dia => {
            if (dia.selecionados.length > 0) {
                escalaHTML += `<li>${dia.data.toLocaleDateString('pt-BR')} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
            }
        });
        escalaHTML += '</ul>';
        resultado.innerHTML += escalaHTML;

        let relatorio = '<h4>Relatório de Participações</h4>';
        const participacoesOrdenadas = Object.entries(participacoes).sort(([, a], [, b]) => b.count - a.count);

        for (const [nome, data] of participacoesOrdenadas) {
            relatorio += `<p>${nome}: ${data.count} participações</p>`;
        }
        resultado.innerHTML += relatorio;

        // Exibe o Índice de Equilíbrio
        exibirIndiceEquilibrio(participacoes);
    });
}
