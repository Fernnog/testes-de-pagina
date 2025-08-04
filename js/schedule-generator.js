import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
// MODIFICADO: Importa as novas funções de UI
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao } from './ui.js';

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

// --- Novas Funções de Análise e Geração ---

/**
 * Analisa a concentração de participações para os turnos de Culto.
 * @param {Array} diasGerados - Array com a escala final gerada.
 * @param {Array} todosMembros - Array completo de membros cadastrados.
 * @param {Array} todasRestricoesPerm - Array completo de restrições permanentes.
 * @returns {Object} - Um objeto com a análise detalhada por turno.
 */
function analisarConcentracao(diasGerados, todosMembros, todasRestricoesPerm) {
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
        const membrosComRestricao = todasRestricoesPerm
            .filter(r => r.diaSemana === turno)
            .map(r => r.membro);
            
        const membrosDisponiveis = todosMembros
            .filter(m => !membrosComRestricao.includes(m.nome))
            .map(m => ({ nome: m.nome, participacoes: 0 }));

        diasGerados.forEach(dia => {
            if (dia.tipo === turno) {
                dia.selecionados.forEach(selecionado => {
                    const membro = membrosDisponiveis.find(m => m.nome === selecionado.nome);
                    if (membro) membro.participacoes++;
                });
            }
        });

        analise[turno] = {
            totalMembros: todosMembros.length,
            comRestricaoPermanente: membrosComRestricao,
            disponiveis: membrosDisponiveis.sort((a,b) => b.participacoes - a.participacoes)
        };
    });
    return analise;
}

/**
 * Configura o listener do formulário de geração de escala, agora com a nova lógica.
 */
export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        // Limpa relatórios e resultados anteriores
        document.getElementById('resultadoEscala').innerHTML = '';
        document.getElementById('balanceIndexContainer').style.display = 'none';
        document.getElementById('balanceIndexContainer').onclick = null; // Limpa listener antigo

        // MODIFICADO: Pega o tipo de escala do radio button
        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = { participations: 0, availableDays: 0, reasonForAbsence: null };
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

        // --- Lógica principal de geração da escala (SEM GRANDES ALTERAÇÕES) ---
        dias.forEach(dia => {
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
                    selecionados.forEach(m => { justificationData[m.nome].participations++; });
                }
            }
        });

        // --- Renderização e Análise Final (MODIFICADO) ---
        renderEscalaEmCards(dias);
        exibirIndiceEquilibrio(justificationData);
        
        // A análise detalhada só é relevante e será ativada para a escala de Cultos
        if (gerarCultos) {
            const relatorioConcentracao = analisarConcentracao(dias, membros, restricoesPermanentes);
            const balanceContainer = document.getElementById('balanceIndexContainer');
            if (balanceContainer) {
                balanceContainer.onclick = () => renderAnaliseConcentracao(relatorioConcentracao);
            }
        }
    });
}
