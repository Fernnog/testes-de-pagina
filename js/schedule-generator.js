import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao, renderizarFiltros, configurarDragAndDrop } from './ui.js';
// NOVA IMPORTAÇÃO: Importa a função centralizada de verificação.
import { checkMemberAvailability } from './availability.js';

// --- Funções de Lógica de Seleção (SEM ALTERAÇÕES) ---
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) { return i; }
    }
    return weights.length - 1;
}

function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.participations || 0;
        return Math.pow(0.2, count);
    });

    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    if (somaPesos === 0) {
        const selecionados = [];
        const disponiveis = [...membrosDisponiveis];
        while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
            const i = Math.floor(Math.random() * disponiveis.length);
            selecionados.push(disponiveis.splice(i, 1)[0]);
        }
        return selecionados;
    }

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
 * Analisa a concentração de participações para os turnos de Culto.
 * @param {Array} diasGerados - Array com a escala final gerada.
 * @returns {Object} - Um objeto com a análise detalhada por turno.
 */
function analisarConcentracao(diasGerados) {
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
        const membrosDoTurno = [];
        let totalParticipacoesNoTurno = 0;
        let membrosDisponiveisCount = 0;

        membros.forEach(membro => {
            // MODIFICAÇÃO: A verificação de status agora usa a função centralizada.
            // A data é null aqui porque a análise é geral para o turno, ignorando restrições temporárias.
            const status = checkMemberAvailability(membro, turno, null);

            if (status.type === 'disponivel') {
                membrosDisponiveisCount++;
            }

            const participacoes = diasGerados.filter(d => d.tipo === turno && d.selecionados.some(s => s.nome === membro.nome)).length;
            totalParticipacoesNoTurno += participacoes;

            membrosDoTurno.push({
                nome: membro.nome,
                participacoes: participacoes,
                status: status
            });
        });

        analise[turno] = {
            totalParticipacoesNoTurno: totalParticipacoesNoTurno,
            membrosDisponiveis: membrosDisponiveisCount,
            membrosDoTurno: membrosDoTurno.sort((a, b) => b.participacoes - a.participacoes)
        };
    });
    return analise;
}

/**
 * Configura o listener do formulário de geração de escala.
 */
export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        const resultadoContainer = document.getElementById('resultadoEscala');
        const balanceContainer = document.getElementById('balanceIndexContainer');
        const filtrosContainer = document.getElementById('escala-filtros');
        
        if (resultadoContainer) {
            resultadoContainer.innerHTML = '';
            resultadoContainer.classList.remove('escala-container');
        }
        if (filtrosContainer) {
            filtrosContainer.innerHTML = '';
        }
        if (balanceContainer) {
            balanceContainer.style.display = 'none';
            balanceContainer.onclick = null;
        }

        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = { participations: 0 };
        });

        const dias = [];
        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);
        let uniqueIdCounter = 0;

        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            const diaSemana = d.getDay();
            const diaInfoBase = { data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}` };

            if (gerarCultos) {
                if (diaSemana === 3) dias.push({ ...diaInfoBase, tipo: 'Quarta' });
                if (diaSemana === 0) {
                    dias.push({ ...diaInfoBase, tipo: 'Domingo Manhã' });
                    dias.push({ data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}`, tipo: 'Domingo Noite' });
                }
            }
            if (gerarSabado && diaSemana === 6) dias.push({ ...diaInfoBase, tipo: 'Sábado' });
            if (gerarOração) dias.push({ ...diaInfoBase, tipo: 'Oração no WhatsApp' });
        }

        dias.forEach(dia => {
            // MODIFICAÇÃO PRINCIPAL: A lógica de filtro complexa foi substituída
            // por uma única chamada à função centralizada.
            const membrosDisponiveis = membros.filter(m => {
                const status = checkMemberAvailability(m, dia.tipo, dia.data);
                return status.type === 'disponivel';
            });
            
            const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
            
            if (membrosDisponiveis.length >= qtdNecessaria) {
                let selecionados = [];
                if (qtdNecessaria === 1) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData);
                } else {
                    const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData)[0];
                    if (primeiro) {
                        const membrosCompatíveis = membrosDisponiveis.filter(m => 
                            m.nome !== primeiro.nome && 
                            (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
                        );
                        const poolParaSegundo = membrosCompatíveis.length > 0 ? membrosCompatíveis : membrosDisponiveis.filter(m => m.nome !== primeiro.nome);
                        const segundo = selecionarMembrosComAleatoriedade(poolParaSegundo, 1, justificationData)[0];
                        if (segundo) selecionados = [primeiro, segundo];
                    }
                }
                if (selecionados.length === qtdNecessaria) {
                    dia.selecionados = selecionados;
                    selecionados.forEach(m => { justificationData[m.nome].participations++; });
                }
            }
        });

        renderEscalaEmCards(dias);
        renderizarFiltros(dias);
        configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes);
        exibirIndiceEquilibrio(justificationData);
        
        if (gerarCultos) {
            const relatorioConcentracao = analisarConcentracao(dias);
            if (balanceContainer) {
                balanceContainer.onclick = () => renderAnaliseConcentracao(relatorioConcentracao);
            }
        }
    });
}
