import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao, renderizarFiltros, configurarDragAndDrop } from './ui.js';
import { checkMemberAvailability } from './availability.js';

/**
 * Seleciona um índice aleatório de um array de pesos normalizados.
 * @param {number[]} weights - Array de pesos que somam 1.
 * @returns {number} - O índice sorteado.
 */
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) { return i; }
    }
    return weights.length - 1; // Fallback
}

/**
 * Seleciona membros de uma lista de disponíveis, dando prioridade àqueles com menos participações.
 * @param {object[]} membrosDisponiveis - Array de objetos de membros.
 * @param {number} quantidadeNecessaria - Quantidade de membros a selecionar.
 * @param {object} participacoes - Objeto que rastreia a contagem de participações.
 * @returns {object[]} - Um array com os membros selecionados.
 */
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // O peso é inversamente proporcional ao número de participações (maior peso para quem participou menos).
    // Usamos Math.pow com um expoente < 1 para achatar a curva e dar chance a todos.
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.participations || 0;
        return Math.pow(0.5, count); // Quanto mais participações, menor o peso.
    });

    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    
    // Se a soma for 0 (todos têm peso 0, raro), seleciona aleatoriamente sem peso.
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
        
        // Renormaliza os pesos restantes para a próxima iteração
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
            // A verificação de status usa a função centralizada.
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

        // Referências aos elementos da UI
        const resultadoContainer = document.getElementById('resultadoEscala');
        const balanceContainer = document.getElementById('balanceIndexContainer');
        const filtrosContainer = document.getElementById('escala-filtros');
        const diagnosticContainer = document.getElementById('diagnosticReportContainer');

        // Limpa a UI de gerações anteriores
        resultadoContainer.innerHTML = '';
        resultadoContainer.classList.remove('escala-container');
        filtrosContainer.innerHTML = '';
        diagnosticContainer.innerHTML = '';
        diagnosticContainer.style.display = 'none';
        balanceContainer.style.display = 'none';
        balanceContainer.onclick = null;

        // Coleta dos dados do formulário
        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        // Estrutura para rastrear participações
        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = { participations: 0 };
        });

        // Monta a lista de dias a serem preenchidos
        const dias = [];
        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);
        let uniqueIdCounter = 0;

        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            const diaSemana = d.getDay(); // 0=Domingo, 3=Quarta, 6=Sábado
            const diaInfoBase = { data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}` };

            if (gerarCultos) {
                if (diaSemana === 3) dias.push({ ...diaInfoBase, tipo: 'Quarta' });
                if (diaSemana === 0) {
                    dias.push({ ...diaInfoBase, tipo: 'Domingo Manhã' });
                    // Cria um novo objeto para o segundo turno do mesmo dia, com ID único
                    dias.push({ data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}`, tipo: 'Domingo Noite' });
                }
            }
            if (gerarSabado && diaSemana === 6) dias.push({ ...diaInfoBase, tipo: 'Sábado' });
            if (gerarOração) dias.push({ ...diaInfoBase, tipo: 'Oração no WhatsApp' });
        }

        // Lógica principal de geração
        dias.forEach(dia => {
            // A lógica de filtro complexa foi substituída pela chamada à função centralizada.
            const membrosDisponiveis = membros.filter(m => {
                const status = checkMemberAvailability(m, dia.tipo, dia.data);
                return status.type === 'disponivel';
            });
            
            const qtdNecessaria = (dia.tipo === 'Oração no WhatsApp' || dia.tipo === 'Sábado') ? 1 : quantidadeCultos;
            
            if (membrosDisponiveis.length >= qtdNecessaria) {
                let selecionados = [];
                if (qtdNecessaria === 1) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData);
                } else { // Lógica para duplas (quantidadeCultos = 2)
                    const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData)[0];
                    if (primeiro) {
                        const poolParaSegundo = membrosDisponiveis.filter(m => m.nome !== primeiro.nome);
                        // Lógica preferencial para duplas
                        const membrosCompatíveis = poolParaSegundo.filter(m => 
                            (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
                        );
                        
                        // Usa o pool de compatíveis se houver, senão, usa qualquer outro disponível (fallback)
                        const poolFinal = membrosCompatíveis.length > 0 ? membrosCompatíveis : poolParaSegundo;
                        const segundo = selecionarMembrosComAleatoriedade(poolFinal, 1, justificationData)[0];
                        
                        if (segundo) selecionados = [primeiro, segundo];
                    }
                }

                if (selecionados.length === qtdNecessaria) {
                    dia.selecionados = selecionados;
                    selecionados.forEach(m => { justificationData[m.nome].participations++; });
                }
            }
        });

        // Renderiza os resultados na UI
        renderEscalaEmCards(dias);
        renderizarFiltros(dias, analisarConcentracao(dias)); // Passa os dados da análise para o UI
        configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes);
        exibirIndiceEquilibrio(justificationData);
        
        // --- ALTERAÇÃO PRINCIPAL (PRIORIDADE 1) ---
        // Se a escala gerada for de cultos, calcula e renderiza a análise imediatamente.
        if (gerarCultos) {
            const relatorioConcentracao = analisarConcentracao(dias);
            
            // 1. Renderiza o painel de análise diretamente na página, em vez de esperar um clique.
            renderAnaliseConcentracao(relatorioConcentracao, 'all'); 
            
            // 2. Muda a ação de clique do índice para rolar a tela até a análise já visível.
            if (balanceContainer) {
                balanceContainer.onclick = () => {
                    const reportElement = document.getElementById('diagnosticReportContainer');
                    if (reportElement && reportElement.style.display !== 'none') {
                        // Rola a página suavemente até o painel de análise
                        reportElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
            }
        }
    });
}