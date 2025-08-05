// ===================================================================================
// ARQUIVO: js/data-manager.js
// FUNÇÃO: Gerencia o estado da aplicação (membros, restrições) e sua
// persistência no Firebase.
// ===================================================================================

// MELHORIA (Prioridade 2): Importa a função de feedback visual da UI.
// Isso permite que este módulo notifique o usuário sobre o status das operações
// de salvamento, melhorando a experiência do usuário (UX).
import { showToast } from './ui.js';

// --- ESTADO DA APLICAÇÃO ---
// Estes arrays são a "fonte da verdade" para os dados da aplicação
// enquanto ela está em execução.
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];

// --- FUNÇÕES DE MANIPULAÇÃO DO ESTADO LOCAL (CRUD) ---
// Seção inalterada: Estas funções manipulam os arrays de dados na memória.
// São a base para todas as operações de cadastro e exclusão.

export function adicionarMembro(membro) {
    membros.push(membro);
}

export function excluirMembro(index) {
    membros.splice(index, 1);
}

export function adicionarRestricao(restricao) {
    restricoes.push(restricao);
}

export function excluirRestricao(index) {
    restricoes.splice(index, 1);
}

export function adicionarRestricaoPermanente(restricao) {
    restricoesPermanentes.push(restricao);
}

export function excluirRestricaoPermanente(index) {
    restricoesPermanentes.splice(index, 1);
}

// Esta função é mantida, pois é usada pela lógica de `carregarDados` quando um
// novo usuário não possui dados, e pelo botão "Limpar Dados".
export function limparDadosGlobais() {
    membros = [];
    restricoes = [];
    restricoesPermanentes = [];
}


// --- FUNÇÕES DE PERSISTÊNCIA DE DADOS (Firebase) ---

/**
 * Salva o estado atual dos dados da aplicação no Firebase.
 * MODIFICADO: Esta função agora integra o feedback visual (toast)
 * para informar o usuário sobre o sucesso ou falha da operação.
 * Esta mudança atende à Prioridade 2 (Quick Win).
 *
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do Realtime Database.
 * @returns {Promise} Uma promessa que é resolvida no sucesso ou rejeitada no erro.
 */
export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) {
        // Se o usuário não está logado, não há onde salvar.
        // Retorna uma promessa resolvida para não quebrar a cadeia de chamadas .then().
        return Promise.resolve();
    }
    const uid = user.uid;

    // A promessa retornada pelo `set` será usada para acionar os toasts.
    return database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes
    })
    .then(() => {
        // Sucesso: notifica o usuário.
        showToast('Dados salvos com sucesso!', 'success');
    })
    .catch((error) => {
        // Erro: notifica o usuário com uma mensagem clara.
        console.error('Erro ao salvar dados: ', error);
        showToast(`Erro ao salvar dados: ${error.message}`, 'error');
        // É importante rejeitar a promessa para que o chamador saiba que houve uma falha.
        return Promise.reject(error);
    });
}

/**
 * Carrega os dados do usuário logado a partir do Firebase.
 * INALTERADO: A lógica de carregamento e migração de dados para a suspensão granular
 * permanece a mesma, pois é robusta e funcional.
 *
 * @param {firebase.auth.Auth} auth - A instância de autenticação.
 * @param {firebase.database.Database} database - A instância do database.
 * @param {Function} onDataLoaded - Callback a ser executado após os dados serem carregados.
 */
export function carregarDados(auth, database, onDataLoaded) {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const dados = snapshot.val();
                
                // Lógica de migração para suportar suspensão granular
                membros = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = {
                            cultos: isSuspendedOld,
                            sabado: isSuspendedOld,
                            whatsapp: isSuspendedOld
                        };
                    }
                    return m;
                });

                restricoes = dados.restricoes || [];
                restricoesPermanentes = dados.restricoesPermanentes || [];
            } else {
                // Se não existem dados para o usuário, limpa o estado local
                limparDadosGlobais();
            }
            // Notifica o resto da aplicação que os dados estão prontos para uso
            onDataLoaded();
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            // Chama o callback mesmo em caso de erro para a UI não ficar travada
            onDataLoaded();
        });
}

// As funções 'exportarDados' e 'importarDados' que existiam anteriormente
// foram removidas conforme a solicitação de refatoração, para eliminar
// funcionalidades obsoletas e simplificar o código.
