// js/saved-schedules-manager.js (Versão Simplificada Pós-Correção)

import { salvarDados, adicionarEscalaSalva, excluirEscalaSalva, atualizarNomeEscalaSalva, escalasSalvas, membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { showToast, atualizarTodasAsListas, abrirModalAcaoEscala, renderEscalaEmCards, configurarDragAndDrop, escalaAtual, exibirIndiceEquilibrio } from './ui.js';

/**
 * Fecha o modal de ações da escala (Salvar, Renomear, Excluir).
 */
function fecharModal() {
    const modal = document.getElementById('escalaActionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Atualiza o indicador visual que mostra qual escala salva está sendo visualizada.
 * @param {string|null} nomeEscala - O nome da escala para exibir, ou null para esconder o indicador.
 */
function _updateLoadedScheduleIndicator(nomeEscala) {
    const indicator = document.getElementById('loaded-schedule-indicator');
    const nameSpan = document.getElementById('loaded-schedule-name');
    if (indicator && nameSpan) {
        if (nomeEscala) {
            nameSpan.textContent = nomeEscala;
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    }
}

/**
 * Configura todos os event listeners relacionados ao gerenciamento de escalas salvas.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do banco de dados do Firebase.
 */
export function setupSavedSchedulesListeners(auth, database) {
    const btnSalvarEscala = document.getElementById('btn-salvar-escala');
    const listaEscalasSalvas = document.getElementById('listaEscalasSalvas');
    const btnConfirmarAcao = document.getElementById('btn-confirmar-escala-acao');
    const btnCancelarAcao = document.getElementById('btn-cancelar-escala-acao');
    const btnClearLoadedSchedule = document.getElementById('btn-clear-loaded-schedule');

    // Listener para o botão "Salvar Escala Atual"
    if (btnSalvarEscala) {
        btnSalvarEscala.addEventListener('click', () => {
            if (escalaAtual.length === 0) {
                showToast('Não há uma escala na tela para salvar.', 'warning');
                return;
            }
            abrirModalAcaoEscala('save');
        });
    }

    // Listener delegado para a lista de escalas salvas (Carregar, Renomear, Excluir)
    if (listaEscalasSalvas) {
        listaEscalasSalvas.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const escalaId = button.closest('li').dataset.id;
            const escala = escalasSalvas.find(e => e.id === escalaId);

            if (!escala) return;

            if (action === 'load') {
                // ======================================================================
                // === CÓDIGO DE CARREGAMENTO SIMPLIFICADO ===
                // ======================================================================
                // A validação de data agora acontece no data-manager.js
                const diasComDatasValidas = escala.dias;

                if (!diasComDatasValidas || diasComDatasValidas.length === 0) {
                    showToast(`Erro: A escala "${escala.nome}" não contém dados de dias válidos.`, 'error');
                    return;
                }
                
                // Recalcula os dados de análise (Índice de Equilíbrio)
                const justificationDataRecalculado = {};
                membros.forEach(m => {
                    justificationDataRecalculado[m.nome] = { participations: 0 };
                });
                diasComDatasValidas.forEach(dia => {
                    dia.selecionados.forEach(membro => {
                        if (justificationDataRecalculado[membro.nome]) {
                            justificationDataRecalculado[membro.nome].participations++;
                        }
                    });
                });

                // Renderiza a interface com os dados já validados
                renderEscalaEmCards(diasComDatasValidas);
                configurarDragAndDrop(diasComDatasValidas, justificationDataRecalculado, restricoes, restricoesPermanentes);
                exibirIndiceEquilibrio(justificationDataRecalculado);

                showToast(`Escala "${escala.nome}" carregada com sucesso.`, 'success');
                document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });
                _updateLoadedScheduleIndicator(escala.nome);
                // ======================================================================
                // === FIM DO CÓDIGO SIMPLIFICADO ===
                // ======================================================================

            } else if (action === 'rename' || action === 'delete') {
                abrirModalAcaoEscala(action, escala.id, escala.nome);
            }
        });
    }

    // Listener para o botão de confirmação DENTRO do modal
    if (btnConfirmarAcao) {
        btnConfirmarAcao.addEventListener('click', () => {
            const action = document.getElementById('escalaModalAction').value;
            const escalaId = document.getElementById('escalaModalId').value;
            const nomeInput = document.getElementById('escalaModalInputName');
            const nome = nomeInput ? nomeInput.value.trim() : '';

            if ((action === 'save' || action === 'rename') && !nome) {
                showToast('O nome da escala não pode estar vazio.', 'error');
                return;
            }

            if (action === 'save') {
                const novaEscala = { id: `escala_${Date.now()}`, nome, dias: escalaAtual };
                adicionarEscalaSalva(novaEscala);
            } else if (action === 'rename') {
                atualizarNomeEscalaSalva(escalaId, nome);
            } else if (action === 'delete') {
                excluirEscalaSalva(escalaId);
            }

            salvarDados(auth, database).then(() => {
                atualizarTodasAsListas();
                fecharModal();
                showToast('Ação concluída com sucesso!', 'success');
            });
        });
    }

    // Listener para o botão de cancelar DENTRO do modal
    if (btnCancelarAcao) {
        btnCancelarAcao.addEventListener('click', fecharModal);
    }
    
    // Listener para o botão de limpar a escala carregada (botão '×' no banner)
    if (btnClearLoadedSchedule) {
        btnClearLoadedSchedule.addEventListener('click', () => {
            document.getElementById('resultadoEscala').innerHTML = '';
            escalaAtual.length = 0; 
            document.getElementById('balanceIndexContainer').style.display = 'none';
            document.getElementById('escala-filtros').innerHTML = '';
            document.getElementById('diagnosticReportContainer').style.display = 'none';
            _updateLoadedScheduleIndicator(null);
            showToast('Visualização da escala limpa.', 'info');
        });
    }
}