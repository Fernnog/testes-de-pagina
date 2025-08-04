/**
 * js/schedule-generator.js
 * 
 * Módulo responsável por toda a lógica de geração da escala de intercessão.
 * Ele lê os dados da aplicação, aplica as regras de negócio (obrigatórias e relativas)
 * e gera o resultado final na interface do usuário.
 */

// Importa os dados necessários do módulo de gerenciamento de dados.
import {
    membros,
    restricoes,
    restricoesPermanentes
} from './data-manager.js';

// Importa as funções de UI necessárias para exibir o resultado e feedback.
import {
    exibirIndiceEquilibrio,
    showToast
} from './ui.js';

/**
 * Função utilitária interna para realizar uma seleção aleatória ponderada.
 * Itens com maior peso têm maior probabilidade de serem escolhidos.
 * @param {number[]} weights - Um array de pesos.
 * @returns {number} - O índice do item selecionado.
 */
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) {
            return i;
        }
    }
    return weights.length - 1;
}

/**
 * Seleciona membros disponíveis com uma aleatoriedade ponderada para garantir uma distribuição mais justa.
 * A função penaliza exponencialmente membros que já participaram, aumentando a chance de quem tem menos participações.
 * @param {object[]} membrosDisponiveis - Array de membros aptos para a seleção.
 * @param {number} quantidadeNecessaria - Quantidade de membros a serem selecionados.
 * @param {object} participacoes - Objeto com a contagem de participações de cada membro.
 * @returns {object[]} - Um array com os membros selecionados.
 */
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // MELHORIA CENTRAL: O peso é calculado com uma base exponencial.
    // Isso penaliza drasticamente membros com mais participações, forçando o equilíbrio.
    // Ex: count 0 -> peso 1; count 1 -> peso 0.2; count 2 -> peso 0.04.
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome] ?.count || 0;
        return Math.pow(0.2, count);
    });

    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    if (somaPesos === 0) return []; // Evita divisão por zero.

    const pesosNormalizados = pesos.map(p => p / somaPesos);

    const selecionados = [];
    const disponiveis = [...membrosDisponiveis];
    let pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indiceSorteado = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indiceSorteado, 1)[0];
        
        // Remove o peso do membro já selecionado para a próxima iteração
        pesosTemp.splice(indiceSorteado, 1);
        
        // Renormaliza os pesos restantes para garantir a precisão na próxima seleção (importante para duplas)
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}


/**
 * Função principal que configura o listener do formulário de geração de escala.
 * Deve ser exportada para ser chamada pelo main.js na inicialização.
 */
export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        // Leitura dos parâmetros do formulário
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

        // Monta a lista de dias a serem preenchidos
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

        // Inicializa a estrutura de controle de participações
        const participacoes = {};
        membros.forEach(m => {
            participacoes[m.nome] = { count: 0, lastDate: null };
        });

        // Loop principal para preencher cada dia da escala
        dias.forEach(dia => {
            let membrosDisponiveis = membros.filter(m => {
                // Verificação de suspensão granular
                let isSuspended = false;
                if (['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(dia.tipo)) isSuspended = m.suspensao.cultos;
                else if (dia.tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (dia.tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;

                // Verificação de restrições temporárias e permanentes
                const restricaoTemp = restricoes.some(r => r.membro === m.nome && dia.data >= new Date(r.inicio) && dia.data <= new Date(r.fim));
                const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
                
                return !isSuspended && !restricaoTemp && !restricaoPerm;
            });

            // Lógica de distanciamento de 3 dias para WhatsApp
            if (dia.tipo === 'Oração no WhatsApp') {
                const tresDiasAtras = new Date(dia.data);
                tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
                membrosDisponiveis = membrosDisponiveis.filter(m => {
                    const lastParticipation = participacoes[m.nome].lastDate;
                    return !lastParticipation || lastParticipation < tresDiasAtras;
                });
            }

            const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : quantidadeCultos;
            if (membrosDisponiveis.length < qtdNecessaria) return; // Pula para o próximo dia

            let selecionados = [];
            if (qtdNecessaria === 1) {
                selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
            } else { // Lógica para duplas, garantindo compatibilidade
                const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes)[0];
                if (!primeiro) return;
                
                const membrosCompatíveis = membrosDisponiveis.filter(m =>
                    m.nome !== primeiro.nome && (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
                );
                
                const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes)[0];
                if (segundo) selecionados = [primeiro, segundo];
            }

            // Se a seleção foi bem-sucedida, atualiza os dados
            if (selecionados.length === qtdNecessaria) {
                dia.selecionados = selecionados;
                selecionados.forEach(m => {
                    participacoes[m.nome].count++;
                    participacoes[m.nome].lastDate = new Date(dia.data);
                });
            }
        });

        // Geração do HTML para a escala e o relatório
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

        // Feedback visual para o usuário
        const diasTotaisGerados = dias.length;
        const diasPreenchidos = dias.filter(d => d.selecionados.length > 0).length;
        if (diasPreenchidos < diasTotaisGerados && diasTotaisGerados > 0) {
            showToast(`Atenção: ${diasTotaisGerados - diasPreenchidos} data(s) não foram preenchidas por falta de membros.`, 'warning');
        } else if (diasTotaisGerados > 0) {
            showToast('Escala gerada e todos os horários preenchidos com sucesso!', 'success');
        } else {
            showToast('Nenhuma escala foi selecionada para geração.', 'warning');
        }

        // Exibe o novo Índice de Equilíbrio
        exibirIndiceEquilibrio(participacoes);
    });
}
