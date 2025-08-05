import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao } from './ui.js';

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
        // Ponderação forte: cada participação reduz a chance para 20% da anterior.
        return Math.pow(0.2, count); 
    });
    
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    if (somaPesos === 0) { // Evita divisão por zero se todos os pesos forem 0
        // Se não houver pesos, seleciona aleatoriamente sem ponderação
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
        
        // Remove o peso e normaliza novamente para a próxima seleção
        pesosTemp.splice(indiceSorteado, 1);
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}

// =================== FUNÇÃO DE ANÁLISE ATUALIZADA (PRIORIDADE 1) ===================
/**
 * Analisa a concentração de participações para os turnos de Culto e diagnostica a disponibilidade de cada membro.
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

        todosMembros.forEach(membro => {
            // Diagnostica o status do membro para este turno específico
            let status = { type: 'disponivel' };
            
            // Verifica suspensão na categoria "cultos"
            if (membro.suspensao.cultos) {
                status = { type: 'suspenso' };
            } 
            // Verifica restrição permanente para o dia da semana do turno
            else if (todasRestricoesPerm.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
            }
            // A restrição temporária é verificada por dia, então não entra como um status fixo do turno.

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
            membrosDoTurno: membrosDoTurno.sort((a, b) => b.participacoes - a.participacoes)
        };
    });
    return analise;
}
// =======================================================================================


/**
 * Configura o listener do formulário de geração de escala.
 */
export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        // Limpa resultados e relatórios anteriores
        const resultadoContainer = document.getElementById('resultadoEscala');
        resultadoContainer.innerHTML = '';
        resultadoContainer.classList.remove('escala-container'); // Remove a classe de grid
        document.getElementById('balanceIndexContainer').style.display = 'none';
        document.getElementById('balanceIndexContainer').onclick = null; // Limpa listener antigo

        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        // Estrutura para calcular o índice de equilíbrio
        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = { participations: 0 };
        });

        const dias = [];
        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);

        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            const diaSemana = d.getDay(); // 0=Dom, 1=Seg, ..., 3=Qua, 6=Sab
            if (gerarCultos) {
                if (diaSemana === 3) dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
                if (diaSemana === 0) {
                    dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                    dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
                }
            }
            if (gerarSabado && diaSemana === 6) dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
            if (gerarOração) dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
        }

        // --- Lógica principal de geração da escala ---
        dias.forEach(dia => {
            let membrosDisponiveis = membros.filter(m => {
                let isSuspended = false;
                if (dia.tipo === 'Quarta' || dia.tipo.startsWith('Domingo')) isSuspended = m.suspensao.cultos;
                else if (dia.tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (dia.tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;

                // Normaliza datas para comparação (ignora a hora)
                const diaAtual = new Date(dia.data);
                diaAtual.setHours(0, 0, 0, 0);

                const restricaoTemp = restricoes.some(r => {
                    const rInicio = new Date(r.inicio);
                    rInicio.setHours(0, 0, 0, 0);
                    const rFim = new Date(r.fim);
                    rFim.setHours(0, 0, 0, 0);
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
                } else { // Lógica para duplas (casal ou mesmo gênero)
                    const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, justificationData)[0];
                    if (primeiro) {
                        const membrosCompatíveis = membrosDisponiveis.filter(m => 
                            m.nome !== primeiro.nome && 
                            (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
                        );
                        // Se houver membros compatíveis, seleciona o segundo entre eles. Senão, seleciona qualquer um.
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
        exibirIndiceEquilibrio(justificationData);
        
        // A análise detalhada só é relevante e será ativada para a escala de Cultos
        if (gerarCultos) {
            const relatorioConcentracao = analisarConcentracao(dias, membros, restricoes, restricoesPermanentes);
            const balanceContainer = document.getElementById('balanceIndexContainer');
            if (balanceContainer) {
                // Adiciona o evento de clique para abrir o modal de análise
                balanceContainer.onclick = () => renderAnaliseConcentracao(relatorioConcentracao);
            }
        }
    });
}
