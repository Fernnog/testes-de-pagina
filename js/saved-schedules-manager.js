// js/saved-schedules-manager.js

// Importa as funções e variáveis necessárias de outros módulos.
// O 'data-manager' lida com os dados (salvar, carregar, etc.).
// O 'ui' lida com a interface (mostrar notificações, abrir modais, renderizar cards).
import { salvarDados, adicionarEscalaSalva, excluirEscalaSalva, atualizarNomeEscalaSalva, escalasSalvas } from './data-manager.js';
import { showToast, atualizarTodasAsListas, abrirModalAcaoEscala, renderEscalaEmCards, configurarDragAndDrop, escalaAtual } from './ui.js';

/**
 * Função auxiliar para fechar o modal de ações da escala.
 */
function fecharModal() {
    const modal = document.getElementById('escalaActionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Função auxiliar para atualizar o indicador de escala carregada.
 * @param {string|null} nomeEscala - O nome da escala para exibir, ou null para esconder.
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
 * Esta é a função principal do módulo.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do banco de dados do Firebase.
 */
export function setupSavedSchedulesListeners(auth, database) {
    const btnSalvarEscala = document.getElementById('btn-salvar-escala');
    const listaEscalasSalvas = document.getElementById('listaEscalasSalvas');
    const btnConfirmarAcao = document.getElementById('btn-confirmar-escala-acao');
    const btnCancelarAcao = document.getElementById('btn-cancelar-escala-acao');
    const btnClearLoadedSchedule = document.getElementById('btn-clear-loaded-schedule'); // Botão para limpar a escala

    // 1. Listener para o botão "Salvar Escala Atual"
    // Abre o modal para o usuário inserir o nome da escala.
    if (btnSalvarEscala) {
        btnSalvarEscala.addEventListener('click', () => {
            if (escalaAtual.length === 0) {
                showToast('Não há uma escala na tela para salvar.', 'warning');
                return;
            }
            abrirModalAcaoEscala('save');
        });
    }

    // 2. Listener delegado para a lista de escalas salvas
    // Gerencia os cliques nos botões "Carregar", "Renomear" e "Excluir".
    if (listaEscalasSalvas) {
        listaEscalasSalvas.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return; // Ignora cliques que não são nos botões de ação

            const action = button.dataset.action;
            const escalaId = button.closest('li').dataset.id;
            const escala = escalasSalvas.find(e => e.id === escalaId);

            if (!escala) return;

            if (action === 'load') {
                // Ação de carregar é imediata, não precisa de modal.
                renderEscalaEmCards(escala.dias);
                // Reinicia os dados de justificação e restrições ao carregar uma escala salva
                configurarDragAndDrop(escala.dias, {}, [], []);
                showToast(`Escala "${escala.nome}" carregada.`, 'success');
                // PRIORIDADE 2: Rola a página até a escala para feedback imediato
                document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });
                // PRIORIDADE 3: Exibe o indicador com o nome da escala carregada
                _updateLoadedScheduleIndicator(escala.nome);
            } else if (action === 'rename' || action === 'delete') {
                // Ações de renomear e excluir abrem o modal para confirmação/input.
                abrirModalAcaoEscala(action, escala.id, escala.nome);
            }
        });
    }

    // 3. Listener para o botão de confirmação DENTRO do modal
    // Executa a ação (salvar, renomear ou excluir) com base nos dados do modal.
    if (btnConfirmarAcao) {
        btnConfirmarAcao.addEventListener('click', () => {
            const action = document.getElementById('escalaModalAction').value;
            const escalaId = document.getElementById('escalaModalId').value;

            if (action === 'save' || action === 'rename') {
                const nomeInput = document.getElementById('escalaModalInputName');
                const nome = nomeInput ? nomeInput.value.trim() : '';

                if (!nome) {
                    showToast('O nome da escala não pode estar vazio.', 'error');
                    return;
                }

                if (action === 'save') {
                    const novaEscala = { id: `escala_${Date.now()}`, nome, dias: escalaAtual };
                    adicionarEscalaSalva(novaEscala);
                } else {
                    atualizarNomeEscalaSalva(escalaId, nome);
                }
            } else if (action === 'delete') {
                excluirEscalaSalva(escalaId);
            }

            // Após qualquer modificação, salva no Firebase e atualiza a UI.
            salvarDados(auth, database).then(() => {
                atualizarTodasAsListas();
                fecharModal();
                showToast('Ação concluída com sucesso!', 'success');
            });
        });
    }

    // 4. Listener para o botão de cancelar DENTRO do modal
    if (btnCancelarAcao) {
        btnCancelarAcao.addEventListener('click', fecharModal);
    }
    
    // 5. PRIORIDADE 3: Listener para o botão de limpar a escala carregada
    if (btnClearLoadedSchedule) {
        btnClearLoadedSchedule.addEventListener('click', () => {
            // Limpa o container de cards e reseta o array de escalaAtual
            document.getElementById('resultadoEscala').innerHTML = '';
            escalaAtual.length = 0; // Limpa o array 'escalaAtual' exportado de ui.js
            
            // Esconde os elementos de análise e filtros que dependem da escala
            document.getElementById('balanceIndexContainer').style.display = 'none';
            document.getElementById('escala-filtros').innerHTML = '';
            document.getElementById('diagnosticReportContainer').style.display = 'none';
            
            // Esconde o indicador de escala carregada
            _updateLoadedScheduleIndicator(null);
            
            showToast('Escala removida da tela.', 'info');
        });
    }
}
