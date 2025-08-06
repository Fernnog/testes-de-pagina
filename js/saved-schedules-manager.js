// js/saved-schedules-manager.js
// VERSÃO ATUALIZADA: Renderiza filtros e análises ao carregar uma escala salva.

// Importa as funções e variáveis necessárias de outros módulos.
import {
    salvarDados,
    adicionarEscalaSalva,
    excluirEscalaSalva,
    atualizarNomeEscalaSalva,
    escalasSalvas,
    membros, // Importado para cálculo de participações
    restricoes, // Importado para o Drag & Drop
    restricoesPermanentes // Importado para o Drag & Drop
} from './data-manager.js';
import {
    showToast,
    atualizarTodasAsListas,
    abrirModalAcaoEscala,
    renderEscalaEmCards,
    configurarDragAndDrop,
    escalaAtual,
    renderizarFiltros, // Nova importação
    exibirIndiceEquilibrio, // Nova importação
    renderAnaliseConcentracao // Nova importação
} from './ui.js';

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

    // 1. Listener para o botão "Salvar Escala Atual"
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
    if (listaEscalasSalvas) {
        listaEscalasSalvas.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const escalaId = button.closest('li').dataset.id;
            const escala = escalasSalvas.find(e => e.id === escalaId);

            if (!escala) return;

            if (action === 'load') {
                // Renderiza os cards da escala na tela
                renderEscalaEmCards(escala.dias);

                // --- INÍCIO DA LÓGICA ADICIONADA (PRIORIDADE 1) ---
                
                // Recalcula as participações com base na escala carregada
                const participacoesCarregadas = {};
                membros.forEach(m => { participacoesCarregadas[m.nome] = { participations: 0 }; });
                escala.dias.forEach(dia => {
                    dia.selecionados.forEach(membro => {
                        // Garante que o membro ainda existe antes de incrementar
                        if (participacoesCarregadas[membro.nome]) {
                            participacoesCarregadas[membro.nome].participations++;
                        }
                    });
                });

                // Renderiza os componentes da UI que dependem dos dados da escala
                renderizarFiltros(escala.dias);
                exibirIndiceEquilibrio(participacoesCarregadas);
                renderAnaliseConcentracao('all');
                
                // Configura o Drag & Drop com os dados corretos da escala carregada
                configurarDragAndDrop(escala.dias, participacoesCarregadas, restricoes, restricoesPermanentes);

                // --- FIM DA LÓGICA ADICIONADA ---

                showToast(`Escala "${escala.nome}" carregada.`, 'success');
                document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });

            } else if (action === 'rename' || action === 'delete') {
                abrirModalAcaoEscala(action, escala.id, escala.nome);
            }
        });
    }

    // 3. Listener para o botão de confirmação DENTRO do modal
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
}
