import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao, renderizarFiltros, configurarDragAndDrop } from './ui.js';

// --- Funções de Lógica de Seleção ---
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
        while(selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
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
 * Analisa a concentração de participações para os turnos de Culto, incluindo contagem de membros disponíveis.
 * @param {Array} diasGerados - Array com a escala final gerada.
 * @param {Array} todosMembros - Array completo de membros cadastrados.
 * @param {Array} todasRestricoes - Array de restrições temporárias.
 * @param {Array} todasRestricoesPerm - Array de restrições permanentes.
 * @returns {Object} - Um objeto com a análise detalhada por turno.
 */
function analisarConcentracao(diasGerados, todosMembros, todasRestricoes, todasRestricoesPerm) {
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
        const membrosDoTurno = [];
        let totalParticipacoesNoTurno = 0;
        let membrosDisponiveisCount = 0; // Contador para membros disponíveis

        todosMembros.forEach(membro => {
            // Diagnostica o status do membro para este turno específico
            let status = { type: 'disponivel' };
            
            if (membro.suspensao.cultos) {
                status = { type: 'suspenso' };
            } 
            else if (todasRestricoesPerm.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
            }

            // Conta o membro se seu status for 'disponível'
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
            membrosDisponiveis: membrosDisponiveisCount, // Adiciona a nova contagem
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

        // --- LÓGICA DE LIMPEZA CENTRALIZADA ---
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

        // --- COLETA DE DADOS DO FORMULÁRIO ---
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

        // --- PREPARAÇÃO DOS DIAS DA ESCALA ---
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

        // --- LÓGICA PRINCIPAL DE GERAÇÃO DA ESCALA ---
        dias.forEach(dia => {
            let membrosDisponiveis = membros.filter(m => {
                let isSuspended = false;
                if (dia.tipo === 'Quarta' || dia.tipo.startsWith('Domingo')) isSuspended = m.suspensao.cultos;
                else if (dia.tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (dia.tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;

                const diaAtual = new Date(dia.data);
                diaAtual.setHours(0, 0, 0, 0);

                const restricaoTemp = restricoes.some(r => {
                    const rInicio = new Date(r.inicio); rInicio.setHours(0, 0, 0, 0);
                    const rFim = new Date(r.fim); rFim.setHours(0, 0, 0, 0);
                    return r.membro === m.nome && diaAtual >= rInicio && diaAtual <= rFim;
                });

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

        // --- Renderização e Análise Final ---
        renderEscalaEmCards(dias);
        renderizarFiltros(dias);
        configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes);
        exibirIndiceEquilibrio(justificationData);
        
        if (gerarCultos) {
            const relatorioConcentracao = analisarConcentracao(dias, membros, restricoes, restricoesPermanentes);
            if (balanceContainer) {
                balanceContainer.onclick = () => renderAnaliseConcentracao(relatorioConcentracao);
            }
        }
    });
}
